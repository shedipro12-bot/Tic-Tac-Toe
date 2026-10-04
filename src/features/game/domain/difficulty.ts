import type { Difficulty } from './types';
export const MISTAKE_PROBABILITY: Readonly<Record<Difficulty, number>> = { easy: 0.5, medium: 0.25, hard: 0.1 };
export const COMPUTER_DELAY_MS = 400;
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const difficultyLabel = (difficulty: Difficulty) => difficulty[0].toUpperCase() + difficulty.slice(1);
