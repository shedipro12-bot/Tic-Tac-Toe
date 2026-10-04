import { useEffect, useReducer, useState } from 'react';
import { gameReducer, createInitialState } from '../domain/reducer';
import { chooseComputerMove } from '../domain/opponent';
import { COMPUTER_DELAY_MS } from '../domain/difficulty';

export function useGameController(chooseMove = chooseComputerMove) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    const hide = () => setVisible(false);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', visibility);
    };
  }, []);
  useEffect(() => {
    if (state.phase !== 'computer-turn' || !visible) return;
    const { board, difficulty, matchId, ply } = state;
    const timer = window.setTimeout(() => {
      try {
        const index = chooseMove(board, difficulty, Math.random);
        if (!Number.isInteger(index) || index < 0 || index > 8 || board[index] !== null) {
          throw new Error('Illegal computer move');
        }
        dispatch({ type: 'COMPUTER_MOVE', index, matchId, expectedPly: ply });
      } catch {
        dispatch({ type: 'GAME_ERROR', matchId, expectedPly: ply });
      }
    }, COMPUTER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, visible, chooseMove]);
  return { state, dispatch };
}
