/** Integrity of the public source package. This is NOT anatomy/release approval. */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const errors = [];
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson('assets/manifest.json');
const source = readJson('assets/sources/heart-hra.json');
const anatomy = readJson('src/data/heart-hra.json');
const packageInfo = readJson('package.json');
for (const path of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.ko.md', 'docs/public-source-release.md']) {
  if (!existsSync(path) || !readFileSync(path, 'utf8').trim()) errors.push(`Missing public documentation: ${path}`);
}
if (packageInfo.license !== 'MIT') errors.push('Original source package must declare its MIT license.');
if (source.id !== anatomy.id || !manifest.assets.some(asset => asset.id === source.id)) errors.push('Source metadata IDs disagree.');
if (anatomy.structures.length !== 44 || new Set(anatomy.structures.map(item => item.id)).size !== 44) errors.push('Expected 44 unique atlas metadata structures.');
for (const asset of manifest.assets) {
  if (!/^[0-9a-f]{64}$/.test(asset.sha256)) errors.push(`${asset.id}: asset hash missing`);
  if (!asset.source || !asset.creator || !asset.license || !existsSync(asset.licenseEvidence)) errors.push(`${asset.id}: attribution/evidence missing`);
}
for (const asset of source.sources) {
  if (!/^[0-9a-f]{64}$/.test(asset.sha256) || !asset.url.startsWith('https://cdn.humanatlas.io/')) errors.push(`${asset.key}: source pin invalid`);
  if (asset.license !== 'CC-BY-4.0' || !asset.licenseUrl || !asset.creators?.length) errors.push(`${asset.key}: original asset license/credit missing`);
}
// Scan the actual publishable Git file set; ignored local assets remain on disk.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const privatePath = /^(?:\.local\/|\.codex\/|\.mcp\.json$|\.env(?:\.|$)|node_modules\/|dist\/|public\/models\/|blender\/generated\/)/;
const binaryAsset = /\.(?:glb|gltf|blend\d*|fbx|obj|stl|dcm|nii(?:\.gz)?)$/i;
const credential = /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
for (const file of new Set(files)) {
  if (privatePath.test(file) || binaryAsset.test(file)) { errors.push(`Private/local asset in public Git file set: ${file}`); continue; }
  if (!existsSync(file)) continue;
  const bytes = readFileSync(file);
  if (bytes.length > 5 * 1024 * 1024) errors.push(`Unexpected large public source file: ${file}`);
  if (credential.test(bytes.toString('utf8'))) errors.push(`Possible credential in ${file}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS: public source metadata, attribution and ${new Set(files).size} Git files; binary assets excluded. Anatomy and distribution approval remain separate.`);
