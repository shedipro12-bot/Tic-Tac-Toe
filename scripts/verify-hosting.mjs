import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { headersFor, parseHeaders } from './static-server.mjs';

const source = await readFile('public/_headers', 'utf8');
assert.equal(await readFile('dist/_headers', 'utf8'), source);
const rules = parseHeaders(source);
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
for (const file of ['/', '/index.html', '/sw.js', '/manifest.webmanifest', '/boot-meta.json', '/precache-inventory.json', '/assets/main-example.js', '/api/missing']) {
  const headers = headersFor(rules, file);
  assert.equal(headers['content-security-policy'], csp);
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['referrer-policy'], 'no-referrer');
  assert.equal(headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
}
const immutable = 'public, max-age=31536000, immutable';
for (const file of await readdir('dist/assets')) {
  assert(/-[\w-]{8,}\.(js|css|woff2?)$/.test(file), `Unversioned immutable asset: ${file}`);
  assert.equal(headersFor(rules, `/assets/${file}`)['cache-control'], immutable);
}
const inventory = JSON.parse(await readFile('dist/precache-inventory.json', 'utf8'));
for (const file of ['/', '/sw.js', '/boot-meta.json', '/precache-inventory.json', ...inventory.entries.filter(entry => !entry.url.startsWith('assets/') && entry.url !== '404.html').map(entry => `/${entry.url}`)]) {
  assert.equal(headersFor(rules, file)['cache-control'], 'public, max-age=0, must-revalidate', file);
}
const missing = await readFile('dist/404.html', 'utf8');
assert(!missing.includes('id="root"') && !missing.includes('<script'), '404 must not serve the game shell');
console.log('Hosting configuration verified: exact CSP, hashed immutable assets, revalidation and a separate 404.');
