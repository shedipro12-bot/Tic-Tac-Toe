import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../domain/types';
import { createGameAudio, type GameAudio } from '../../../services/audio';
import { useReducedMotion } from './useReducedMotion';

export interface VisualFeedback { matchId: number; ply: number; cells: number[]; result: boolean }

export function useGameFeedback(state: GameState, visible: boolean, gameVisible: boolean, injectedAudio?: GameAudio) {
  const [audio] = useState(() => injectedAudio ?? createGameAudio());
  const reduced = useReducedMotion();
  const animate = state.settings.animationsEnabled && !reduced && visible && gameVisible;
  const previous = useRef(state);
  const [feedback, setFeedback] = useState<VisualFeedback | null>(null);
  const expiry = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unlock = () => audio.unlock();
    const stop = () => audio.stop();
    const visibility = () => { if (document.visibilityState === 'hidden') stop(); };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
      window.clearTimeout(expiry.current);
      audio.dispose();
    };
  }, [audio]);

  useEffect(() => {
    const before = previous.current;
    // Advancing this baseline consumes each match/ply/event even when feedback is off.
    previous.current = state;
    if (!animate || state.matchId !== before.matchId) {
      window.clearTimeout(expiry.current);
      setFeedback(null);
    }
    if (!state.settings.soundEnabled || !visible || state.matchId !== before.matchId) audio.stop();
    if (state.matchId !== before.matchId || state.ply <= before.ply) return;

    const cells = state.board.flatMap((cell, index) => cell !== null && before.board[index] === null ? [index] : []);
    const result = state.outcome !== null && before.outcome === null;
    if (state.settings.soundEnabled && visible) {
      // Also handles multiple accepted moves batched into a single React commit.
      cells.forEach(() => audio.play('move'));
      if (result) audio.play(state.outcome!);
    }
    if (animate) {
      window.clearTimeout(expiry.current);
      setFeedback({ matchId: state.matchId, ply: state.ply, cells, result });
      expiry.current = window.setTimeout(() => setFeedback(null), 450);
    }
  }, [state, animate, visible, audio]);

  return animate && feedback?.matchId === state.matchId ? feedback : null;
}
