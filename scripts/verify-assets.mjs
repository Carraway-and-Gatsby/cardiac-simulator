import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const manifest = JSON.parse(readFileSync('assets/manifest.json', 'utf8'));
const release = process.argv.includes('--release');
const errors = [];
const declared = new Set();
function localPath(value) {
  if (typeof value !== 'string' || !value) return null;
  const path = resolve(root, value);
  return path.startsWith(root + sep) ? path : null;
}
for (const asset of manifest.assets) {
  if (declared.has(asset.file)) errors.push(`Duplicate: ${asset.file}`);
  declared.add(asset.file);
  for (const key of ['id','source','creator','license','limitations']) if (!asset[key]) errors.push(`${asset.id}: missing ${key}`);
  const path = localPath(asset.file);
  const evidence = localPath(asset.licenseEvidence);
  if (!evidence || !existsSync(evidence) || !readFileSync(evidence, 'utf8').trim()) errors.push(`${asset.id}: license evidence missing`);
  if (!path || !existsSync(path)) { errors.push(`${asset.id}: asset missing; run npm run blender:build`); continue; }
  const bytes = readFileSync(path);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) errors.push(`${asset.id}: checksum mismatch`);
  if (path.endsWith('.glb')) {
    const validHeader = bytes.length >= 20 && bytes.toString('ascii',0,4) === 'glTF' && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length;
    if (!validHeader) { errors.push(`${asset.id}: invalid GLB header`); continue; }
    if (asset.structureSpec) {
      try {
        const specPath = localPath(asset.structureSpec);
        if (!specPath) throw new Error('invalid structure specification path');
        const spec = JSON.parse(readFileSync(specPath, 'utf8'));
        const length = bytes.readUInt32LE(12);
        if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + length > bytes.length) throw new Error('invalid GLB JSON chunk');
        const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length));
        const nodes = (gltf.nodes ?? []).filter(node => node.mesh !== undefined);
        const ids = nodes.map(node => node.extras?.structure_id).sort();
        const expected = spec.structures.map(item => item.id).sort();
        if (new Set(expected).size !== expected.length) throw new Error('duplicate structure specification IDs');
        const actualIds = asset.allowMultipleMeshesPerStructure ? [...new Set(ids)].sort() : ids;
        if (JSON.stringify(actualIds) !== JSON.stringify(expected)) throw new Error('structure IDs do not match the specification');
        if (nodes.some(node => node.extras?.anatomy_status !== spec.status)) throw new Error('missing unreviewed model status');
        if ((gltf.buffers ?? []).some(buffer => buffer.uri) || (gltf.images ?? []).some(image => image.uri)) throw new Error('model contains an external buffer or image URI');
        if (asset.sourceType === 'procedural' && ((gltf.images?.length ?? 0) || (gltf.textures?.length ?? 0) || (gltf.buffers ?? []).some(buffer => buffer.uri))) throw new Error('procedural model contains external or image assets');
        if (asset.sourceConfig) {
          const sourcePath = localPath(asset.sourceConfig);
          if (!sourcePath) throw new Error('invalid source configuration path');
          const sourceConfig = JSON.parse(readFileSync(sourcePath, 'utf8'));
          if (sourceConfig.id !== asset.id || spec.id !== asset.id) throw new Error('source/spec/manifest IDs differ');
          const sources = new Map(sourceConfig.sources.map(source => [source.key, source]));
          if (sources.size !== sourceConfig.sources.length) throw new Error('duplicate source keys');
          for (const source of sources.values()) {
            if (!/^[0-9a-f]{64}$/.test(source.sha256) || !source.url?.startsWith('https://') || !source.license || !source.licenseUrl) throw new Error('source pin/license evidence incomplete');
          }
          const structures = new Map(spec.structures.map(item => [item.id, item]));
          for (const node of nodes) {
            const metadata = node.extras;
            const item = structures.get(metadata.structure_id);
            const source = sources.get(item.sourceKey);
            if (!source || metadata.hra_source_key !== item.sourceKey || metadata.hra_source_node !== item.sourceNode || metadata.source_sha256 !== source.sha256) throw new Error('exported source mapping/pin differs from specification');
            if (metadata.units !== spec.units || metadata.motion !== 'static-source-geometry') throw new Error('source scale or static-motion metadata missing');
          }
          if (gltf.animations?.length) throw new Error('static source unexpectedly contains animation');
          const reportPath = localPath(asset.geometryReport);
          if (!reportPath) throw new Error('source geometry report missing');
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          if (report.id !== asset.id || report.sha256 !== asset.sha256) throw new Error('geometry report does not cover current asset');
          if (JSON.stringify(report.structures.map(item => item.id).sort()) !== JSON.stringify(expected)) throw new Error('geometry report coverage differs from structure specification');
          for (const item of report.structures) {
            for (const comparison of [item.importCorrespondence, item.exportCorrespondence]) {
              if (!comparison?.nonduplicateOrientedTrianglesPreserved || !Number.isFinite(comparison.maxCoordinateDeviationM) || comparison.maxCoordinateDeviationM > comparison.toleranceM || comparison.toleranceM > 1e-7) throw new Error('source geometry correspondence failed');
              const removed = comparison.duplicateIndexFacesRemoved;
              if (!Number.isInteger(removed) || removed < 0 || comparison.sourceTriangles - removed !== comparison.triangles) throw new Error('source triangle accounting failed');
              if (!comparison.orientedTrianglesPreserved && (removed !== comparison.sourceDuplicateIndexFaces || comparison.duplicateIndexRemoval.reduce((sum, record) => sum + record.removedCount, 0) !== removed)) throw new Error('unaccounted source triangle changes');
            }
          }
        }
      } catch (error) {
        errors.push(`${asset.id}: ${error.message}`);
      }
    }
  }
  if (release) {
    if (asset.licenseReview !== 'approved-for-distribution') errors.push(`${asset.id}: distribution license NOT approved`);
    if (asset.anatomyReview !== 'approved' || !asset.reviewer || !asset.reviewDate) errors.push(`${asset.id}: anatomy review NOT approved`);
    if (asset.reviewedSha256 !== asset.sha256) errors.push(`${asset.id}: review does not cover current asset hash`);
    const review = localPath(asset.reviewEvidence);
    if (!review || !existsSync(review) || !readFileSync(review,'utf8').trim()) errors.push(`${asset.id}: signed review evidence missing`);
  }
}
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, {withFileTypes:true})) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (!declared.has(relative(root,path).split(sep).join('/'))) errors.push(`Unregistered public model: ${path}`);
  }
}
walk('public/models');
if (!manifest.assets.length) errors.push('No registered assets');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS: ${manifest.assets.length} assets; ${release ? 'release metadata gate' : 'development integrity only; anatomy remains UNREVIEWED'}`);
