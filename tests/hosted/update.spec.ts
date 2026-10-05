import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cell, open, playPath, start } from '../helpers/browserGame';
const notice = (page: Page) => page.getByRole('button', { name: 'Update and reset session' });
const marker = (page: Page) => page.evaluate(() => (window as typeof window & { releaseMarker?: string }).releaseMarker);
async function activeBuild(page: Page) {
  return page.evaluate(() => new Promise<string>(resolve => {
    const channel = new MessageChannel(); channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data.buildId); };
    navigator.serviceWorker.controller!.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
  }));
}
async function prepare(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await open(page, 0); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => { (window as typeof window & { releaseMarker: string }).releaseMarker = 'A-document'; });
}
async function fresh(page: Page) {
  await expect.poll(() => marker(page).catch(() => 'navigating')).toBeUndefined();
  await expect(page.locator('[data-offline-status="ready"]')).toBeVisible(); await expect(notice(page)).toHaveCount(0);
}
test('same HTTPS preview alias updates A to B with independent local consent and an offline B document', async ({ page, context, request, baseURL }) => {
  test.skip(process.env.MILESTONE5_WAIT_FOR_UPDATE !== '1', 'Run deliberately before publishing B to the same preview alias.');
  test.setTimeout(240_000);
  const a = await (await request.get('/precache-inventory.json')).json();
  await prepare(page); const other = await context.newPage(); await prepare(other);
  expect(await activeBuild(page)).toBe(a.buildId); expect(await activeBuild(other)).toBe(a.buildId);
  await start(page, 'medium'); await cell(page, 0).click();
  await page.getByRole('button', { name: 'Settings' }).click(); await page.getByRole('switch', { name: 'Sound effects' }).click();
  const reloads = [0, 0]; [page, other].forEach((tab, index) => tab.on('framenavigated', frame => { if (frame === tab.mainFrame()) reloads[index]++; }));
  await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile('artifacts/milestone-5/hosted-update-stage-a.json', JSON.stringify({ origin: baseURL, buildId: a.buildId, stage: 'A cached; live computer turn; waiting for another hosted build', testedAt: new Date().toISOString() }, null, 2));
  console.log('Hosted A is cached and playing; publish B to this same preview branch now.');
  let b: { buildId: string } | undefined;
  await expect.poll(async () => {
    const candidate = await (await request.get('/precache-inventory.json')).json();
    if (candidate.buildId !== a.buildId) b = candidate;
    return candidate.buildId;
  }, { timeout: 180_000, intervals: [3000, 5000, 10_000] }).not.toBe(a.buildId);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state), { timeout: 30_000 }).toBe('installed');
  await other.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(notice(page)).toHaveCount(0); await expect(notice(other)).toBeVisible();
  await notice(other).click(); await fresh(other); expect(await activeBuild(other)).toBe(b!.buildId);
  expect(await marker(page)).toBe('A-document'); await expect(notice(page)).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Sound effects' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click(); await page.clock.runFor(400);
  await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1); await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Restart' }).click(); await playPath(page, 'human-win', 0);
  await expect(page.getByRole('definition')).toHaveText(['1', '0', '0']); await expect(notice(page)).toBeVisible();
  await page.screenshot({ path: 'artifacts/milestone-5/hosted-update-preserves-a.png', fullPage: true });
  await notice(page).click(); await fresh(page); expect(await activeBuild(page)).toBe(b!.buildId);
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Settings' }).click(); await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Animations' })).toBeChecked(); await page.getByRole('button', { name: 'Back' }).click();
  await start(page); await expect(page.getByRole('definition')).toHaveText(['0', '0', '0']); expect(reloads).toEqual([1, 1]);
  await context.setOffline(true); await page.close(); const offline = await context.newPage();
  const responses: boolean[] = []; offline.on('response', response => responses.push(response.fromServiceWorker()));
  await prepare(offline); await start(offline, 'hard'); await playPath(offline, 'human-win', 0); await expect(offline.getByRole('status')).toHaveText('You win');
  expect(await activeBuild(offline)).toBe(b!.buildId); expect(responses.length).toBeGreaterThan(5); expect(responses.every(Boolean)).toBe(true);
  await offline.screenshot({ path: 'artifacts/milestone-5/hosted-update-offline-b.png', fullPage: true });
  await writeFile('artifacts/milestone-5/hosted-update-report.json', JSON.stringify({ origin: baseURL, builds: { a: a.buildId, b: b!.buildId }, testedAt: new Date().toISOString(),
    httpCacheDisabled: true, waitingWorkerInstalled: true, otherTabPreservedDocument: true, pendingTurnCompletedOnce: true,
    reloadsAfterConsent: reloads, defaultsRestored: true, offlineBFromWorker: responses.every(Boolean), outcome: 'You win' }, null, 2));
});
test('preview and production have separate origins, registrations and caches in one browser profile', async ({ page, context, baseURL }) => {
  const production = process.env.MILESTONE5_PRODUCTION_URL;
  test.skip(!production, 'Provide the verified production origin.');
  expect(new URL(production!).origin).not.toBe(new URL(baseURL!).origin);
  await prepare(page); const other = await context.newPage(); await other.goto(production!);
  await expect(other.locator('[data-offline-status="ready"]')).toBeVisible({ timeout: 30_000 });
  const inspect = (tab: Page) => tab.evaluate(async () => ({ origin: location.origin, controller: navigator.serviceWorker.controller?.scriptURL,
    scopes: (await navigator.serviceWorker.getRegistrations()).map(registration => registration.scope), caches: await caches.keys() }));
  const previewState = await inspect(page); const productionState = await inspect(other);
  for (const state of [previewState, productionState]) {
    expect(state.controller).toBe(`${state.origin}/sw.js`); expect(state.scopes).toEqual([`${state.origin}/`]);
    expect(state.caches.length).toBeGreaterThan(0); expect(state.caches.every(name => name.includes(`${state.origin}/`))).toBe(true);
  }
  await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile('artifacts/milestone-5/hosted-origin-isolation.json', JSON.stringify({ testedAt: new Date().toISOString(), preview: previewState, production: productionState }, null, 2));
});
