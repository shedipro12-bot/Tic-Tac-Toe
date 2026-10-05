import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseHeaders(source) {
  const rules = []; let current;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (!/^\s/.test(raw)) { current = { pattern: line, headers: {} }; rules.push(current); }
    else {
      const colon = line.indexOf(':'); if (!current || colon < 1) throw new Error('Invalid static header rule');
      current.headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
    }
  }
  return rules;
}
export function headersFor(rules, pathname) {
  const headers = {};
  for (const rule of rules) {
    const pattern = new RegExp(`^${rule.pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    if (pattern.test(pathname)) for (const [key, value] of Object.entries(rule.headers))
      headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }
  return headers;
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8' };

// Local verification server only. Production is Cloudflare Pages static hosting.
export function createStaticServer(directory) {
  let root = resolve(directory);
  const server = createServer(async (request, response) => {
    try {
      const requestRoot = root;
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const rules = parseHeaders(await readFile(resolve(requestRoot, '_headers'), 'utf8'));
      const headers = headersFor(rules, pathname);
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { ...headers, Allow: 'GET, HEAD' }); response.end(); return; }
      let file = resolve(requestRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
      let status = 200;
      if (!file.startsWith(requestRoot + sep) || pathname === '/_headers' || !(await stat(file).catch(() => null))?.isFile()) {
        file = resolve(requestRoot, '404.html'); status = 404;
      }
      const bytes = await readFile(file);
      const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
      const conditional = status === 200 && request.headers['if-none-match'] === etag;
      response.writeHead(conditional ? 304 : status, { ...headers, 'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        ETag: etag, ...(conditional ? {} : { 'Content-Length': bytes.length }) });
      response.end(request.method === 'HEAD' || conditional ? undefined : bytes);
    } catch { response.writeHead(400); response.end('Bad request'); }
  });
  return { server, setDirectory(directory) { root = resolve(directory); } };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex < 0 ? 4173 : Number(process.argv[portIndex + 1]);
  const { server } = createStaticServer('dist');
  server.listen(port, '127.0.0.1', () => console.log(`Local production preview: http://127.0.0.1:${port}/`));
}
