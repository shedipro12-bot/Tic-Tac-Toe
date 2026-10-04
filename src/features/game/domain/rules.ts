import type { Board, Cell, Mark, Outcome, WinningLine } from './types';

export const WINNING_LINES: readonly WinningLine[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];
export const emptyBoard = (): Board => [null, null, null, null, null, null, null, null, null];
export const boardKey = (board: readonly Cell[]) => board.map(cell => cell ?? '-').join('');

// Internal search helpers operate on successors of already validated boards.
export function inspectBoard(board: Board): { outcome: Outcome; winningLine: WinningLine | null } {
  for (const line of WINNING_LINES) {
    const mark = board[line[0]];
    if (mark && line.every(index => board[index] === mark)) {
      return { outcome: mark === 'X' ? 'human-win' : 'computer-win', winningLine: line };
    }
  }
  return { outcome: board.every(Boolean) ? 'draw' : null, winningLine: null };
}
export function withMark(board: Board, index: number, mark: Mark): Board {
  return board.map((cell, position) => position === index ? mark : cell) as unknown as Board;
}

let reachable: Set<string> | undefined;
function reachableBoards(): Set<string> {
  if (reachable) return reachable;
  const states = new Set<string>();
  function visit(board: Board, turn: Mark) {
    const key = boardKey(board);
    if (states.has(key)) return;
    states.add(key);
    if (inspectBoard(board).outcome) return;
    board.forEach((cell, index) => {
      if (cell === null) visit(withMark(board, index, turn), turn === 'X' ? 'O' : 'X');
    });
  }
  visit(emptyBoard(), 'X');
  reachable = states;
  return states;
}
export function assertValidBoard(board: Board): void {
  if (!Array.isArray(board) || board.length !== 9 ||
    !board.every(cell => cell === null || cell === 'X' || cell === 'O') ||
    !reachableBoards().has(boardKey(board))) {
    throw new Error('Unreachable game board');
  }
}
export function evaluateBoard(board: Board) {
  assertValidBoard(board);
  return inspectBoard(board);
}
export function getLegalMoves(board: Board): readonly number[] {
  assertValidBoard(board);
  if (inspectBoard(board).outcome) return [];
  return board.flatMap((cell, index) => cell === null ? [index] : []);
}
export function applyMove(board: Board, index: number, mark: Mark): Board {
  assertValidBoard(board);
  const x = board.filter(cell => cell === 'X').length;
  const o = board.filter(cell => cell === 'O').length;
  if (inspectBoard(board).outcome || !Number.isInteger(index) || index < 0 || index > 8 ||
    board[index] !== null || mark !== (x === o ? 'X' : 'O')) throw new Error('Illegal move');
  return withMark(board, index, mark);
}
