import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';

const inventory = JSON.parse(await readFile('dist/precache-inventory.json', 'utf8'));
const cached = new Map(inventory.entries.map(entry => [entry.url, entry]));
const files = await readdir('dist', { recursive: true });
const required = files.map(file => file.replaceAll('\\', '/')).filter(file =>
  /\.(html|js|css|json|webmanifest|woff2?|svg|png|mp3)$/.test(file) &&
  !['sw.js', 'precache-inventory.json'].includes(file));
assert(required.length > 0);
for (const file of required) {
  assert(cached.has(file), `Required resource absent from precache: ${file}`);
  const bytes = await readFile(path.join('dist', file));
  assert(bytes.length <= 2 * 1024 * 1024, `Required resource exceeds cache limit: ${file}`);
  assert.equal(cached.get(file).integrity, `sha256-${createHash('sha256').update(bytes).digest('base64')}`);
}
for (const entry of inventory.entries) assert((await stat(path.join('dist', entry.url))).isFile(), entry.url);
for (const directory of ['textures', 'sounds', 'icons']) {
  for (const file of await readdir(`public/${directory}`)) assert(cached.has(`${directory}/${file}`));
}
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone'); assert.equal(manifest.lang, 'en'); assert.equal(manifest.dir, 'ltr');
assert(!manifest.orientation);
for (const icon of [...manifest.icons, { src: '/icons/apple-touch-180.png', sizes: '180x180' }]) {
  const bytes = await readFile(`dist${icon.src}`);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
}
const html = await readFile('dist/index.html', 'utf8');
const metadata = JSON.parse(await readFile('dist/boot-meta.json', 'utf8'));
assert.equal(metadata.buildId, inventory.buildId, 'Bootstrap metadata must identify this build');
assert(Array.isArray(metadata.core) && metadata.core.length > 1);
for (const file of metadata.core) assert(cached.has(file.replace(/^\//, '')), `Bootstrap core missing from inventory: ${file}`);
assert(html.includes('manifest.webmanifest')); assert(html.includes('apple-touch-180.png'));
assert(!/<script(?![^>]*src=)[^>]*>\s*[^<]/.test(html), 'Inline script is not allowed');
const worker = await readFile('dist/sw.js', 'utf8');
for (const file of required) assert(worker.includes(file), `Worker does not precache ${file}`);
assert(worker.includes('SKIP_WAITING'));
console.log(`PWA verified: ${inventory.entries.length} revisioned assets, valid manifest, four PNG icons, local worker.`);
