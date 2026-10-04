import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../../src/features/game/domain/reducer';
import { chooseComputerMove } from '../../src/features/game/domain/opponent';
import type { GameAction, GameState, Outcome } from '../../src/features/game/domain/types';
import { findHumanPath } from '../helpers/gameTree';

function finish(state: GameState, outcome: Exclude<Outcome, null>, random: number) {
  let current = state;
  let lastAction: GameAction = { type: 'START_MATCH' };
  for (const index of findHumanPath(outcome, random)) {
    lastAction = { type: 'HUMAN_MOVE', index };
    current = gameReducer(current, lastAction);
    if (current.phase === 'computer-turn') {
      lastAction = { type: 'COMPUTER_MOVE', index: chooseComputerMove(current.board, current.difficulty, () => random),
        matchId: current.matchId, expectedPly: current.ply };
      current = gameReducer(current, lastAction);
    }
  }
  expect(current.outcome).toBe(outcome);
  return { state: current, lastAction };
}
const begin = () => gameReducer(gameReducer(createInitialState(), { type: 'SELECT_DIFFICULTY', difficulty: 'hard' }), { type: 'START_MATCH' });

describe('repeat play and temporary scores', () => {
  it('counts a win, loss and draw exactly once and accumulates across replay', () => {
    let game = begin();
    const totals = [{ wins: 1, losses: 0, draws: 0 }, { wins: 1, losses: 1, draws: 0 }, { wins: 1, losses: 1, draws: 1 }];
    const outcomes = ['human-win', 'computer-win', 'draw'] as const;
    outcomes.forEach((outcome, index) => {
      const previous = game;
      const result = finish(game, outcome, index === 0 ? 0 : 0.99);
      expect(result.state.scores).toEqual(totals[index]);
      expect(gameReducer(result.state, result.lastAction)).toBe(result.state);
      expect(previous.scores).not.toBe(result.state.scores);
      expect(gameReducer(result.state, { type: 'RESTART_MATCH' })).toBe(result.state);
      game = gameReducer(result.state, { type: 'PLAY_AGAIN' });
      expect(game.scores).toEqual(totals[index]);
      expect(game.phase).toBe('human-turn'); expect(game.ply).toBe(0);
      expect(game.winningLine).toBeNull(); expect(game.outcome).toBeNull();
      expect(gameReducer(game, { type: 'PLAY_AGAIN' })).toBe(game);
    });
  });
  it('keeps the active difficulty separate from the next selection', () => {
    const won = finish(begin(), 'human-win', 0).state;
    const selected = gameReducer(won, { type: 'SELECT_DIFFICULTY', difficulty: 'easy' });
    expect(selected.difficulty).toBe('hard'); expect(selected.selectedDifficulty).toBe('easy');
    expect(selected.board).toBe(won.board); expect(selected.scores).toBe(won.scores);
    const replay = gameReducer(selected, { type: 'PLAY_AGAIN' });
    expect(replay.difficulty).toBe('easy');
    expect(gameReducer(replay, { type: 'SELECT_DIFFICULTY', difficulty: 'medium' })).toBe(replay);
    const restarted = gameReducer(gameReducer(replay, { type: 'HUMAN_MOVE', index: 0 }), { type: 'RESTART_MATCH' });
    expect(restarted.difficulty).toBe('easy'); expect(restarted.scores).toEqual(won.scores);
  });
  it('abandons an unfinished match without scoring or accepting stale actions', () => {
    const old = gameReducer(begin(), { type: 'HUMAN_MOVE', index: 0 });
    const restarted = gameReducer(old, { type: 'RESTART_MATCH' });
    const repeated = gameReducer(restarted, { type: 'RESTART_MATCH' });
    expect(repeated.board.every(cell => cell === null)).toBe(true);
    expect(repeated.scores).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(repeated.phase).toBe('human-turn');
    const next = gameReducer(repeated, { type: 'HUMAN_MOVE', index: 3 });
    expect(gameReducer(next, { type: 'COMPUTER_MOVE', index: 1, matchId: old.matchId, expectedPly: old.ply })).toBe(next);
    expect(gameReducer(next, { type: 'GAME_ERROR', matchId: old.matchId, expectedPly: old.ply })).toBe(next);
    const setup = createInitialState();
    expect(gameReducer(setup, { type: 'RESTART_MATCH' })).toBe(setup);
    expect(gameReducer(setup, { type: 'PLAY_AGAIN' })).toBe(setup);
  });
  it('counts a full-board win as a win and not a draw', () => {
    const state: GameState = { ...begin(), board: ['X','O','X','O','X','O','O','X',null], ply: 8 };
    const ended = gameReducer(state, { type: 'HUMAN_MOVE', index: 8 });
    expect(ended.scores).toEqual({ wins: 1, losses: 0, draws: 0 });
  });
  it('preserves accumulated scores through a game error and restart', () => {
    const won = finish(begin(), 'human-win', 0).state;
    const playing = gameReducer(gameReducer(won, { type: 'PLAY_AGAIN' }), { type: 'HUMAN_MOVE', index: 0 });
    const error = gameReducer(playing, { type: 'GAME_ERROR', matchId: playing.matchId, expectedPly: playing.ply });
    const restarted = gameReducer(error, { type: 'RESTART_MATCH' });
    expect(restarted.scores).toEqual({ wins: 1, losses: 0, draws: 0 });
    expect(restarted.difficulty).toBe('hard'); expect(restarted.error).toBeNull();
  });
  it('resets a session to defaults without reusing an old match generation', () => {
    const old = finish(begin(), 'human-win', 0).state;
    const reset = gameReducer(old, { type: 'RESET_SESSION' });
    expect(reset).toEqual({ ...createInitialState(), matchId: old.matchId + 1 });
    const next = gameReducer(gameReducer(reset, { type: 'START_MATCH' }), { type: 'HUMAN_MOVE', index: 0 });
    expect(gameReducer(next, { type: 'COMPUTER_MOVE', index: 1, matchId: old.matchId, expectedPly: next.ply })).toBe(next);
  });
});
