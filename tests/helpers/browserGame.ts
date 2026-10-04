import { expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { findHumanPath } from './gameTree';
import type { Difficulty, Outcome } from '../../src/features/game/domain/types';

export const cell = (page: Page, index: number) => page.getByRole('group', { name: 'Tic-Tac-Toe board' }).getByRole('button').nth(index);
export async function screenshot(page: Page, name: string) {
  await mkdir('artifacts/milestone-2', { recursive: true });
  await page.screenshot({ path: `artifacts/milestone-2/${name}.png`, fullPage: true });
}
export async function open(page: Page, randomValue = 0.99) {
  await page.addInitScript(value => { Math.random = () => value; }, randomValue);
  await page.clock.install({ time: new Date('2026-10-05T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-05T00:00:01Z'));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
}
export async function start(page: Page, difficulty: Difficulty = 'hard') {
  await page.getByRole('radio', { name: difficulty, exact: false }).check();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByRole('status')).toHaveText('Your turn');
}
export async function playPath(page: Page, target: Exclude<Outcome, null>, randomValue: number) {
  for (const index of findHumanPath(target, randomValue)) {
    await cell(page, index).click();
    await page.clock.runFor(400);
  }
}
