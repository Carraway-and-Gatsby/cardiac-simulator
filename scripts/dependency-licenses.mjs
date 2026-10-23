import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const lock = JSON.parse(readFileSync('package-lock.json','utf8'));
const packages = Object.entries(lock.packages).filter(([path])=>path).map(([path, entry])=>{
  let metadata;
  try { metadata = JSON.parse(readFileSync(`${path}/package.json`,'utf8')); } catch { metadata = entry; }
  let license = metadata.license ?? entry.license ?? 'UNKNOWN';
  const evidence = `${path}/LICENSE`;
  if (license === 'UNKNOWN' && existsSync(evidence) && readFileSync(evidence,'utf8').startsWith('MIT License')) license = 'MIT';
  return {name:metadata.name ?? path.split('node_modules/').at(-1),version:entry.version,license,developmentOnly:!!entry.dev,installed:existsSync(`${path}/package.json`),packagePath:path,licenseEvidence:existsSync(evidence)?evidence:'package metadata; review package contents before redistribution'};
});
writeFileSync('docs/dependency-licenses.json',JSON.stringify({basis:'package-lock.json includes optional platform packages; installed metadata and LICENSE files used when available; not legal approval or a complete bundled-asset audit',packages},null,2)+'\n');
const unknown = packages.filter(p=>p.license==='UNKNOWN');
console.log(`Recorded ${packages.length} package licenses; ${unknown.length} unknown.`);
if (unknown.length) console.log(unknown.map(p=>p.name).join('\n'));
