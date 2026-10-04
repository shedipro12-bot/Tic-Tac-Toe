import type { Difficulty } from '../domain/types';
import { DIFFICULTIES, difficultyLabel } from '../domain/difficulty';
import styles from '../../../app/App.module.css';

export function DifficultySelector({ value, onChange, nextGame = false }: {
  value: Difficulty; onChange: (value: Difficulty) => void; nextGame?: boolean;
}) {
  return <fieldset className={styles.difficulty}>
    <legend>{nextGame ? 'Next game difficulty' : 'Difficulty'}</legend>
    <div className={styles.segments}>
      {DIFFICULTIES.map(difficulty => <label key={difficulty} className={styles.segment}>
        <input type="radio" name="difficulty" value={difficulty} checked={value === difficulty} onChange={() => onChange(difficulty)} />
        <span>{difficultyLabel(difficulty)}</span>
      </label>)}
    </div>
  </fieldset>;
}
