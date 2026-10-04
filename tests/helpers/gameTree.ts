import type { Board, Mark, Outcome } from '../../src/features/game/domain/types';
import { chooseComputerMove } from '../../src/features/game/domain/opponent';

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function terminal(board: Board): Outcome {
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a] === 'X' ? 'human-win' : 'computer-win';
  }
  return board.includes(null) ? null : 'draw';
}
function next(board: Board, index: number, turn: Mark): Board {
  const copy = [...board]; copy[index] = turn;
  return copy as unknown as Board;
}
export function allReachableBoards(): Board[] {
  const seen = new Map<string, Board>();
  function visit(board: Board, turn: Mark) {
    const key = JSON.stringify(board);
    if (seen.has(key)) return;
    seen.set(key, board);
    if (terminal(board)) return;
    board.forEach((cell, index) => { if (!cell) visit(next(board, index, turn), turn === 'X' ? 'O' : 'X'); });
  }
  visit([null,null,null,null,null,null,null,null,null], 'X');
  return [...seen.values()];
}
const scores = new Map<string, number>();
// Independent outcome-only oracle; no production rule or scoring functions.
export function referenceScore(board: Board, turn: Mark): number {
  const result = terminal(board);
  if (result) return result === 'computer-win' ? 1 : result === 'human-win' ? -1 : 0;
  const key = JSON.stringify(board) + turn;
  if (scores.has(key)) return scores.get(key)!;
  const values = board.flatMap((cell, index) => cell ? [] : [referenceScore(next(board, index, turn), turn === 'X' ? 'O' : 'X')]);
  const score = turn === 'O' ? Math.max(...values) : Math.min(...values);
  scores.set(key, score);
  return score;
}
export function referenceMoveScores(board: Board) {
  return board.flatMap((cell, index) => cell ? [] : [{ index, score: referenceScore(next(board, index, 'O'), 'X') }]);
}
export function findHumanPath(outcome: Exclude<Outcome, null>, randomValue: number): number[] {
  function search(board: Board, humanMoves: number[]): number[] | null {
    const result = terminal(board);
    if (result) return result === outcome ? humanMoves : null;
    for (let index = 0; index < 9; index++) {
      if (board[index]) continue;
      let updated = next(board, index, 'X');
      const moves = [...humanMoves, index];
      if (!terminal(updated)) updated = next(updated, chooseComputerMove(updated, 'hard', () => randomValue), 'O');
      const found = search(updated, moves);
      if (found) return found;
    }
    return null;
  }
  const found = search([null,null,null,null,null,null,null,null,null], []);
  if (!found) throw new Error(`No ${outcome} path for RNG ${randomValue}`);
  return found;
}
