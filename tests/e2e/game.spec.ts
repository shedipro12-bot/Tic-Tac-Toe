import { expect, test } from '@playwright/test';
import { findHumanPath } from '../helpers/gameTree';
import { cell, open, playPath, screenshot, start } from '../helpers/browserGame';

test('setup, user and computer turns match the specification', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.fonts.check('800 28px "Nunito Sans"'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await screenshot(page, '01-setup');
  await start(page, 'medium');
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await screenshot(page, '02-human-turn');
  await cell(page, 0).click();
  await expect(page.getByRole('status')).toHaveText('Computer’s turn');
  await expect(cell(page, 1)).toBeDisabled();
  await screenshot(page, '03-computer-turn');
  await page.clock.runFor(399);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('status')).toHaveText('Your turn');
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
});

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  test(`${difficulty}: start and complete a human-winning game`, async ({ page }) => {
    await open(page, 0); await start(page, difficulty);
    await playPath(page, 'human-win', 0);
    await expect(page.getByRole('status')).toHaveText('You win');
    for (let index = 0; index < 9; index++) await expect(cell(page, index)).toBeDisabled();
    if (difficulty === 'hard') await screenshot(page, '04-human-win');
  });
}

for (const [outcome, label, image] of [
  ['computer-win', 'Computer wins', '05-computer-win'], ['draw', 'Draw', '06-draw'],
] as const) {
  test(`complete ${outcome} and preserve the terminal board`, async ({ page }) => {
    await open(page, 0.99); await start(page);
    await playPath(page, outcome, 0.99);
    await expect(page.getByRole('status')).toHaveText(label);
    await screenshot(page, image);
    const labels = await page.getByRole('group').getByRole('button').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
    await cell(page, 0).dispatchEvent('click');
    await page.clock.runFor(2000);
    expect(await page.getByRole('group').getByRole('button').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')))).toEqual(labels);
    await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restart' })).toHaveCount(0);
    if (outcome === 'draw') await expect(page.locator('svg line')).toHaveCount(0);
    else await expect(page.locator('svg line')).toHaveCount(1);
  });
}

test('rapid taps, occupied cells and computer-turn input cannot add extra moves', async ({ page }) => {
  await open(page); await start(page);
  await cell(page, 0).evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await cell(page, 2).dispatchEvent('click');
  await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1);
  await page.clock.runFor(400);
  await cell(page, 0).dispatchEvent('click');
  await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
});

test('internal opponent failure recovers in the same game layout', async ({ page }) => {
  await open(page); await start(page);
  await page.evaluate(() => { Math.random = () => { throw new Error('Simulated unavailable randomness'); }; });
  await cell(page, 0).click(); await page.clock.runFor(400);
  await expect(page.getByRole('status')).toHaveText('Something went wrong. Restart to try again.');
  await expect(page.getByRole('group', { name: 'Tic-Tac-Toe board' })).toBeVisible();
  await expect(cell(page, 1)).toBeDisabled();
  await screenshot(page, '07-error-recovery');
  await page.evaluate(() => { Math.random = () => 0.99; });
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('status')).toHaveText('Your turn');
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
  await expect(page.getByText('Difficulty: Hard')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible();
  await cell(page, 3).click(); await page.clock.runFor(400);
  await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
});

test('keyboard starts a game and places a mark with a visible focus indicator', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(cell(page, 0)).toBeFocused();
  expect(await cell(page, 0).evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Space');
  await expect(cell(page, 0)).toHaveAttribute('aria-label', 'Row 1, column 1: X');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`layout ${viewport.width}x${viewport.height}: readable controls, square board, no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page); await page.getByRole('button', { name: 'Start Game' }).scrollIntoViewIfNeeded();
    const action = await page.getByRole('button', { name: 'Start Game' }).boundingBox();
    expect(action!.height).toBeGreaterThanOrEqual(44);
    expect(action!.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Start Game' }).click();
    const board = await page.getByRole('group').boundingBox();
    expect(Math.abs(board!.width - board!.height)).toBeLessThan(1);
    for (let index = 0; index < 9; index++) {
      const box = await cell(page, index).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await screenshot(page, `layout-${viewport.width}x${viewport.height}`);
  });
}

test.describe('uncached font fallback', () => {
test.use({ serviceWorkers: 'block' });
test('font failure, reduced motion and refresh preserve a usable local game', async ({ page }) => {
  await page.route('**/*.woff*', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win');
  await expect(page.locator('svg line')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
});
});

test('runtime only requests local assets and writes no player storage', async ({ page }) => {
  const requests: string[] = []; const errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  expect(errors).toEqual([]);
  expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }))).toEqual({ local: 0, session: 0, cookies: '' });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistrations().then(registrations => registrations.map(registration => registration.scope)))).toEqual(['http://127.0.0.1:4173/']);
});

test.describe('touch interaction', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('tap starts and completes a game with full-sized mobile controls', async ({ page }) => {
    await open(page, 0);
    await page.getByRole('button', { name: 'Start Game' }).tap();
    for (const index of findHumanPath('human-win', 0)) {
      await cell(page, index).tap();
      await page.clock.runFor(400);
    }
    await expect(page.getByRole('status')).toHaveText('You win');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
