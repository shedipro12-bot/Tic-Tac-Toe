import { assertValidBoard, boardKey, inspectBoard, withMark } from './rules';
import { MISTAKE_PROBABILITY } from './difficulty';
import type { Board, Difficulty, Mark } from './types';

interface Score { outcome: number; plies: number }
const memo = new Map<string, Score>();
function prefer(candidate: Score, current: Score, turn: Mark): boolean {
  if (candidate.outcome !== current.outcome) {
    return turn === 'O' ? candidate.outcome > current.outcome : candidate.outcome < current.outcome;
  }
  const losing = turn === 'O' ? candidate.outcome < 0 : candidate.outcome > 0;
  return losing ? candidate.plies > current.plies : candidate.plies < current.plies;
}
function minimax(board: Board, turn: Mark): Score {
  const result = inspectBoard(board).outcome;
  if (result) return { outcome: result === 'computer-win' ? 1 : result === 'human-win' ? -1 : 0, plies: 0 };
  const key = boardKey(board) + turn;
  const saved = memo.get(key);
  if (saved) return saved;
  let best: Score | undefined;
  board.forEach((cell, index) => {
    if (cell !== null) return;
    const next = minimax(withMark(board, index, turn), turn === 'O' ? 'X' : 'O');
    const score = { outcome: next.outcome, plies: next.plies + 1 };
    if (!best || prefer(score, best, turn)) best = score;
  });
  memo.set(key, best!);
  return best!;
}
export function scoreComputerMoves(board: Board) {
  assertValidBoard(board);
  if (inspectBoard(board).outcome || board.filter(cell => cell === 'X').length !== board.filter(cell => cell === 'O').length + 1) {
    throw new Error('Expected an unfinished computer turn');
  }
  return board.flatMap((cell, index) => {
    if (cell !== null) return [];
    const score = minimax(withMark(board, index, 'O'), 'X');
    return [{ index, outcome: score.outcome, plies: score.plies + 1 }];
  });
}
export function chooseComputerMove(board: Board, difficulty: Difficulty, rng: () => number = Math.random): number {
  const probability = MISTAKE_PROBABILITY[difficulty];
  if (probability === undefined) throw new Error('Unknown difficulty');
  const random = () => {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid RNG value');
    return value;
  };
  const moves = scoreComputerMoves(board);
  const bestOutcome = Math.max(...moves.map(move => move.outcome));
  const best = moves.filter(move => move.outcome === bestOutcome);
  const worse = moves.filter(move => move.outcome < bestOutcome);
  const mistake = random() < probability;
  let choices = mistake && worse.length ? worse : best;
  if (!mistake || !worse.length) {
    const depth = bestOutcome < 0 ? Math.max(...choices.map(move => move.plies)) : Math.min(...choices.map(move => move.plies));
    choices = choices.filter(move => move.plies === depth);
  }
  return choices[Math.floor(random() * choices.length)].index;
}
