import type { Difficulty } from '../domain/types';
import { DIFFICULTIES, difficultyLabel } from '../domain/difficulty';
import styles from '../../../app/App.module.css';

export function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (value: Difficulty) => void }) {
  return <fieldset className={styles.difficulty}>
    <legend>Difficulty</legend>
    <div className={styles.segments}>
      {DIFFICULTIES.map(difficulty => <label key={difficulty} className={styles.segment}>
        <input type="radio" name="difficulty" value={difficulty} checked={value === difficulty} onChange={() => onChange(difficulty)} />
        <span>{difficultyLabel(difficulty)}</span>
      </label>)}
    </div>
  </fieldset>;
}
