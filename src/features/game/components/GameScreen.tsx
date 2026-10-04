import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { difficultyLabel } from '../domain/difficulty';
import { Board } from './Board';
import styles from '../../../app/App.module.css';

export function GameScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const status = state.error ?? (state.outcome === 'human-win' ? 'You win' : state.outcome === 'computer-win' ? 'Computer wins'
    : state.outcome === 'draw' ? 'Draw' : state.phase === 'computer-turn' ? 'Computer’s turn' : 'Your turn');
  return <section className={styles.game} aria-label="Game">
    <p className={styles.difficultyCaption}>Difficulty: {difficultyLabel(state.difficulty)}</p>
    <h2 className={styles.status} role="status" aria-live="polite" aria-atomic="true">{status}</h2>
    <Board board={state.board} locked={state.phase !== 'human-turn'} winningLine={state.winningLine}
      onMove={index => dispatch({ type: 'HUMAN_MOVE', index })} />
    <div className={styles.players}><span>You: <strong>X</strong></span><span>Computer: <strong>O</strong></span></div>
    {state.phase === 'error' && <button className={styles.primary} onClick={() => dispatch({ type: 'RECOVER_MATCH' })}>Restart</button>}
  </section>;
}
