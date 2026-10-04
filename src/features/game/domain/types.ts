export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Phase = 'setup' | 'human-turn' | 'computer-turn' | 'finished' | 'error';
export type Outcome = 'human-win' | 'computer-win' | 'draw' | null;
export type WinningLine = readonly [number, number, number];
export interface GameState {
  board: Board;
  phase: Phase;
  outcome: Outcome;
  winningLine: WinningLine | null;
  selectedDifficulty: Difficulty;
  difficulty: Difficulty;
  matchId: number;
  ply: number;
  error: string | null;
}
export type GameAction =
  | { type: 'SELECT_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'START_MATCH' }
  | { type: 'HUMAN_MOVE'; index: number }
  | { type: 'COMPUTER_MOVE'; index: number; matchId: number; expectedPly: number }
  | { type: 'GAME_ERROR'; matchId: number; expectedPly: number }
  | { type: 'RECOVER_MATCH' };
