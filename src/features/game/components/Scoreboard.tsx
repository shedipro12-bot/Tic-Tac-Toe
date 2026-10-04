import type { GameState } from '../domain/types';
import styles from '../../../app/App.module.css';

export function Scoreboard({ scores }: { scores: GameState['scores'] }) {
  return <dl className={styles.scoreboard} aria-label="Session scores">
    {(['wins', 'losses', 'draws'] as const).map(key => <div key={key} className={styles.scoreCard}>
      <dt>{key[0].toUpperCase() + key.slice(1)}</dt>
      <dd>{scores[key]}</dd>
    </div>)}
  </dl>;
}
