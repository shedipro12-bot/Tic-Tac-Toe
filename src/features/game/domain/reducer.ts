import { applyMove, emptyBoard, evaluateBoard } from './rules';
import { DIFFICULTIES } from './difficulty';
import type { Difficulty, GameAction, GameState, Mark } from './types';

export function createInitialState(): GameState {
  return { board: emptyBoard(), phase: 'setup', outcome: null, winningLine: null,
    selectedDifficulty: 'medium', difficulty: 'medium', matchId: 0, ply: 0, error: null,
    scores: { wins: 0, losses: 0, draws: 0 } };
}
function newMatch(state: GameState, difficulty: Difficulty): GameState {
  return { ...state, board: emptyBoard(), phase: 'human-turn', outcome: null, winningLine: null,
    difficulty, matchId: state.matchId + 1, ply: 0, error: null };
}
function move(state: GameState, index: number, mark: Mark): GameState {
  if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index] !== null) return state;
  const board = applyMove(state.board, index, mark);
  const result = evaluateBoard(board);
  const counter = result.outcome === 'human-win' ? 'wins' : result.outcome === 'computer-win' ? 'losses' : 'draws';
  const scores = result.outcome ? { ...state.scores, [counter]: state.scores[counter] + 1 } : state.scores;
  return { ...state, board, ...result, scores, ply: state.ply + 1,
    phase: result.outcome ? 'finished' : mark === 'X' ? 'computer-turn' : 'human-turn' };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_DIFFICULTY':
      return (state.phase === 'setup' || state.phase === 'finished') && DIFFICULTIES.includes(action.difficulty)
        ? { ...state, selectedDifficulty: action.difficulty } : state;
    case 'START_MATCH':
      return state.phase === 'setup' ? newMatch(state, state.selectedDifficulty) : state;
    case 'HUMAN_MOVE':
      return state.phase === 'human-turn' ? move(state, action.index, 'X') : state;
    case 'COMPUTER_MOVE':
      return state.phase === 'computer-turn' && action.matchId === state.matchId && action.expectedPly === state.ply ? move(state, action.index, 'O') : state;
    case 'GAME_ERROR':
      return state.phase === 'computer-turn' && action.matchId === state.matchId && action.expectedPly === state.ply
        ? { ...state, phase: 'error', error: 'Something went wrong. Restart to try again.' } : state;
    case 'RESTART_MATCH':
      return state.phase === 'human-turn' || state.phase === 'computer-turn' || state.phase === 'error'
        ? newMatch(state, state.difficulty) : state;
    case 'PLAY_AGAIN':
      return state.phase === 'finished' ? newMatch(state, state.selectedDifficulty) : state;
    case 'RESET_SESSION':
      // A fresh generation also rejects callbacks captured before bfcache restoration.
      return { ...createInitialState(), matchId: state.matchId + 1 };
  }
}
