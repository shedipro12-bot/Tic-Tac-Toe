import { chromium, expect, test } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { cell, screenshot, start } from '../helpers/browserGame';
import { findHumanPath } from '../helpers/gameTree';

test('real Chrome installation launches a standalone offline game and is removed after testing', async () => {
  test.setTimeout(45_000);
  await mkdir('.playwright', { recursive: true });
  const profile = await mkdtemp('.playwright/installed-profile-');
  // Desktop app windows require a headed browser. Keep this isolated test
  // window offscreen; never use the developer's browser profile.
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: false, args: ['--window-position=-32000,-32000'],
    baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 },
  });
  const page = context.pages()[0]; const cdp = await context.newCDPSession(page);
  const manifestId = 'http://127.0.0.1:4173/'; let installed = false;
  try {
    await context.addInitScript(() => { Math.random = () => 0; });
    await page.goto('/'); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible({ timeout: 20_000 });
    await cdp.send('PWA.install', { manifestId, installUrlOrBundleUrl: manifestId }); installed = true;
    const osState = await cdp.send('PWA.getOsAppState', { manifestId });
    // This changes the installed app's browser preference, not media emulation.
    await cdp.send('PWA.changeAppUserSettings', { manifestId, displayMode: 'standalone' });
    await context.setOffline(true);
    const newPage = context.waitForEvent('page'); const { targetId } = await cdp.send('PWA.launch', { manifestId });
    const app = await newPage; await app.waitForLoadState();
    const appCdp = await context.newCDPSession(app);
    await appCdp.send('Network.enable'); await appCdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const response = await app.reload(); expect(response?.fromServiceWorker()).toBe(true);
    expect(await app.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true);
    await expect(app.locator('[data-offline-status="ready"]')).toBeVisible();
    await start(app, 'medium');
    for (const index of findHumanPath('human-win', 0)) {
      await cell(app, index).click(); await expect(app.getByRole('status')).not.toHaveText('Computer’s turn');
    }
    await expect(app.getByRole('status')).toHaveText('You win');
    await expect(app.getByRole('definition')).toHaveText(['1', '0', '0']);
    const layouts = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await app.setViewportSize(viewport);
      expect(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const board = await app.getByRole('group', { name: 'Tic-Tac-Toe board' }).boundingBox();
      expect(Math.abs(board!.width - board!.height)).toBeLessThan(1);
      layouts.push(viewport); await screenshot(app, `installed-standalone-${viewport.width}x${viewport.height}`);
    }
    await writeFile('artifacts/milestone-5/installation-report.json', JSON.stringify({
      browser: context.browser()?.version(), manifestId, targetId, osState,
      displayMode: 'standalone', installedVia: 'PWA.install', launchedVia: 'PWA.launch',
      offlineDocumentFromServiceWorker: response?.fromServiceWorker(), outcome: 'You win', layouts,
      cleanup: 'PWA.uninstall in finally',
    }, null, 2));
  } finally {
    try { if (installed) await cdp.send('PWA.uninstall', { manifestId }); }
    finally { await context.close(); }
  }
});
