// Imported before generated Workbox routes. Uses only this app's revisioned precache.
const inventory = __INVENTORY__;
const buildId = __BUILD_ID__;
const cacheName = `tic-tac-toe-precache-v2-${self.registration.scope}`;
function cacheKey(entry) {
  const url = new URL(entry.url, self.registration.scope);
  if (entry.revision) url.searchParams.set('__WB_REVISION__', entry.revision);
  return url.href;
}
async function inspect(repair) {
  const cache = await caches.open(cacheName);
  const missing = [];
  for (const entry of inventory) {
    const key = cacheKey(entry);
    let response = await cache.match(key);
    if (!response && repair) {
      try {
        const fetched = await fetch(key, { cache: 'reload', integrity: entry.integrity || undefined });
        if (fetched.status === 200) { await cache.put(key, fetched); response = await cache.match(key); }
      } catch { /* Offline, rejected content, or quota: keep reporting missing. */ }
    }
    if (!response || response.status !== 200) missing.push(entry.url);
  }
  return { buildId, missing, count: inventory.length };
}
self.addEventListener('message', event => {
  if (!['CHECK_CACHE', 'PREPARE_CACHE'].includes(event.data?.type) || !event.ports[0]) return;
  const reply = inspect(event.data.type === 'PREPARE_CACHE')
    .then(report => event.ports[0].postMessage(report))
    .catch(() => event.ports[0].postMessage({ buildId, missing: ['cache-unavailable'], count: 0 }));
  event.waitUntil(reply);
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const entry = inventory.find(item => new URL(item.url, self.registration.scope).href === url.href);
  const range = event.request.headers.get('range');
  if (event.request.method !== 'GET' || !range || !entry?.url.endsWith('.mp3')) return;
  event.stopImmediatePropagation();
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const response = await cache.match(cacheKey(entry));
    if (!response) return fetch(event.request);
    const bytes = await response.arrayBuffer();
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : bytes.byteLength - 1;
    if (match && !match[1] && match[2]) { start = Math.max(0, bytes.byteLength - end); end = bytes.byteLength - 1; }
    end = Math.min(end, bytes.byteLength - 1);
    if (!match || (!match[1] && !match[2]) || start > end || start >= bytes.byteLength) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
    }
    return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
      'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${bytes.byteLength}`,
      'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes',
    } });
  })());
});
