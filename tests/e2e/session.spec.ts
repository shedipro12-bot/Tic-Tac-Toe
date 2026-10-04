import { chromium, expect, test, type Page } from '@playwright/test';
import { cell, open, playPath, screenshot, start } from '../helpers/browserGame';
import { findHumanPath } from '../helpers/gameTree';

const scores = (page: Page) => page.getByRole('definition');

test('continuous win, loss, draw and changed difficulty retain accurate totals', async ({ page }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await page.getByRole('radio', { name: 'Easy', exact: true }).check();
  await expect(page.getByText('Difficulty: Hard')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('You win');
  await screenshot(page, '08-next-difficulty');
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('Difficulty: Easy')).toBeVisible();
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await expect(page.locator('svg line')).toHaveCount(0);
  await screenshot(page, '09-replay');
  await page.evaluate(() => { Math.random = () => 0.99; });
  await playPath(page, 'computer-win', 0.99);
  await expect(scores(page)).toHaveText(['1', '1', '0']);
  await page.getByRole('radio', { name: 'Medium', exact: true }).check();
  await page.getByRole('button', { name: 'Play Again' }).click();
  await playPath(page, 'draw', 0.99);
  await expect(scores(page)).toHaveText(['1', '1', '1']);
  await screenshot(page, '10-session-totals');
  await cell(page, 0).dispatchEvent('click');
  await page.clock.runFor(2000);
  await expect(scores(page)).toHaveText(['1', '1', '1']);
});

test('restart in either turn retains scores and cancels an older computer move without a dialog', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await cell(page, 0).click(); await page.clock.runFor(200);
  await expect(page.getByRole('status')).toHaveText('Computer’s turn');
  await screenshot(page, '11-before-restart');
  await page.getByRole('button', { name: 'Restart' }).evaluate(element => {
    (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click();
  });
  await expect(page.getByRole('status')).toHaveText('Your turn');
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await expect(page.getByText('Difficulty: Hard')).toBeVisible();
  await screenshot(page, '12-after-restart');
  await cell(page, 3).click(); await page.clock.runFor(400);
  await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
  expect(dialogs).toEqual([]);
});

test('refresh, closing and new documents reset scores while tabs remain independent', async ({ page, context }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  const other = await context.newPage();
  await open(other, 0); await start(other, 'medium');
  await expect(scores(other)).toHaveText(['0', '0', '0']);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await start(page);
  await expect(scores(page)).toHaveText(['0', '0', '0']);
  await playPath(page, 'human-win', 0);
  await page.close();
  const reopened = await context.newPage();
  await open(reopened, 0); await start(reopened, 'medium');
  await expect(scores(reopened)).toHaveText(['0', '0', '0']);
});

test('surviving background document retains totals and delays one pending move on return', async ({ page }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await cell(page, 0).click(); await page.clock.runFor(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(0);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(399);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
  await expect(scores(page)).toHaveText(['1', '0', '0']);
});

test('persisted pageshow event resets a live scored session and rejects pending work', async ({ page }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await cell(page, 0).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await start(page, 'medium');
  await expect(scores(page)).toHaveText(['0', '0', '0']);
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
});

test('real back-forward-cache restoration resets the same surviving document', async ({ baseURL }) => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { Math.random = () => 0; });
    await page.goto('/'); await start(page);
    for (const index of findHumanPath('human-win', 0)) {
      await cell(page, index).click();
      await expect(page.getByRole('status')).not.toHaveText('Computer’s turn');
    }
    await expect(scores(page)).toHaveText(['1', '0', '0']);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Sound effects' }).click();
    await page.getByRole('switch', { name: 'Animations' }).click();
    const marker = await page.evaluate(() => {
      const state = window as typeof window & { documentMarker?: string; restoredFromCache?: boolean };
      state.documentMarker = crypto.randomUUID();
      window.addEventListener('pageshow', event => { state.restoredFromCache = event.persisted; });
      return state.documentMarker;
    });
    await page.goto('/licenses/Nunito-Sans-OFL.txt');
    await page.goBack({ waitUntil: 'commit' });
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
    expect(await page.evaluate(() => {
      const state = window as typeof window & { documentMarker?: string; restoredFromCache?: boolean };
      return { marker: state.documentMarker, persisted: state.restoredFromCache };
    })).toEqual({ marker, persisted: true });
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Animations' })).toBeChecked();
    await page.getByRole('button', { name: 'Back' }).click();
    await start(page, 'medium');
    await expect(scores(page)).toHaveText(['0', '0', '0']);
    await screenshot(page, '13-real-history-reset');
  } finally { await browser.close(); }
});

test('error recovery retains already completed scores', async ({ page }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await page.evaluate(() => { Math.random = () => { throw new Error('Opponent failure'); }; });
  await cell(page, 0).click(); await page.clock.runFor(400);
  await expect(page.getByRole('status')).toContainText('Something went wrong');
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('status')).toHaveText('Your turn');
  await expect(scores(page)).toHaveText(['1', '0', '0']);
});

test('keyboard replay and restart with repeated replay clicks preserve one new board', async ({ page }) => {
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  const choice = page.getByRole('radio', { name: 'Hard', exact: true });
  await choice.focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play Again' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Difficulty: Medium')).toBeVisible();
  await expect(scores(page)).toHaveText(['1', '0', '0']);
  await page.getByRole('button', { name: 'Restart' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await playPath(page, 'human-win', 0);
  await page.getByRole('button', { name: 'Play Again' }).evaluate(element => {
    (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click();
  });
  await page.clock.runFor(1000);
  await expect(scores(page)).toHaveText(['2', '0', '0']);
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
});

test('multi-digit counters and result controls fit a narrow mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page, 0); await start(page);
  for (let round = 0; round < 10; round++) {
    if (round) await page.getByRole('button', { name: 'Play Again' }).click();
    await playPath(page, 'human-win', 0);
  }
  await expect(scores(page)).toHaveText(['10', '0', '0']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ['Play Again']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await screenshot(page, '14-multi-digit-narrow');
});

test.describe('touch repeat play', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('touch replay and restart preserve scores and remove a pending move', async ({ page }) => {
    await open(page, 0);
    await page.getByRole('button', { name: 'Start Game' }).tap();
    for (const index of findHumanPath('human-win', 0)) {
      await cell(page, index).tap(); await page.clock.runFor(400);
    }
    await page.getByRole('button', { name: 'Play Again' }).tap();
    await cell(page, 0).tap();
    await page.getByRole('button', { name: 'Restart' }).tap();
    await page.clock.runFor(1000);
    await expect(scores(page)).toHaveText(['1', '0', '0']);
    await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  });
});
