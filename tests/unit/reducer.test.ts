import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../../src/features/game/domain/reducer';
import type { GameState } from '../../src/features/game/domain/types';

const start = () => gameReducer(createInitialState(), { type: 'START_MATCH' });
describe('authoritative state transitions', () => {
  it('starts with Medium selected and captures the selected difficulty', () => {
    const setup = createInitialState(); expect(setup.phase).toBe('setup');
    const selected = gameReducer(setup, { type: 'SELECT_DIFFICULTY', difficulty: 'hard' });
    const game = gameReducer(selected, { type: 'START_MATCH' });
    expect(game.phase).toBe('human-turn'); expect(game.difficulty).toBe('hard');
    expect(game.board.every(cell => cell === null)).toBe(true);
    expect(gameReducer(game, { type: 'SELECT_DIFFICULTY', difficulty: 'easy' })).toBe(game);
    expect(gameReducer(game, { type: 'START_MATCH' })).toBe(game);
  });
  it('ignores rapid duplicate moves, computer-turn input and stale or duplicate callbacks', () => {
    const first = gameReducer(start(), { type: 'HUMAN_MOVE', index: 0 });
    expect(gameReducer(first, { type: 'HUMAN_MOVE', index: 1 })).toBe(first);
    for (const [matchId, expectedPly] of [[0,1],[1,0],[1,2]]) {
      expect(gameReducer(first, { type: 'COMPUTER_MOVE', index: 1, matchId, expectedPly })).toBe(first);
    }
    const action = { type: 'COMPUTER_MOVE' as const, index: 1, matchId: first.matchId, expectedPly: 1 };
    const second = gameReducer(first, action);
    expect(second.phase).toBe('human-turn'); expect(second.ply).toBe(2);
    expect(gameReducer(second, action)).toBe(second);
    expect(gameReducer(second, { type: 'HUMAN_MOVE', index: 0 })).toBe(second);
    for (const index of [-1, 9, 0.5, NaN]) expect(gameReducer(second, { type: 'HUMAN_MOVE', index })).toBe(second);
  });
  it('records a terminal result and locks both kinds of moves', () => {
    const state: GameState = { ...start(), board: ['X','X',null,'O','O',null,null,null,null], ply: 4 };
    const ended = gameReducer(state, { type: 'HUMAN_MOVE', index: 2 });
    expect(ended.phase).toBe('finished'); expect(ended.outcome).toBe('human-win');
    expect(gameReducer(ended, { type: 'HUMAN_MOVE', index: 6 })).toBe(ended);
    expect(gameReducer(ended, { type: 'COMPUTER_MOVE', index: 5, matchId: ended.matchId, expectedPly: ended.ply })).toBe(ended);
    expect(gameReducer(ended, { type: 'RESTART_MATCH' })).toBe(ended);
  });
  it('recovers from error and invalidates older moves and errors', () => {
    const first = gameReducer(start(), { type: 'HUMAN_MOVE', index: 0 });
    const error = gameReducer(first, { type: 'GAME_ERROR', matchId: first.matchId, expectedPly: first.ply });
    expect(error.phase).toBe('error');
    const recovered = gameReducer(error, { type: 'RESTART_MATCH' });
    expect(recovered.phase).toBe('human-turn'); expect(recovered.ply).toBe(0);
    expect(recovered.matchId).toBe(first.matchId + 1); expect(recovered.difficulty).toBe(first.difficulty);
    const next = gameReducer(recovered, { type: 'HUMAN_MOVE', index: 3 });
    expect(gameReducer(next, { type: 'COMPUTER_MOVE', index: 1, matchId: first.matchId, expectedPly: first.ply })).toBe(next);
    expect(gameReducer(next, { type: 'GAME_ERROR', matchId: first.matchId, expectedPly: first.ply })).toBe(next);
  });
});
