import { useEffect, useRef, useState } from 'react';
import { useGameController } from '../features/game/hooks/useGameController';
import { useGameFeedback } from '../features/game/hooks/useGameFeedback';
import { SetupPanel } from '../features/game/components/SetupPanel';
import { GameScreen } from '../features/game/components/GameScreen';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import styles from './App.module.css';

export function App() {
  const { state, dispatch, visible } = useGameController();
  const [settingsOrigin, setSettingsOrigin] = useState<number | null>(null);
  // RESET_SESSION advances matchId even when Settings was opened from Setup.
  const settingsOpen = settingsOrigin !== null && !(state.phase === 'setup' && state.matchId !== settingsOrigin);
  const feedback = useGameFeedback(state, visible, !settingsOpen);
  const heading = useRef<HTMLHeadingElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (settingsOrigin !== null && state.phase === 'setup' && state.matchId !== settingsOrigin) setSettingsOrigin(null);
  }, [settingsOrigin, state.phase, state.matchId]);
  useEffect(() => {
    if (settingsOpen) heading.current?.focus();
    else if (wasOpen.current) settingsButton.current?.focus();
    wasOpen.current = settingsOpen;
  }, [settingsOpen]);
  return (
    <main className={styles.shell}>
      <header className={`${styles.header} ${settingsOpen ? styles.settingsHeader : ''}`}>
        {settingsOpen ? <>
          <button className={styles.secondary} onClick={() => setSettingsOrigin(null)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 4-6 6 6 6" /></svg>Back
          </button>
          <h1 className={styles.settingsTitle} ref={heading} tabIndex={-1}>Settings</h1>
        </> : <>
          <h1>Tic-Tac-Toe</h1>
          <button ref={settingsButton} className={styles.secondary}
            onClick={() => setSettingsOrigin(state.matchId)}>Settings</button>
        </>}
      </header>
      {settingsOpen && <SettingsPanel settings={state.settings} dispatch={dispatch} />}
      <div hidden={settingsOpen}>
        {state.phase === 'setup'
          ? <SetupPanel difficulty={state.selectedDifficulty} dispatch={dispatch} />
          : <GameScreen state={state} dispatch={dispatch} feedback={feedback} />}
      </div>
    </main>
  );
}
