import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameController } from '../../src/features/game/hooks/useGameController';
import { AppErrorBoundary } from '../../src/app/AppErrorBoundary';
import { render, screen, fireEvent } from '@testing-library/react';
import { chooseComputerMove } from '../../src/features/game/domain/opponent';
import { findHumanPath } from '../helpers/gameTree';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('computer controller lifecycle', () => {
  it('schedules exactly one move under StrictMode and cleans up on unmount', () => {
    const choose = vi.fn(() => 1);
    const { result, unmount } = renderHook(() => useGameController(choose), { wrapper: strict });
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(399)); expect(choose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(choose).toHaveBeenCalledTimes(1);
    expect(result.current.state.board[1]).toBe('O');
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 3 }));
    unmount(); expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000)); expect(choose).toHaveBeenCalledTimes(1);
  });
  it('pauses while hidden, retains the board and waits a new delay on return', () => {
    const choose = vi.fn(() => 1);
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { result } = renderHook(() => useGameController(choose), { wrapper: strict });
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => vi.advanceTimersByTime(200));
    visibility.mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000)); expect(choose).not.toHaveBeenCalled();
    expect(result.current.state.board[0]).toBe('X');
    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(399)); expect(choose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(choose).toHaveBeenCalledTimes(1);
  });
  it('pagehide cancels and pageshow resumes a surviving match', () => {
    const choose = vi.fn(() => 1);
    const { result } = renderHook(() => useGameController(choose));
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => window.dispatchEvent(new Event('pagehide')));
    act(() => vi.advanceTimersByTime(1000)); expect(choose).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('pageshow')));
    act(() => vi.advanceTimersByTime(400)); expect(choose).toHaveBeenCalledTimes(1);
  });
  it('recovers from a throwing opponent and cancels old pending work', () => {
    const choose = vi.fn().mockImplementationOnce(() => { throw new Error('blocked'); }).mockReturnValue(1);
    const { result } = renderHook(() => useGameController(choose));
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => vi.advanceTimersByTime(400)); expect(result.current.state.phase).toBe('error');
    act(() => result.current.dispatch({ type: 'RESTART_MATCH' }));
    expect(result.current.state.board.every(cell => cell === null)).toBe(true);
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 3 }));
    const current = result.current.state;
    act(() => result.current.dispatch({ type: 'GAME_ERROR', matchId: current.matchId, expectedPly: current.ply }));
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.dispatch({ type: 'RESTART_MATCH' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.state.ply).toBe(0); expect(choose).toHaveBeenCalledTimes(1);
  });
  it('remounts the app after an unexpected render error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    function Child() { if (fail) throw new Error('render'); return <p>Fresh session</p>; }
    render(<AppErrorBoundary><Child /></AppErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeDefined();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Start new session' }));
    expect(screen.getByText('Fresh session')).toBeDefined();
  });
  it('offers recovery when an opponent returns an illegal occupied-cell move', () => {
    const { result } = renderHook(() => useGameController(() => 0));
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.board[0]).toBe('X');
    expect(result.current.state.ply).toBe(1);
  });
  it('restart during a pending turn cancels the old timer under StrictMode', () => {
    const choose = vi.fn(() => 1);
    const { result } = renderHook(() => useGameController(choose), { wrapper: strict });
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.dispatch({ type: 'RESTART_MATCH' }));
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000)); expect(choose).not.toHaveBeenCalled();
    expect(result.current.state.ply).toBe(0);
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 3 }));
    act(() => vi.advanceTimersByTime(400));
    expect(choose).toHaveBeenCalledTimes(1); expect(result.current.state.ply).toBe(2);
  });
  it('persisted pageshow discards scores, difficulty and pending work', () => {
    const choose = vi.fn(() => 1);
    const { result } = renderHook(() => useGameController(choose), { wrapper: strict });
    act(() => result.current.dispatch({ type: 'SELECT_DIFFICULTY', difficulty: 'hard' }));
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    for (const index of findHumanPath('human-win', 0)) {
      act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index }));
      if (result.current.state.phase === 'computer-turn') {
        const state = result.current.state;
        act(() => result.current.dispatch({ type: 'COMPUTER_MOVE',
          index: chooseComputerMove(state.board, 'hard', () => 0), matchId: state.matchId, expectedPly: state.ply }));
      }
    }
    expect(result.current.state.scores.wins).toBe(1);
    act(() => result.current.dispatch({ type: 'PLAY_AGAIN' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    expect(vi.getTimerCount()).toBe(1);
    const generation = result.current.state.matchId;
    act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    expect(result.current.state.phase).toBe('setup');
    expect(result.current.state.matchId).toBeGreaterThan(generation);
    expect(result.current.state.selectedDifficulty).toBe('medium');
    expect(result.current.state.scores).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000)); expect(choose).not.toHaveBeenCalled();
  });
});
