import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { difficultyLabel } from '../domain/difficulty';
import { Board } from './Board';
import { DifficultySelector } from './DifficultySelector';
import { Scoreboard } from './Scoreboard';
import type { VisualFeedback } from '../hooks/useGameFeedback';
import styles from '../../../app/App.module.css';

export function GameScreen({ state, dispatch, feedback = null }: { state: GameState; dispatch: Dispatch<GameAction>; feedback?: VisualFeedback | null }) {
  const status = state.error ?? (state.outcome === 'human-win' ? 'You win' : state.outcome === 'computer-win' ? 'Computer wins'
    : state.outcome === 'draw' ? 'Draw' : state.phase === 'computer-turn' ? 'Computer’s turn' : 'Your turn');
  return <section className={styles.game} aria-label="Game">
    <p className={styles.difficultyCaption}>Difficulty: {difficultyLabel(state.difficulty)}</p>
    <Scoreboard scores={state.scores} />
    <h2 className={`${styles.status} ${feedback?.result ? styles.resultFeedback : ''}`} role="status" aria-live="polite" aria-atomic="true">{status}</h2>
    <Board board={state.board} locked={state.phase !== 'human-turn'} winningLine={state.winningLine}
      feedback={feedback} onMove={index => dispatch({ type: 'HUMAN_MOVE', index })} />
    <div className={styles.players}><span>You: <strong>X</strong></span><span>Computer: <strong>O</strong></span></div>
    {state.phase === 'finished' ? <div className={styles.repeatControls}>
      <DifficultySelector value={state.selectedDifficulty} nextGame
        onChange={difficulty => dispatch({ type: 'SELECT_DIFFICULTY', difficulty })} />
      <button className={styles.primary} onClick={() => dispatch({ type: 'PLAY_AGAIN' })}>Play Again</button>
    </div> : <button className={styles.primary} onClick={() => dispatch({ type: 'RESTART_MATCH' })}>Restart</button>}
  </section>;
}
