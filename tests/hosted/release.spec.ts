import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { open, playPath, start } from '../helpers/browserGame';

const label = process.env.MILESTONE5_HOSTED_LABEL ?? 'hosted';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid evidence label');
async function save(name: string, value: unknown) {
  await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile(`artifacts/milestone-5/${label}-${name}.json`, JSON.stringify(value, null, 2));
}
async function ready(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await open(page, 0); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible({ timeout: 30_000 });
}
test('hosted HTTPS serves complete, matching builds with exact headers and honest 404s', async ({ request, baseURL }) => {
  const inventory = await (await request.get('/precache-inventory.json')).json();
  const metadata = await (await request.get('/boot-meta.json')).json();
  expect(metadata.buildId).toBe(inventory.buildId);
  const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
  const report = [];
  const entries = inventory.entries as { url: string; integrity: string }[];
  for (const file of [...new Set(['/', '/sw.js', '/precache-inventory.json', ...entries.map(entry => `/${entry.url}`)])]) {
    const response = await request.get(file); const headers = response.headers(); expect(response.status(), file).toBe(200);
    expect(headers['content-security-policy'], file).toBe(csp);
    expect(headers['x-content-type-options']).toBe('nosniff'); expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    if (file !== '/404.html') expect(headers['cache-control'], file).toBe(file.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    if (file.endsWith('.js')) expect(headers['content-type']).toContain('javascript');
    if (file.endsWith('.mp3')) expect(headers['content-type']).toContain('audio/mpeg');
    if (file.endsWith('.css')) expect(headers['content-type']).toContain('text/css');
    const entry = entries.find(entry => `/${entry.url}` === file);
    if (entry) expect(`sha256-${createHash('sha256').update(await response.body()).digest('base64')}`, file).toBe(entry.integrity);
    let revalidation: number | null = null;
    if (headers.etag) { revalidation = (await request.get(file, { headers: { 'If-None-Match': headers.etag } })).status(); expect(revalidation, file).toBe(304); }
    report.push({ file, status: response.status(), headers, integrityVerified: Boolean(entry), revalidation });
  }
  for (const file of ['/assets/missing.js', '/sounds/missing.mp3', '/api/missing', '/not-a-route']) {
    const response = await request.get(file); expect(response.status(), file).toBe(404);
    expect(await response.text()).not.toContain('id="root"'); report.push({ file, status: 404, headers: response.headers(), integrityVerified: false, revalidation: null });
  }
  await save('http', { origin: baseURL, buildId: inventory.buildId, testedAt: new Date().toISOString(), report });
});
test('hosted game, all levels, actual sound and fresh offline document work under CSP without player storage', async ({ page, context, baseURL, request, browser }) => {
  const violations: string[] = []; const requests: { url: string; method: string }[] = [];
  await page.exposeFunction('policyViolation', (value: string) => violations.push(value));
  await context.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
    void (window as typeof window & { policyViolation?: (value: string) => Promise<void> }).policyViolation?.(event.violatedDirective);
  }));
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await ready(page); await start(page, 'medium'); await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win'); await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
  await page.evaluate(() => {
    const button = document.createElement('button'); button.id = 'hosted-audio'; button.textContent = 'Audio verification';
    button.addEventListener('click', () => {
      const audio = new Audio('/sounds/win-v1.mp3');
      (window as typeof window & { played: Promise<boolean> }).played = audio.play().then(() => { const result = !audio.paused; audio.pause(); return result; });
    }); document.body.append(button);
  });
  await page.getByRole('button', { name: 'Audio verification' }).click();
  expect(await page.evaluate(() => (window as typeof window & { played: Promise<boolean> }).played)).toBe(true);
  await page.locator('#hosted-audio').evaluate(button => button.remove());
  await page.getByRole('button', { name: 'Settings' }).click(); await page.getByRole('switch', { name: 'Sound effects' }).click();
  await page.getByRole('button', { name: 'Back' }).click(); await expect(page.getByRole('status')).toHaveText('You win');
  await context.setOffline(true); await page.close(); const fresh = await context.newPage();
  await fresh.exposeFunction('policyViolation', (value: string) => violations.push(value));
  const resources: { url: string; fromServiceWorker: boolean }[] = [];
  fresh.on('response', response => resources.push({ url: response.url(), fromServiceWorker: response.fromServiceWorker() }));
  await ready(fresh); await fresh.getByRole('button', { name: 'Settings' }).click();
  await expect(fresh.getByRole('switch', { name: 'Sound effects' })).toBeChecked(); await fresh.getByRole('button', { name: 'Back' }).click();
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    await start(fresh, difficulty); await playPath(fresh, 'human-win', 0); await expect(fresh.getByRole('status')).toHaveText('You win');
    await fresh.reload(); await expect(fresh.locator('[data-offline-status="ready"]')).toBeVisible();
  }
  expect(resources.length).toBeGreaterThan(5); expect(resources.every(item => item.fromServiceWorker)).toBe(true);
  expect(violations).toEqual([]); expect(requests.every(item => new URL(item.url).origin === new URL(baseURL!).origin && item.method === 'GET')).toBe(true);
  expect(await fresh.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await fresh.screenshot({ path: `artifacts/milestone-5/${label}-offline.png`, fullPage: true });
  const inventory = await (await request.get('/precache-inventory.json')).json();
  await save('game', { origin: baseURL, buildId: inventory.buildId, browser: browser.version(), testedAt: new Date().toISOString(),
    httpCacheDisabled: true, offlineResources: resources, levels: ['easy', 'medium', 'hard'], actualAudio: true, cspViolations: violations, playerStorage: [0, 0], appRequests: requests });
});
test('hosted bootstrap repairs the same build after a real missing-core offline failure', async ({ page, context, request, baseURL }) => {
  await ready(page); await page.clock.resume(); const inventory = await (await request.get('/precache-inventory.json')).json();
  const missing = inventory.entries.find((entry: { url: string }) => /^assets\/main-.*\.js$/.test(entry.url)).url;
  await context.setOffline(true);
  expect(await page.evaluate(async missing => {
    const name = (await caches.keys()).find(name => name.startsWith('tic-tac-toe-precache-v2-'))!;
    const cache = await caches.open(name); const key = (await cache.keys()).find(key => new URL(key.url).pathname === `/${missing}`)!;
    return cache.delete(key);
  }, missing)).toBe(true);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Connection needed' })).toBeVisible();
  await context.setOffline(false); await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-offline-status="ready"]')).toBeVisible();
  await save('bootstrap', { origin: baseURL, buildId: inventory.buildId, testedAt: new Date().toISOString(), missing, recovered: true });
});
