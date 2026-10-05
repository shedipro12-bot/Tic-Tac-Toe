import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { cell, open, playPath, screenshot, start } from '../helpers/browserGame';

// Fixed offline acceptance matrix: 12 cases (3 levels, totals, 4 feedback
// combinations, resources/media, live disconnect, browser restart, bfcache).
const ready = (page: Page) => page.locator('[data-offline-status="ready"]');
const unavailable = (page: Page) => page.locator('[data-offline-status="unavailable"]');
const base = 'http://127.0.0.1:4173';
async function disableHttpCache(context: BrowserContext, page: Page) {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable'); await session.send('Network.setCacheDisabled', { cacheDisabled: true });
}
async function prepare(page: Page) {
  await disableHttpCache(page.context(), page); await open(page, 0);
  await expect(ready(page)).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
}
async function reopenOffline(page: Page) {
  const context = page.context(); await prepare(page); await context.setOffline(true); await page.close();
  const fresh = await context.newPage(); await disableHttpCache(context, fresh);
  const responses: boolean[] = [];
  fresh.on('response', response => { if (/\.(js|css|woff2|svg)$/.test(new URL(response.url()).pathname)) responses.push(response.fromServiceWorker()); });
  await open(fresh, 0); await expect(ready(fresh)).toBeVisible();
  expect(responses.length).toBeGreaterThan(3); expect(responses.every(Boolean)).toBe(true);
  return fresh;
}
async function erase(page: Page, pattern: string) {
  return page.evaluate(async pattern => {
    const name = (await caches.keys()).find(name => name.startsWith('tic-tac-toe-precache-v2-'))!;
    const cache = await caches.open(name); const keys = await cache.keys();
    const targets = keys.filter(key => new URL(key.url).pathname.includes(pattern));
    for (const key of targets) await cache.delete(key);
    return targets.map(key => key.url);
  }, pattern);
}
const checkCache = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  test(`offline acceptance: fresh document completes ${difficulty}`, async ({ page }) => {
    const fresh = await reopenOffline(page); await start(fresh, difficulty); await playPath(fresh, 'human-win', 0);
    await expect(fresh.getByRole('status')).toHaveText('You win');
    await expect(fresh.getByRole('definition')).toHaveText(['1', '0', '0']);
    await screenshot(fresh, `offline-${difficulty}-win`);
  });
}
test('offline acceptance: totals, all outcomes, replay, next difficulty, pending restart and independent tabs', async ({ page }) => {
  const fresh = await reopenOffline(page); await start(fresh); await playPath(fresh, 'human-win', 0);
  await fresh.getByRole('radio', { name: 'Easy', exact: true }).check();
  await fresh.getByRole('button', { name: 'Play Again' }).click();
  await expect(fresh.getByText('Difficulty: Easy')).toBeVisible();
  await fresh.evaluate(() => { Math.random = () => 0.99; }); await playPath(fresh, 'computer-win', 0.99);
  await fresh.getByRole('radio', { name: 'Medium', exact: true }).check();
  await fresh.getByRole('button', { name: 'Play Again' }).click(); await playPath(fresh, 'draw', 0.99);
  await expect(fresh.getByRole('definition')).toHaveText(['1', '1', '1']);
  await screenshot(fresh, 'offline-totals-draw');
  await fresh.getByRole('button', { name: 'Play Again' }).click(); await cell(fresh, 0).click();
  await fresh.getByRole('button', { name: 'Restart' }).click(); await fresh.clock.runFor(2000);
  await expect(fresh.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await expect(fresh.getByRole('definition')).toHaveText(['1', '1', '1']);
  const other = await fresh.context().newPage(); await open(other); await start(other, 'medium');
  await expect(other.getByRole('definition')).toHaveText(['0', '0', '0']);
  await expect(fresh.getByRole('definition')).toHaveText(['1', '1', '1']);
});
for (const soundOn of [true, false]) for (const animationOn of [true, false]) {
  test(`offline acceptance: settings sound=${soundOn}, animations=${animationOn}`, async ({ page }) => {
    const fresh = await reopenOffline(page);
    await fresh.setViewportSize(soundOn ? { width: 320, height: 568 } : { width: 844, height: 390 });
    await fresh.getByRole('button', { name: 'Settings' }).click();
    if (!soundOn) await fresh.getByRole('switch', { name: 'Sound effects' }).click();
    if (!animationOn) await fresh.getByRole('switch', { name: 'Animations' }).click();
    await fresh.getByRole('button', { name: 'Back' }).click(); await start(fresh);
    await cell(fresh, 0).click(); await fresh.getByRole('button', { name: 'Settings' }).click();
    await fresh.clock.runFor(400);
    await expect(fresh.getByRole('switch', { name: 'Sound effects' })).toBeChecked({ checked: soundOn });
    await expect(fresh.getByRole('switch', { name: 'Animations' })).toBeChecked({ checked: animationOn });
    await screenshot(fresh, `offline-settings-${soundOn}-${animationOn}`);
    await fresh.getByRole('button', { name: 'Back' }).click();
    await expect(fresh.getByRole('button', { name: /: O$/ })).toHaveCount(1);
    await fresh.getByRole('button', { name: 'Restart' }).click(); await fresh.emulateMedia({ reducedMotion: 'reduce' });
    await playPath(fresh, 'human-win', 0); await expect(fresh.getByRole('status')).toHaveText('You win');
    expect(await fresh.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    await fresh.getByRole('button', { name: 'Settings' }).click(); await fresh.getByRole('button', { name: 'Back' }).click();
    await expect(fresh.getByRole('status')).toHaveText('You win');
    expect(await fresh.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('offline acceptance: every cached resource, font, texture, MP3 decode, real playback and Range', async ({ page }) => {
  const fresh = await reopenOffline(page);
  const inventory = JSON.parse(await readFile('dist/precache-inventory.json', 'utf8'));
  const report = await fresh.evaluate(async entries => {
    const audio = new AudioContext();
    try {
      const resources = await Promise.all(entries.map(async (entry: { url: string }) => {
        const response = await fetch(`/${entry.url}`); const data = await response.arrayBuffer();
        const decoded = entry.url.endsWith('.mp3') ? await audio.decodeAudioData(data.slice(0)) : null;
        return { url: entry.url, status: response.status, length: data.byteLength, duration: decoded?.duration ?? null };
      }));
      const ranges = await Promise.all(['bytes=0-99', 'bytes=-10', 'bytes=999999-', 'bytes=-0'].map(async range => {
        const response = await fetch('/sounds/move-v1.mp3', { headers: { Range: range } });
        return { status: response.status, length: (await response.arrayBuffer()).byteLength, type: response.headers.get('content-type') };
      }));
      return { resources, ranges, font: document.fonts.check('800 28px "Nunito Sans"') };
    } finally { await audio.close(); }
  }, inventory.entries);
  expect(report.resources.every((resource: { status: number; length: number }) => resource.status === 200 && resource.length > 0)).toBe(true);
  expect(report.resources.filter((resource: { duration: number | null }) => resource.duration !== null)).toHaveLength(4);
  expect(report.font).toBe(true);
  expect(report.ranges.map((range: { status: number }) => range.status)).toEqual([206, 206, 416, 416]);
  expect(report.ranges[0].length).toBe(100); expect(report.ranges[1].length).toBe(10);
  await fresh.evaluate(() => {
    const button = document.createElement('button'); button.id = 'media-probe'; button.textContent = 'Media probe'; document.body.append(button);
    button.addEventListener('click', () => {
      (window as typeof window & { playback?: Promise<boolean[]> }).playback = Promise.all(['move', 'win', 'loss', 'draw'].map(async name => {
        const sound = new Audio(`/sounds/${name}-v1.mp3`); sound.crossOrigin = 'anonymous';
        await sound.play(); const played = !sound.paused && sound.readyState >= 2; sound.pause(); return played;
      }));
    });
  });
  await fresh.getByRole('button', { name: 'Media probe' }).click();
  expect(await fresh.evaluate(() => (window as typeof window & { playback: Promise<boolean[]> }).playback)).toEqual([true, true, true, true]);
  await fresh.locator('#media-probe').evaluate(element => element.remove());
  await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile('artifacts/milestone-5/offline-resource-report.json', JSON.stringify(report, null, 2));
  for (const url of ['/assets/missing.js', '/sounds/missing.mp3', '/api/missing']) {
    const result = await fresh.evaluate(async url => { try { const r = await fetch(url); return r.headers.get('content-type'); } catch { return null; } }, url);
    expect(result ?? '').not.toContain('text/html');
  }
});
test('offline acceptance: live disconnect preserves state; reload restores defaults', async ({ page, context }) => {
  await prepare(page); await start(page); await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click(); await cell(page, 0).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Sound effects' }).click(); await page.getByRole('switch', { name: 'Animations' }).click();
  await context.setOffline(true); await page.clock.runFor(400); await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
  await page.reload(); await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked(); await expect(page.getByRole('switch', { name: 'Animations' })).toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click(); await start(page);
  await expect(page.getByRole('definition')).toHaveText(['0', '0', '0']);
});
test('offline acceptance: browser process reopens its saved profile without HTTP cache', async () => {
  await mkdir('.playwright', { recursive: true }); const profile = await mkdtemp('.playwright/offline-profile-');
  const options = { channel: 'chrome', baseURL: base, headless: true, viewport: { width: 390, height: 844 } };
  let context = await chromium.launchPersistentContext(profile, options);
  try {
    await prepare(context.pages()[0]); await context.close();
    context = await chromium.launchPersistentContext(profile, options); await context.setOffline(true);
    const page = context.pages()[0]; await disableHttpCache(context, page);
    const response = await page.goto('/'); expect(response?.fromServiceWorker()).toBe(true);
    await expect(ready(page)).toBeVisible(); await start(page, 'medium');
    await expect(page.getByRole('definition')).toHaveText(['0', '0', '0']);
    await screenshot(page, 'offline-browser-reopened');
  } finally { await context.close(); }
});
test('offline acceptance: persisted restoration resets an offline session', async ({ page, context }) => {
  await prepare(page); await start(page); await playPath(page, 'human-win', 0); await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible(); await start(page, 'medium');
  await expect(page.getByRole('definition')).toHaveText(['0', '0', '0']);
});

test('first uncached offline visit fails honestly', async ({ page, context }) => {
  await context.setOffline(true); await expect(page.goto('/')).rejects.toThrow();
  await expect(ready(page)).toHaveCount(0); await expect(page.getByRole('button', { name: 'Start Game' })).toHaveCount(0);
});
test('failed registration keeps the online game usable without claiming readiness', async ({ page, context }) => {
  await context.route('**/sw.js', route => route.abort()); await open(page, 0);
  await expect(unavailable(page)).toBeVisible(); await expect(ready(page)).toHaveCount(0);
  await start(page); await playPath(page, 'human-win', 0); await expect(page.getByRole('status')).toHaveText('You win');
  await screenshot(page, 'registration-unavailable');
  await context.unroute('**/sw.js');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(ready(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
});
test('failed worker precache is a worker-owned failed request, not a ready cache', async ({ page, context }) => {
  const failed: string[] = [];
  await context.route('**/sounds/win-v1.mp3*', route => {
    if (route.request().serviceWorker()) { failed.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await open(page, 0); await expect(unavailable(page)).toBeVisible({ timeout: 20_000 });
  expect(failed.length).toBeGreaterThan(0); await expect(ready(page)).toHaveCount(0);
  await start(page); await playPath(page, 'human-win', 0); await expect(page.getByRole('status')).toHaveText('You win');
});
test('missing core shows Connection needed and recovers when connection returns', async ({ page, context }) => {
  await prepare(page); expect(await erase(page, '/assets/main-')).toHaveLength(2);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'Connection needed' })).toBeVisible();
  await expect(page.getByText('Connect to the internet to load the game.')).toBeVisible();
  await expect(page.getByRole('button')).toHaveCount(0); await expect(ready(page)).toHaveCount(0);
  await screenshot(page, 'connection-needed');
  await context.setOffline(false); await checkCache(page);
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible({ timeout: 20_000 });
  await expect(ready(page)).toBeVisible(); await screenshot(page, 'connection-recovered');
});
test('failed bootstrap retries a transient online core failure with a bounded delay', async ({ page, context }) => {
  await context.route('**/sw.js', route => route.abort('failed'));
  let attempts = 0; let available = false;
  await context.route('**/assets/main-*.js', route => {
    attempts++;
    return available ? route.continue() : route.abort('failed');
  });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Connection needed' })).toBeVisible();
  await expect.poll(() => attempts).toBeGreaterThanOrEqual(2);
  available = true;
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible({ timeout: 10_000 });
  expect(attempts).toBeLessThanOrEqual(6); await screenshot(page, 'bootstrap-transient-recovered');
});
test('partial optional assets and quota failure do not block a live game or claim readiness; repair preserves foreign caches', async ({ page, context }) => {
  await prepare(page); await start(page);
  await page.evaluate(async () => { const cache = await caches.open('other-application'); await cache.put('/sentinel', new Response('preserve')); });
  expect((await erase(page, '/sounds/')).length).toBe(4); expect((await erase(page, '.woff')).length).toBe(8);
  await context.setOffline(true); await checkCache(page); await expect(unavailable(page)).toBeVisible();
  await playPath(page, 'human-win', 0); await expect(page.getByRole('status')).toHaveText('You win');
  const worker = context.serviceWorkers()[0];
  await worker.evaluate(() => {
    (self as typeof self & { savedPut?: typeof Cache.prototype.put }).savedPut = Cache.prototype.put;
    (self as typeof self & { failedPuts: number }).failedPuts = 0;
    Cache.prototype.put = () => {
      (self as typeof self & { failedPuts: number }).failedPuts++;
      return Promise.reject(new DOMException('Test quota exhausted', 'QuotaExceededError'));
    };
  });
  await context.setOffline(false); await checkCache(page);
  // Online and visibility events can queue a second complete repair attempt.
  // Each attempt must reach all 12 missing resources and fail honestly.
  await expect.poll(() => worker.evaluate(() => (self as typeof self & { failedPuts: number }).failedPuts)).toBeGreaterThanOrEqual(12);
  expect(await worker.evaluate(() => (self as typeof self & { failedPuts: number }).failedPuts % 12)).toBe(0);
  await expect(unavailable(page)).toBeVisible();
  await expect(ready(page)).toHaveCount(0); await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
  await worker.evaluate(() => { Cache.prototype.put = (self as typeof self & { savedPut: typeof Cache.prototype.put }).savedPut; });
  await checkCache(page); await expect(ready(page)).toBeVisible();
  await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
  await worker.evaluate(() => {
    (self as typeof self & { savedOpen?: typeof CacheStorage.prototype.open }).savedOpen = CacheStorage.prototype.open;
    CacheStorage.prototype.open = () => Promise.reject(new DOMException('Cache API blocked', 'SecurityError'));
  });
  await checkCache(page); await expect(unavailable(page)).toBeVisible();
  await worker.evaluate(() => { CacheStorage.prototype.open = (self as typeof self & { savedOpen: typeof CacheStorage.prototype.open }).savedOpen; });
  await checkCache(page); await expect(ready(page)).toBeVisible();
  expect(await page.evaluate(async () => (await (await caches.open('other-application')).match('/sentinel'))?.text())).toBe('preserve');
  await screenshot(page, 'partial-cache-repaired');
});
test('unsupported worker leaves a functional online game', async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(Object.getPrototypeOf(navigator), 'serviceWorker'); });
  await open(page, 0); await start(page); await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win'); await expect(ready(page)).toHaveCount(0);
});
