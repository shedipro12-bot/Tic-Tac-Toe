import { useGameController } from '../features/game/hooks/useGameController';
import { SetupPanel } from '../features/game/components/SetupPanel';
import { GameScreen } from '../features/game/components/GameScreen';
import styles from './App.module.css';

export function App() {
  const { state, dispatch } = useGameController();
  return (
    <main className={styles.shell}>
      <header className={styles.header}><h1>Tic-Tac-Toe</h1></header>
      {state.phase === 'setup'
        ? <SetupPanel difficulty={state.selectedDifficulty} dispatch={dispatch} />
        : <GameScreen state={state} dispatch={dispatch} />}
    </main>
  );
}
