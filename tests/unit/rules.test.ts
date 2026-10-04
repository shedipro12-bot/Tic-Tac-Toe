import { describe, expect, it } from 'vitest';
import { applyMove, emptyBoard, evaluateBoard, getLegalMoves, WINNING_LINES } from '../../src/features/game/domain/rules';
import type { Board } from '../../src/features/game/domain/types';
import { allReachableBoards, terminal } from '../helpers/gameTree';

const boards = allReachableBoards();
describe('standard game rules', () => {
  for (const mark of ['X', 'O'] as const) {
    WINNING_LINES.forEach((line, index) => it(`${mark} wins on line ${index + 1}`, () => {
      const board = boards.find(board => line.every(cell => board[cell] === mark) && terminal(board) === (mark === 'X' ? 'human-win' : 'computer-win'))!;
      const result = evaluateBoard(board);
      expect(result.outcome).toBe(mark === 'X' ? 'human-win' : 'computer-win');
      expect(result.winningLine).not.toBeNull();
      expect(result.winningLine!.every(cell => board[cell] === mark)).toBe(true);
    }));
  }
  it('checks a win before a full-board draw', () => {
    const win: Board = ['X','O','X','O','X','O','O','X','X'];
    const draw: Board = ['X','O','X','X','O','O','O','X','X'];
    expect(evaluateBoard(win).outcome).toBe('human-win');
    expect(evaluateBoard(draw)).toEqual({ outcome: 'draw', winningLine: null });
  });
  it('validates every reachable position against an independent oracle', () => {
    expect(boards).toHaveLength(5478);
    for (const board of boards) {
      expect(evaluateBoard(board).outcome).toBe(terminal(board));
      const legal = getLegalMoves(board);
      expect(legal).toEqual(terminal(board) ? [] : board.flatMap((cell, index) => cell ? [] : [index]));
    }
  });
  it('copies boards and rejects wrong turns, occupied cells and invalid indices', () => {
    const board = emptyBoard();
    const first = applyMove(board, 0, 'X');
    expect(board[0]).toBeNull(); expect(first[0]).toBe('X');
    for (const index of [-1, 9, 0.5, NaN]) expect(() => applyMove(board, index, 'X')).toThrow();
    expect(() => applyMove(board, 0, 'O')).toThrow();
    expect(() => applyMove(first, 0, 'O')).toThrow();
    expect(() => applyMove(first, 1, 'X')).toThrow();
  });
  it('rejects corrupt, unreachable and already completed boards', () => {
    expect(() => evaluateBoard(['O',null,null,null,null,null,null,null,null])).toThrow();
    expect(() => evaluateBoard(['X','X','X','O','O','O',null,null,null])).toThrow();
    const ended: Board = ['X','X','X','O','O',null,null,null,null];
    expect(() => applyMove(ended, 5, 'O')).toThrow();
  });
});
