import { expect, test, type Page } from '@playwright/test';
import { cell, open, playPath, screenshot, start } from '../helpers/browserGame';
import { findHumanPath } from '../helpers/gameTree';

const settings = (page: Page) => page.getByRole('button', { name: 'Settings', exact: true });
const sound = (page: Page) => page.getByRole('switch', { name: 'Sound effects' });
const animations = (page: Page) => page.getByRole('switch', { name: 'Animations' });
async function back(page: Page) {
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(settings(page)).toBeFocused();
}
async function inspectAudio(page: Page) {
  await page.addInitScript(() => {
    const recorded = window as typeof window & { audioEvents: string[]; audioStops: number };
    recorded.audioEvents = []; recorded.audioStops = 0;
    HTMLMediaElement.prototype.play = function () {
      recorded.audioEvents.push(this.getAttribute('src') ?? '');
      return Promise.reject(new DOMException('Blocked in test', 'NotAllowedError'));
    };
    HTMLMediaElement.prototype.pause = function () { recorded.audioStops++; };
  });
}
const audioEvents = (page: Page) => page.evaluate(() => (window as typeof window & { audioEvents: string[] }).audioEvents);
const runningAnimations = (page: Page) => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length);

test('Settings from setup: focus, independent switches and current difficulty are preserved', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'Easy', exact: true }).check();
  await settings(page).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(sound(page)).toBeChecked(); await expect(animations(page)).toBeChecked();
  await screenshot(page, '15-settings-on');
  await page.keyboard.press('Tab'); await expect(sound(page)).toBeFocused();
  await page.keyboard.press('Space'); await expect(sound(page)).not.toBeChecked();
  await expect(animations(page)).toBeChecked();
  await page.keyboard.press('Tab'); await expect(animations(page)).toBeFocused();
  await page.keyboard.press('Enter'); await expect(animations(page)).not.toBeChecked();
  await screenshot(page, '16-settings-off');
  await back(page);
  await expect(page.getByRole('radio', { name: 'Easy', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await settings(page).click();
  await expect(sound(page)).not.toBeChecked(); await expect(animations(page)).not.toBeChecked();
});

test('Settings and toggles at 200ms do not postpone the computer turn or replay feedback', async ({ page }) => {
  await inspectAudio(page); await open(page); await start(page);
  await cell(page, 0).click(); await page.clock.runFor(200);
  await settings(page).click();
  await animations(page).click();
  await sound(page).click(); await sound(page).click();
  await page.clock.runFor(199);
  const board = page.getByRole('group', { name: 'Tic-Tac-Toe board', includeHidden: true });
  await expect(board.getByRole('button', { name: /: O$/, includeHidden: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(board.getByRole('button', { name: /: O$/, includeHidden: true })).toHaveCount(1);
  const events = await audioEvents(page); expect(events).toHaveLength(2);
  await back(page);
  await expect(page.getByRole('status')).toHaveText('Your turn');
  await expect(page.getByRole('button', { name: /: X$/ })).toHaveCount(1);
  expect(await runningAnimations(page)).toBe(0);
  expect(await audioEvents(page)).toEqual(events);
  await settings(page).click(); await animations(page).click(); await back(page);
  expect(await runningAnimations(page)).toBe(0);
  await screenshot(page, '17-return-current-game');
});

test('computer completes a result in Settings; return keeps scores and static result without replay', async ({ page }) => {
  await inspectAudio(page); await open(page); await start(page);
  const path = findHumanPath('computer-win', 0.99);
  for (const index of path.slice(0, -1)) { await cell(page, index).click(); await page.clock.runFor(400); }
  await cell(page, path.at(-1)!).click();
  await settings(page).click(); await page.clock.runFor(400);
  const events = await audioEvents(page);
  expect(events.filter(event => event.endsWith('loss-v1.mp3'))).toHaveLength(1);
  await back(page);
  await expect(page.getByRole('status')).toHaveText('Computer wins');
  await expect(page.getByRole('definition')).toHaveText(['0', '1', '0']);
  await expect(page.locator('svg line')).toHaveCount(1);
  expect(await runningAnimations(page)).toBe(0); expect(await audioEvents(page)).toEqual(events);
  await screenshot(page, '18-result-during-settings');
});

for (const soundOn of [false, true]) for (const animationOn of [false, true]) {
  for (const outcome of ['human-win', 'computer-win', 'draw'] as const) {
    test(`sound ${soundOn}, animations ${animationOn}: full ${outcome} and replay`, async ({ page }) => {
      const random = outcome === 'human-win' ? 0 : 0.99;
      await inspectAudio(page); await open(page, random);
      await settings(page).click();
      if (!soundOn) await sound(page).click();
      if (!animationOn) await animations(page).click();
      if (outcome === 'draw') await screenshot(page, `settings-sound-${soundOn}-animations-${animationOn}`);
      await back(page); await start(page);
      await cell(page, findHumanPath(outcome, random)[0]).click();
      await expect.poll(() => runningAnimations(page)).toBe(animationOn ? 1 : 0);
      await page.clock.runFor(400);
      for (const index of findHumanPath(outcome, random).slice(1)) {
        await cell(page, index).click(); await page.clock.runFor(400);
      }
      await expect(page.getByRole('status')).toHaveText(outcome === 'human-win' ? 'You win' : outcome === 'computer-win' ? 'Computer wins' : 'Draw');
      await expect(page.getByRole('definition')).toHaveText(outcome === 'human-win' ? ['1', '0', '0'] : outcome === 'computer-win' ? ['0', '1', '0'] : ['0', '0', '1']);
      await expect(page.locator('svg line')).toHaveCount(outcome === 'draw' ? 0 : 1);
      const events = await audioEvents(page);
      if (soundOn) {
        const marks = await page.getByRole('button', { name: /: [XO]$/ }).count();
        expect(events).toHaveLength(marks + 1);
        expect(events.filter(event => event.endsWith(outcome === 'human-win' ? 'win-v1.mp3' : outcome === 'computer-win' ? 'loss-v1.mp3' : 'draw-v1.mp3'))).toHaveLength(1);
      } else expect(events).toEqual([]);
      await settings(page).click();
      await expect(sound(page)).toBeChecked({ checked: soundOn });
      await expect(animations(page)).toBeChecked({ checked: animationOn });
      await back(page); expect(await audioEvents(page)).toEqual(events);
      await page.getByRole('button', { name: 'Play Again' }).click();
      await settings(page).click();
      await expect(sound(page)).toBeChecked({ checked: soundOn });
      await expect(animations(page)).toBeChecked({ checked: animationOn });
      await back(page); await page.getByRole('button', { name: 'Restart' }).click();
      await settings(page).click();
      await expect(sound(page)).toBeChecked({ checked: soundOn });
      await expect(animations(page)).toBeChecked({ checked: animationOn });
    });
  }
}

test('changing reduced motion stops a live animation; reversal does not replay it', async ({ page }) => {
  await open(page); await start(page);
  await cell(page, 0).click(); expect(await runningAnimations(page)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => runningAnimations(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await runningAnimations(page)).toBe(0);
  await page.clock.runFor(400);
  expect(await runningAnimations(page)).toBe(1);
  await page.getByRole('button', { name: 'Restart' }).click();
  expect(await runningAnimations(page)).toBe(0);
});

test.describe('uncached feedback fallback', () => {
test.use({ serviceWorkers: 'block' });
test('missing font and sounds, initial reduced motion and unavailable audio preserve navigation and results', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*.woff*', route => route.abort());
  await page.route('**/sounds/*.mp3', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 0); await start(page);
  await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win');
  await expect(page.locator('svg line')).toHaveCount(1); expect(await runningAnimations(page)).toBe(0);
  await settings(page).click(); await expect(sound(page)).toBeChecked();
  await screenshot(page, '19-font-audio-fallback'); await back(page);
  expect(errors).toEqual([]);
  await page.addInitScript(() => { window.Audio = function () { throw new Error('No audio'); } as unknown as typeof Audio; });
  await page.reload(); await start(page); await playPath(page, 'human-win', 0);
  await expect(page.getByRole('status')).toHaveText('You win'); expect(errors).toEqual([]);
});
});

test('internal error allows Settings and returns to the same recoverable board', async ({ page }) => {
  await open(page); await start(page);
  await page.evaluate(() => { Math.random = () => { throw new Error('Opponent failure'); }; });
  await cell(page, 0).click(); await page.clock.runFor(400);
  await settings(page).click(); await sound(page).click(); await back(page);
  await expect(page.getByRole('status')).toContainText('Something went wrong');
  await expect(cell(page, 0)).toHaveAttribute('aria-label', 'Row 1, column 1: X');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('button', { name: /empty$/ })).toHaveCount(9);
});

test('refresh and persisted reset from Settings restore defaults; tabs and ordinary pageshow preserve their own preferences', async ({ page, context }) => {
  await open(page); await settings(page).click(); await sound(page).click(); await animations(page).click();
  const other = await context.newPage(); await open(other); await settings(other).click();
  await expect(sound(other)).toBeChecked(); await expect(animations(other)).toBeChecked();
  await expect(sound(page)).not.toBeChecked();
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new PageTransitionEvent('pageshow')); });
  await expect(sound(page)).not.toBeChecked();
  await page.reload(); await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  await settings(page).click(); await expect(sound(page)).toBeChecked(); await expect(animations(page)).toBeChecked();
  await sound(page).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  await start(page); await expect(page.getByRole('status')).toHaveText('Your turn');
  await settings(page).click(); await expect(sound(page)).toBeChecked(); await expect(animations(page)).toBeChecked();
});

test('all four bundled MP3 files decode to short, non-silent audio', async ({ page }) => {
  await open(page);
  const decoded = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      return await Promise.all(['move', 'win', 'loss', 'draw'].map(async name => {
        const response = await fetch(`/sounds/${name}-v1.mp3`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        return { name, ok: response.ok, duration: buffer.duration,
          peak: Math.max(...buffer.getChannelData(0).map(sample => Math.abs(sample))) };
      }));
    } finally { await context.close(); }
  });
  for (const recording of decoded) {
    expect(recording.ok).toBe(true); expect(recording.duration).toBeGreaterThan(0.08);
    expect(recording.duration).toBeLessThan(1); expect(recording.peak).toBeGreaterThan(0.01); expect(recording.peak).toBeLessThan(1);
  }
});

test('real media playback succeeds after interaction; mute stops the pool and suppresses future moves', async ({ page }) => {
  await page.addInitScript(() => {
    const recorded = window as typeof window & { startedSounds: string[]; stoppedSounds: number };
    recorded.startedSounds = []; recorded.stoppedSounds = 0;
    const originalPlay = HTMLMediaElement.prototype.play;
    const originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      const source = this.getAttribute('src') ?? '';
      return originalPlay.call(this).then(() => { recorded.startedSounds.push(source); });
    };
    HTMLMediaElement.prototype.pause = function () { recorded.stoppedSounds++; originalPause.call(this); };
  });
  await open(page); await start(page); await cell(page, 0).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { startedSounds: string[] }).startedSounds.length)).toBe(1);
  await settings(page).click();
  const stops = await page.evaluate(() => (window as typeof window & { stoppedSounds: number }).stoppedSounds);
  await sound(page).click();
  expect(await page.evaluate(() => (window as typeof window & { stoppedSounds: number }).stoppedSounds)).toBeGreaterThan(stops);
  await page.clock.runFor(400); await back(page);
  await cell(page, 1).click(); await page.clock.runFor(400);
  expect(await page.evaluate(() => (window as typeof window & { startedSounds: string[] }).startedSounds.length)).toBe(1);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`Settings layout ${viewport.width}x${viewport.height}: readable targets and no overflow`, async ({ page }) => {
    await page.setViewportSize(viewport); await open(page); await settings(page).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of [sound(page), animations(page), page.getByRole('button', { name: 'Back' })]) {
      const bounds = await control.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44); expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    const color = await sound(page).evaluate(element => ({ text: getComputedStyle(element).color,
      background: getComputedStyle(element.closest('main')!).backgroundColor }));
    expect(color).toEqual({ text: 'rgb(23, 62, 53)', background: 'rgb(245, 236, 205)' });
    await screenshot(page, `settings-layout-${viewport.width}x${viewport.height}`);
  });
}

test.describe('touch feedback settings', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('tap controls each preference independently and returns to the game', async ({ page }) => {
    await open(page); await page.getByRole('button', { name: 'Start Game' }).tap();
    await settings(page).tap(); await sound(page).tap(); await expect(sound(page)).not.toBeChecked();
    await expect(animations(page)).toBeChecked(); await animations(page).tap();
    await page.getByRole('button', { name: 'Back' }).tap();
    await cell(page, 0).tap(); await page.clock.runFor(400);
    await expect(page.getByRole('button', { name: /: O$/ })).toHaveCount(1);
    expect(await runningAnimations(page)).toBe(0);
  });
});
