import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../game/domain/types';
import styles from '../../app/App.module.css';

export function SettingsPanel({ settings, dispatch }: { settings: GameState['settings']; dispatch: Dispatch<GameAction> }) {
  return <section className={styles.settings} aria-label="Feedback settings">
    <Toggle label="Sound effects" enabled={settings.soundEnabled}
      onChange={enabled => dispatch({ type: 'SET_SOUND_ENABLED', enabled })} />
    <Toggle label="Animations" enabled={settings.animationsEnabled}
      onChange={enabled => dispatch({ type: 'SET_ANIMATIONS_ENABLED', enabled })} />
  </section>;
}
function Toggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <div className={styles.settingRow}>
    <span>{label}</span>
    <button type="button" role="switch" aria-label={label} aria-checked={enabled}
      className={styles.toggle} onClick={() => onChange(!enabled)}>
      <span className={styles.toggleTrack} aria-hidden="true"><span className={styles.toggleThumb} /></span>
      <span aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
    </button>
  </div>;
}
