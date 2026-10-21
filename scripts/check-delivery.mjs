import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const limit = 8388608;
const excluded = new Set(['.git', '.github', '.imd', '.agents', '.codex', '.aws', 'test/scratch']);
async function inventory(directory = '.') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory === '.' ? entry.name : `${directory}/${entry.name}`;
    if (excluded.has(path) || entry.name === '.env' || entry.name.startsWith('.env.')) continue;
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${path}`);
    assert(entry.name !== 'node_modules' && entry.name !== '.npm' && !/\.(?:tgz|zip|deb)$/.test(entry.name), `Generated dependency/archive in delivery: ${path}`);
    if (entry.isDirectory()) files.push(...await inventory(path));
    else files.push({ path, bytes: (await lstat(path)).size });
  }
  return files;
}
for (const path of ['dist/index.html', 'README.md', 'DESIGN.md', 'package.json', 'package-lock.json', 'artifacts/validation.md']) assert((await lstat(path)).isFile(), `Required file missing: ${path}`);
const html = await readFile('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
const share = html.match(/property="og:image" content="([^"]+)"/)?.[1];
assert(share, 'Missing share image');
assets.push(share);
for (const asset of assets) {
  assert(asset.startsWith('./'), `Nonrelative entry asset: ${asset}`);
  assert((await lstat(resolve('dist', asset))).isFile(), `Missing entry asset: ${asset}`);
}
assert(html.includes('<title>') && html.includes('name="description"') && html.includes('property="og:title"') && html.includes('rel="icon"'), 'Incomplete metadata');
assert.equal(await readFile('public/data/jobs.json', 'utf8'), await readFile('dist/data/jobs.json', 'utf8'), 'Stale exported snapshot');
const css = (await readdir('dist/assets')).filter(name => name.endsWith('.css'));
for (const name of css) {
  const content = await readFile(`dist/assets/${name}`, 'utf8');
  for (const match of content.matchAll(/url\(([^)]+)\)/g)) {
    const asset = match[1].replace(/["']/g, '');
    if (asset.startsWith('data:') || asset.startsWith('#')) continue;
    assert(!asset.startsWith('/') && !asset.startsWith('http'), `Nonrelative CSS asset: ${asset}`);
    assert((await lstat(resolve('dist/assets', asset))).isFile(), `Missing CSS asset: ${asset}`);
  }
}
const report = { fileCount: 0, uncompressedBytes: 0, budgetBytes: limit, exportBytes: 0, exportIndexSha256: createHash('sha256').update(html).digest('hex'), relativeEntryAssets: true, relativeCSSAssets: true, sourceAndExportDataMatch: true, dependencyDirectoriesInDelivery: 0 };
// Include this report's own final length in the conservative, uncompressed budget.
for (let pass = 0; pass < 3; pass++) {
  await writeFile('artifacts/delivery.json', JSON.stringify(report, null, 2) + '\n');
  const files = await inventory();
  report.fileCount = files.length;
  report.uncompressedBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  report.exportBytes = files.filter(file => file.path.startsWith('dist/')).reduce((sum, file) => sum + file.bytes, 0);
}
await writeFile('artifacts/delivery.json', JSON.stringify(report, null, 2) + '\n');
assert(report.uncompressedBytes < limit, `Delivery exceeds ${limit} bytes`);
console.log(`PASS: ${report.fileCount} files, ${report.uncompressedBytes.toLocaleString('en-US')} uncompressed bytes / ${limit.toLocaleString('en-US')}; export ${report.exportBytes.toLocaleString('en-US')} bytes; relative entry/CSS assets; matching data; no dependency directories or archives.`);
