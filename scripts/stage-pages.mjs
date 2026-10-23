/** Assemble the explicitly requested public demo; never changes expert approval. */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const destination = '.local/pages';
const base = '/cardio-simulator/';
const repository = 'https://github.com/Carraway-and-Gatsby/cardio-simulator';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const asset = readJson('assets/manifest.json').assets.find(item => item.id === 'heart-hra-male-v1');
if (!asset || asset.license !== 'CC-BY-4.0' || asset.anatomyReview !== 'unreviewed') {
  throw new Error('This demo is scoped to the unreviewed CC BY HRA subset. Reassess publication policy if it changes.');
}
if (!existsSync('dist/index.html')) throw new Error('Build the Pages base path before staging.');
if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) throw new Error('Refusing a linked Pages staging directory.');
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });

function write(path, content) {
  const target = join(destination, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
function copy(source, path = source) {
  if (!lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) throw new Error(`Expected a regular file: ${source}`);
  const target = join(destination, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = join(path, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Links cannot enter the Pages artifact: ${file}`);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

copy('dist/index.html', 'index.html');
for (const path of walk('dist/assets')) {
  if (!/\.(?:js|css)$/.test(path)) throw new Error(`Review unexpected build output before publishing: ${path}`);
  copy(path, path.slice('dist/'.length));
}
// Vite copies every public file into dist. Select the HRA asset explicitly so the
// internal procedural and schematic models never enter the uploaded artifact.
copy('dist/models/heart-hra.glb', 'models/heart-hra.glb');
if (hash(readFileSync(join(destination, 'models/heart-hra.glb'))) !== asset.sha256) throw new Error('Built HRA model differs from the current integrity manifest.');
copy('LICENSE');
for (const path of ['THIRD_PARTY_NOTICES.md', 'docs/public-source-release.md', 'assets/licenses/heart-hra.md']) {
  const markdown = readFileSync(path, 'utf8').replace(/\]\(([^)]+)\)/g, (match, link) => {
    if (/^(?:https?:|#)/.test(link)) return match;
    const sourcePath = posix.normalize(posix.join(posix.dirname(path), link));
    return `](${repository}/blob/${commit}/${sourcePath})`;
  });
  write(path, markdown);
}
copy('assets/sources/heart-hra.json', 'provenance/heart-hra.source.json');
copy('src/data/heart-hra.json', 'provenance/heart-hra.structures.json');
copy(asset.geometryReport, 'provenance/heart-hra.geometry.json');
write('provenance/heart-hra.asset.json', JSON.stringify(asset, null, 2) + '\n');

// Vite reports only dependencies actually included in the application bundle.
// Fail on missing license text instead of silently publishing incomplete notices.
const supplements = readJson('scripts/pages-dependency-licenses.json');
const licenses = readJson('dist/licenses/dependencies.json').map(entry => {
  if (entry.text?.trim()) return entry;
  const supplement = supplements[`${entry.name}@${entry.version}`];
  if (!supplement || supplement.identifier !== entry.identifier || !supplement.text?.trim()) {
    throw new Error(`Preserve the upstream license text before publishing ${entry.name}@${entry.version}.`);
  }
  if (hash(supplement.text) !== supplement.sha256) throw new Error(`Supplemental license evidence changed: ${entry.name}.`);
  return { ...entry, ...supplement };
});
write('licenses/dependencies.json', JSON.stringify(licenses, null, 2) + '\n');
write('licenses/dependencies.md', '# Bundled dependency licenses\n\n' + licenses.map(entry =>
  `## ${entry.name} ${entry.version} (${entry.identifier})\n\n${entry.source ? `Source: ${entry.source}\n\n` : ''}${entry.text}\n`
).join('\n'));
write('.nojekyll', '');

const files = walk(destination).map(path => ({
  path: path.slice(destination.length + 1),
  bytes: lstatSync(path).size,
  sha256: hash(readFileSync(path)),
}));
write('demo-manifest.json', JSON.stringify({
  schemaVersion: 1,
  publication: 'public-unreviewed-educational-demo',
  policy: 'docs/public-source-release.md',
  repository,
  commit,
  base,
  model: { id: asset.id, path: 'models/heart-hra.glb', sha256: asset.sha256, license: asset.license, anatomyReview: asset.anatomyReview },
  expertReleaseApproved: false,
  limitations: 'Educational illustration only. Anatomical accuracy and physiology are not clinically validated. Motion, valve leaflets and flow guides are illustrative project additions.',
  files,
}, null, 2) + '\n');
console.log(`Staged ${files.length + 1} public demo files in ${destination}; only the CC BY HRA model is included. Expert approval remains pending.`);
