import type { Dispatch } from 'react';
import type { Difficulty, GameAction } from '../domain/types';
import { DifficultySelector } from './DifficultySelector';
import styles from '../../../app/App.module.css';

export function SetupPanel({ difficulty, dispatch }: { difficulty: Difficulty; dispatch: Dispatch<GameAction> }) {
  return <section className={styles.setup} aria-label="Start a match">
    <h2>Play against the computer.</h2>
    <DifficultySelector value={difficulty} onChange={value => dispatch({ type: 'SELECT_DIFFICULTY', difficulty: value })} />
    <button className={styles.primary} onClick={() => dispatch({ type: 'START_MATCH' })}>Start Game</button>
  </section>;
}
