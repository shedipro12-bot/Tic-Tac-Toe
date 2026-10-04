import { applyMove, emptyBoard, evaluateBoard } from './rules';
import { DIFFICULTIES } from './difficulty';
import type { GameAction, GameState, Mark } from './types';

export function createInitialState(): GameState {
  return { board: emptyBoard(), phase: 'setup', outcome: null, winningLine: null,
    selectedDifficulty: 'medium', difficulty: 'medium', matchId: 0, ply: 0, error: null };
}
function move(state: GameState, index: number, mark: Mark): GameState {
  if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index] !== null) return state;
  const board = applyMove(state.board, index, mark);
  const result = evaluateBoard(board);
  return { ...state, board, ...result, ply: state.ply + 1,
    phase: result.outcome ? 'finished' : mark === 'X' ? 'computer-turn' : 'human-turn' };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_DIFFICULTY':
      return state.phase === 'setup' && DIFFICULTIES.includes(action.difficulty) ? { ...state, selectedDifficulty: action.difficulty } : state;
    case 'START_MATCH':
      return state.phase === 'setup' ? { ...state, phase: 'human-turn', difficulty: state.selectedDifficulty, matchId: state.matchId + 1 } : state;
    case 'HUMAN_MOVE':
      return state.phase === 'human-turn' ? move(state, action.index, 'X') : state;
    case 'COMPUTER_MOVE':
      return state.phase === 'computer-turn' && action.matchId === state.matchId && action.expectedPly === state.ply ? move(state, action.index, 'O') : state;
    case 'GAME_ERROR':
      return state.phase === 'computer-turn' && action.matchId === state.matchId && action.expectedPly === state.ply
        ? { ...state, phase: 'error', error: 'Something went wrong. Restart to try again.' } : state;
    case 'RECOVER_MATCH':
      return state.phase === 'error' ? { ...state, board: emptyBoard(), phase: 'human-turn', outcome: null,
        winningLine: null, matchId: state.matchId + 1, ply: 0, error: null } : state;
  }
}
