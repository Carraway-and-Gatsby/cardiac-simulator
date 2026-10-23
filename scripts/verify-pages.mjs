/** Public-demo artifact integrity, independent of the still-failing expert gate. */
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const directory = '.local/pages';
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = readJson(join(directory, 'demo-manifest.json'));
const source = readJson('assets/sources/heart-hra.json');
const asset = readJson('assets/manifest.json').assets.find(item => item.id === source.id);
assert.equal(manifest.publication, 'public-unreviewed-educational-demo');
assert.equal(manifest.expertReleaseApproved, false);
assert.equal(manifest.model.id, 'heart-hra-male-v1');
assert.equal(manifest.model.anatomyReview, 'unreviewed');
assert.equal(manifest.model.license, 'CC-BY-4.0');
assert.equal(manifest.model.sha256, asset.sha256);
assert.equal(manifest.base, '/cardio-simulator/');
assert.match(manifest.commit, /^[0-9a-f]{40}$/);

const allowed = /^(?:index\.html|\.nojekyll|LICENSE|THIRD_PARTY_NOTICES\.md|demo-manifest\.json|docs\/public-source-release\.md|assets\/licenses\/heart-hra\.md|assets\/[^/]+\.(?:js|css)|models\/heart-hra\.glb|licenses\/dependencies\.(?:json|md)|provenance\/heart-hra\.(?:source|structures|geometry|asset)\.json)$/;
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const file = join(path, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Symbolic link in artifact: ${file}`);
    return entry.isDirectory() ? walk(file) : [file.slice(directory.length + 1)];
  }).sort();
}
const files = walk(directory);
for (const file of files) assert.match(file, allowed, `Unexpected public file: ${file}`);
assert.deepEqual(files, [...manifest.files.map(file => file.path), 'demo-manifest.json'].sort(), 'Artifact file inventory differs.');
assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length, 'Duplicate artifact file records.');
for (const file of manifest.files) {
  const bytes = readFileSync(join(directory, file.path));
  assert.equal(bytes.length, file.bytes, `Size differs: ${file.path}`);
  assert.equal(hash(bytes), file.sha256, `Checksum differs: ${file.path}`);
  assert.equal(lstatSync(join(directory, file.path)).nlink, 1, `Hard link in artifact: ${file.path}`);
}
for (const required of ['index.html', '.nojekyll', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/public-source-release.md', 'assets/licenses/heart-hra.md', 'models/heart-hra.glb', 'licenses/dependencies.json', 'licenses/dependencies.md']) {
  assert.ok(files.includes(required), `Required notice or artifact missing: ${required}`);
}
const html = readFileSync(join(directory, 'index.html'), 'utf8');
assert.match(html, /<html\s+lang="en"/);
const entryAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(path => path.includes('/assets/'));
assert.ok(entryAssets.length >= 2, 'Missing JavaScript/CSS entrypoints.');
for (const path of entryAssets) {
  assert.ok(path.startsWith(manifest.base + 'assets/'), `Entrypoint does not use the Pages project base: ${path}`);
  assert.ok(files.includes(path.slice(manifest.base.length)), `Missing entrypoint: ${path}`);
}
assert.ok(files.some(path => /^assets\/simulation\.worker-.+\.js$/.test(path)), 'Simulation Worker was not bundled.');
const scripts = files.filter(path => path.endsWith('.js')).map(path => readFileSync(join(directory, path), 'utf8')).join('\n');
assert.ok(scripts.includes(asset.sha256), 'Application cache key does not match the published HRA model.');
assert.ok(scripts.includes('models/heart-hra.glb'), 'Application does not refer to the HRA model.');
const glb = readFileSync(join(directory, manifest.model.path));
assert.equal(hash(glb), asset.sha256);
assert.equal(glb.toString('ascii', 0, 4), 'glTF');
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
assert.ok(!(gltf.buffers ?? []).some(buffer => buffer.uri));
assert.ok(!(gltf.images ?? []).some(image => image.uri));
const structures = readJson(join(directory, 'provenance/heart-hra.structures.json'));
assert.equal(structures.structures.length, 44);
assert.deepEqual(gltf.nodes.filter(node => node.mesh !== undefined).map(node => node.extras.structure_id).sort(), structures.structures.map(item => item.id).sort());
assert.deepEqual(readJson(join(directory, 'provenance/heart-hra.source.json')), source);
assert.deepEqual(readJson(join(directory, 'provenance/heart-hra.asset.json')), asset);
const geometry = readJson(join(directory, 'provenance/heart-hra.geometry.json'));
assert.equal(geometry.sha256, asset.sha256);
assert.equal(geometry.anatomyReview, 'unreviewed');
const licenses = readJson(join(directory, 'licenses/dependencies.json'));
assert.ok(licenses.length > 0);
for (const license of licenses) assert.ok(license.name && license.version && license.identifier && license.text?.trim(), 'Bundled dependency license evidence incomplete.');
assert.match(readFileSync(join(directory, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /creativecommons\.org\/licenses\/by\/4\.0/);
console.log(`PASS: ${files.length} Pages files, project-base entrypoints, bundled Worker, 44 HRA structures, source hashes and complete bundled dependency license texts. This is an unreviewed demo, not expert release approval.`);
