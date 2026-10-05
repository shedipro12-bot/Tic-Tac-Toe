import { chromium, expect, test as base, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createStaticServer } from '../../scripts/static-server.mjs';
import { cell, open, playPath, screenshot, start } from '../helpers/browserGame';

type Release = { path: string; buildId: string };
const releases: { a: Release; b: Release } = JSON.parse(readFileSync('.playwright/update-builds.json', 'utf8'));
const test = base.extend<{ host: ReturnType<typeof createStaticServer> }>({
  host: async ({}, use) => {
    const host = createStaticServer(releases.a.path);
    await new Promise<void>(resolve => host.server.listen(0, '127.0.0.1', resolve));
    try { await use(host); } finally { await new Promise<void>(resolve => host.server.close(() => resolve())); }
  },
  baseURL: async ({ host }, use) => {
    const address = host.server.address();
    if (!address || typeof address === 'string') throw new Error('No test origin');
    await use(`http://127.0.0.1:${address.port}`);
  },
});
const notice = (page: Page) => page.getByRole('region', { name: 'Application update' });
const updateButton = (page: Page) => page.getByRole('button', { name: 'Update and reset session' });
async function prepare(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await open(page, 0); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => { (window as typeof window & { documentMarker: string }).documentMarker = 'original-document'; });
}
async function stage(page: Page, host: ReturnType<typeof createStaticServer>, release = releases.b) {
  host.setDirectory(release.path);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
}
async function activeBuild(page: Page) {
  return page.evaluate(async () => {
    const worker = navigator.serviceWorker.controller!;
    return new Promise<string>(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data.buildId); };
      worker.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
    });
  });
}
const marker = (page: Page) => page.evaluate(() => (window as typeof window & { documentMarker?: string }).documentMarker);
async function fresh(page: Page) {
  await expect.poll(() => marker(page).catch(() => 'navigating')).toBeUndefined();
  await expect(page.locator('[data-offline-status="ready"]')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
}
async function defaults(page: Page) {
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Animations' })).toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click();
  await start(page, 'medium'); await expect(page.getByRole('definition')).toHaveText(['0', '0', '0']);
}

test('waiting update preserves setup until one explicit reset, including a double click', async ({ page, host }) => {
  await prepare(page); await page.getByRole('radio', { name: 'Easy', exact: true }).check();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Sound effects' }).click(); await page.getByRole('button', { name: 'Back' }).click();
  await stage(page, host); await expect(notice(page)).toBeVisible(); await screenshot(page, 'update-ready-setup');
  expect(await activeBuild(page)).toBe(releases.a.buildId); expect(await marker(page)).toBe('original-document');
  let navigations = 0; page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await updateButton(page).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await fresh(page); expect(await activeBuild(page)).toBe(releases.b.buildId); await defaults(page);
  expect(navigations).toBe(1); await expect(notice(page)).toHaveCount(0);
});
for (const phase of ['human', 'computer'] as const) {
  test(`update waits through ${phase} turn and Settings, then resets a finished session`, async ({ page, host }) => {
    await prepare(page); await start(page);
    if (phase === 'computer') await cell(page, 0).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Animations' }).click();
    await stage(page, host); await expect(notice(page)).toHaveCount(0);
    if (phase === 'computer') await page.clock.runFor(400);
    expect(await marker(page)).toBe('original-document'); await expect(notice(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Restart' }).click(); await playPath(page, 'human-win', 0);
    await expect(notice(page)).toBeVisible(); await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
    await page.getByRole('button', { name: 'Settings' }).click(); await expect(notice(page)).toBeVisible();
    await updateButton(page).click(); await fresh(page); await defaults(page);
  });
}
for (const hidden of [false, true]) {
  test(`another tab activates B while A completes its pending turn; simulated-hidden=${hidden}`, async ({ page, context, host }) => {
    await prepare(page); await start(page); await cell(page, 0).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Sound effects' }).click();
    const other = await context.newPage(); await prepare(other); await stage(other, host);
    if (hidden) await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await updateButton(other).click(); await fresh(other);
    expect(await marker(page)).toBe('original-document'); await expect(notice(page)).toHaveCount(0);
    if (hidden) await page.evaluate(() => {
      Reflect.deleteProperty(document, 'visibilityState'); document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.bringToFront(); await page.clock.runFor(400);
    await expect(page.getByRole('switch', { name: 'Sound effects' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
    await page.getByRole('button', { name: 'Restart' }).click(); await playPath(page, 'human-win', 0);
    await expect(notice(page)).toBeVisible(); await screenshot(page, `update-cross-tab-${hidden}`);
    expect(await marker(page)).toBe('original-document'); await updateButton(page).click();
    await fresh(page); await defaults(page);
    await expect(other.getByRole('button', { name: 'Start Game' })).toBeVisible();
  });
}
test('parallel consent in two tabs reloads each exactly once', async ({ page, context, host }) => {
  await prepare(page); const other = await context.newPage(); await prepare(other); await stage(page, host);
  await other.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(updateButton(other)).toBeVisible();
  const counts = [0, 0]; [page, other].forEach((tab, i) => tab.on('framenavigated', frame => { if (frame === tab.mainFrame()) counts[i]++; }));
  await Promise.all([updateButton(page).click(), updateButton(other).click()]);
  for (const tab of [page, other]) { await fresh(tab); await defaults(tab); }
  expect(counts).toEqual([1, 1]);
});
test('a genuinely failed worker download keeps A usable and available offline', async ({ page, context, host }) => {
  await prepare(page); let workerFailures = 0;
  const inventory = JSON.parse(readFileSync(`${releases.b.path}/precache-inventory.json`, 'utf8'));
  const missing = inventory.entries.find((entry: { url: string }) => /^assets\/main-.*\.js$/.test(entry.url)).url;
  await context.route(`**/${missing}*`, async route => { if (route.request().serviceWorker()) workerFailures++; await route.abort('failed'); });
  host.setDirectory(releases.b.path); await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => workerFailures).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.installing?.state ?? 'none')).toBe('none');
  await expect(notice(page)).toHaveCount(0); expect(await marker(page)).toBe('original-document');
  await context.setOffline(true); await page.reload(); await start(page); await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win'); expect(await activeBuild(page)).toBe(releases.a.buildId);
});
test('a fully cached B updates without a network and preserves unrelated caches', async ({ page, context, host }) => {
  await prepare(page);
  await page.evaluate(async () => { const cache = await caches.open('unrelated-test-cache'); await cache.put('/foreign', new Response('keep')); });
  await stage(page, host); await expect(notice(page)).toBeVisible(); await context.setOffline(true);
  await updateButton(page).click(); await fresh(page); await defaults(page);
  expect(await activeBuild(page)).toBe(releases.b.buildId);
  expect(await page.evaluate(async () => (await (await caches.open('unrelated-test-cache')).match('/foreign'))?.text())).toBe('keep');
  await page.reload(); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible();
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    await start(page, difficulty); await playPath(page, 'human-win', 0); await expect(page.getByRole('status')).toHaveText('You win');
    await page.reload(); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible();
  }
});
test('unresponsive waiting worker times out without resetting the game and can be retried', async ({ page, host }) => {
  await prepare(page); await stage(page, host); await expect(notice(page)).toBeVisible();
  await page.evaluate(async () => {
    const worker = (await navigator.serviceWorker.getRegistration())!.waiting!;
    const original = worker.postMessage.bind(worker);
    worker.postMessage = () => {};
    (window as typeof window & { restoreWorker: () => void }).restoreWorker = () => { worker.postMessage = original; };
  });
  await updateButton(page).click(); await expect(page.getByRole('button', { name: 'Start Game' })).toBeDisabled();
  await page.clock.runFor(10_000); await expect(notice(page)).toContainText('Update could not be completed');
  expect(await marker(page)).toBe('original-document'); await expect(page.getByRole('button', { name: 'Start Game' })).toBeEnabled();
  await screenshot(page, 'update-retry');
  await page.evaluate(() => (window as typeof window & { restoreWorker: () => void }).restoreWorker());
  await updateButton(page).click(); await fresh(page); await defaults(page);
});
test('rollback is another waiting update and still requires consent', async ({ page, host }) => {
  await prepare(page); await stage(page, host); await updateButton(page).click();
  await fresh(page);
  await stage(page, host, releases.a); await expect(notice(page)).toBeVisible(); expect(await activeBuild(page)).toBe(releases.b.buildId);
  await updateButton(page).click(); await fresh(page); expect(await activeBuild(page)).toBe(releases.a.buildId); await defaults(page);
});

test('an actually installed app preserves A during activation from a browser tab', async ({ host, baseURL }) => {
  test.setTimeout(45_000); await mkdir('.playwright', { recursive: true });
  const profile = await mkdtemp('.playwright/update-installed-');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: false, args: ['--window-position=-32000,-32000'], baseURL,
    viewport: { width: 390, height: 844 },
  });
  const tab = context.pages()[0]; const cdp = await context.newCDPSession(tab); const manifestId = `${baseURL}/`; let installed = false;
  try {
    await context.addInitScript(() => { Math.random = () => 0; });
    await tab.goto('/'); await expect(tab.locator('[data-offline-status="ready"]')).toBeVisible();
    await cdp.send('PWA.install', { manifestId, installUrlOrBundleUrl: manifestId }); installed = true;
    await cdp.send('PWA.changeAppUserSettings', { manifestId, displayMode: 'standalone' });
    const opened = context.waitForEvent('page'); await cdp.send('PWA.launch', { manifestId }); const app = await opened;
    await app.waitForLoadState(); await prepare(app);
    expect(await app.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true);
    await start(app, 'medium'); await cell(app, 0).click();
    // Installation/display are real. Visibility is synthetic here: this
    // Windows automation session keeps even minimized app windows "visible".
    await app.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await stage(tab, host); await updateButton(tab).click(); await fresh(tab);
    expect(await marker(app)).toBe('original-document'); await expect(notice(app)).toHaveCount(0);
    await app.evaluate(() => {
      Reflect.deleteProperty(document, 'visibilityState'); document.dispatchEvent(new Event('visibilitychange'));
    });
    await app.bringToFront(); await app.clock.runFor(400);
    await expect(app.getByRole('button', { name: /: O$/ })).toHaveCount(1);
    await app.getByRole('button', { name: 'Restart' }).click(); await playPath(app, 'human-win', 0);
    await expect(notice(app)).toBeVisible(); await screenshot(app, 'update-installed-preserves-game');
    await updateButton(app).click(); await fresh(app); await defaults(app);
    expect(await activeBuild(app)).toBe(releases.b.buildId);
  } finally {
    try { if (installed) await cdp.send('PWA.uninstall', { manifestId }); } finally { await context.close(); }
  }
});
test('a recoverable game error offers update and resets prior totals only after consent', async ({ page, host }) => {
  await prepare(page); await start(page); await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await page.evaluate(() => { Math.random = () => { throw new Error('Opponent unavailable'); }; });
  await cell(page, 0).click(); await page.clock.runFor(400);
  await expect(page.getByRole('status')).toContainText('Something went wrong');
  await stage(page, host); await expect(notice(page)).toBeVisible();
  await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']);
  expect(await marker(page)).toBe('original-document'); await screenshot(page, 'update-game-recovery');
  await updateButton(page).click(); await fresh(page); await defaults(page);
});
test('failed bootstrap waits for explicit consent to a fully cached different build, even offline', async ({ page, context, host }) => {
  await prepare(page); await stage(page, host); await expect(notice(page)).toBeVisible();
  const inventory = JSON.parse(readFileSync(`${releases.a.path}/precache-inventory.json`, 'utf8'));
  const missing = inventory.entries.find((entry: { url: string }) => /^assets\/main-.*\.js$/.test(entry.url)).url;
  expect(await page.evaluate(async missing => {
    const name = (await caches.keys()).find(name => name.startsWith('tic-tac-toe-precache-v2-'))!;
    const cache = await caches.open(name);
    const key = (await cache.keys()).find(key => new URL(key.url).pathname === `/${missing}`)!;
    return cache.delete(key);
  }, missing)).toBe(true);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'Connection needed' })).toBeVisible();
  await expect(notice(page)).toBeVisible(); await expect(updateButton(page)).toBeEnabled();
  expect(await activeBuild(page)).toBe(releases.a.buildId);
  let navigations = 0; page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await screenshot(page, 'update-bootstrap-recovery'); await updateButton(page).click();
  await fresh(page); expect(await activeBuild(page)).toBe(releases.b.buildId); await defaults(page);
  expect(navigations).toBe(1);
});
const outcomes: { title: string; status: string; durationMs: number }[] = [];
test.afterEach(async ({}, info) => { outcomes.push({ title: info.title, status: info.status ?? 'unknown', durationMs: info.duration }); });
test.afterAll(async ({ browser }) => {
  await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile('artifacts/milestone-5/update-report.json', JSON.stringify({
    browser: browser.version(), builds: { a: releases.a.buildId, b: releases.b.buildId },
    sameOriginPerCase: true, httpCacheDisabled: true, outcomes,
    limitations: ['Local HTTP secure context; hosted HTTPS alias requires separate verification.', 'Installed app is desktop Chrome, not Android/iOS.', 'Background visibility transitions are synthetic; native minimized windows remained visible in this Windows automation session. Real-device background/foreground checks remain pending.'],
  }, null, 2));
});
