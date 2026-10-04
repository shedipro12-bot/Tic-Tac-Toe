import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, gameReducer } from '../../src/features/game/domain/reducer';
import { useGameController } from '../../src/features/game/hooks/useGameController';
import { useGameFeedback } from '../../src/features/game/hooks/useGameFeedback';
import { createGameAudio, SOUND_FILES, type GameAudio } from '../../src/services/audio';
import { App } from '../../src/app/App';
import { chooseComputerMove } from '../../src/features/game/domain/opponent';
import { findHumanPath } from '../helpers/gameTree';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
const audioMock = (): GameAudio => ({ unlock: vi.fn(), play: vi.fn(), stop: vi.fn(), dispose: vi.fn() });
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('feedback preferences and timing', () => {
  it('keeps settings independent, preserves them on replacement matches and resets a session', () => {
    let state = createInitialState();
    expect(state.settings).toEqual({ soundEnabled: true, animationsEnabled: true });
    state = gameReducer(state, { type: 'START_MATCH' });
    const board = state.board;
    state = gameReducer(state, { type: 'SET_SOUND_ENABLED', enabled: false });
    expect(state.settings).toEqual({ soundEnabled: false, animationsEnabled: true });
    state = gameReducer(state, { type: 'SET_ANIMATIONS_ENABLED', enabled: false });
    expect(state.board).toBe(board); expect(state.ply).toBe(0); expect(state.phase).toBe('human-turn');
    state = gameReducer(state, { type: 'RESTART_MATCH' });
    expect(state.settings).toEqual({ soundEnabled: false, animationsEnabled: false });
    state = gameReducer({ ...state, phase: 'finished' }, { type: 'PLAY_AGAIN' });
    expect(state.settings).toEqual({ soundEnabled: false, animationsEnabled: false });
    expect(gameReducer(state, { type: 'RESET_SESSION' }).settings).toEqual({ soundEnabled: true, animationsEnabled: true });
  });
  it('changing both preferences at 200ms leaves exactly one computer move at 400ms', () => {
    const choose = vi.fn(() => 1);
    const { result } = renderHook(() => useGameController(choose), { wrapper: strict });
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index: 0 }));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.dispatch({ type: 'SET_SOUND_ENABLED', enabled: false }));
    act(() => result.current.dispatch({ type: 'SET_ANIMATIONS_ENABLED', enabled: false }));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(199)); expect(choose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(choose).toHaveBeenCalledTimes(1);
  });
  it('consumes accepted moves once under StrictMode, including terminal move and result', () => {
    const audio = audioMock();
    const { result } = renderHook(() => {
      const game = useGameController();
      return { ...game, feedback: useGameFeedback(game.state, game.visible, true, audio) };
    }, { wrapper: strict });
    act(() => document.dispatchEvent(new Event('pointerdown')));
    expect(audio.unlock).toHaveBeenCalledTimes(1);
    act(() => result.current.dispatch({ type: 'START_MATCH' }));
    act(() => result.current.dispatch({ type: 'SELECT_DIFFICULTY', difficulty: 'hard' }));
    for (const index of findHumanPath('human-win', 0)) {
      act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index }));
      act(() => result.current.dispatch({ type: 'HUMAN_MOVE', index }));
      if (result.current.state.phase === 'computer-turn') {
        const state = result.current.state;
        act(() => result.current.dispatch({ type: 'COMPUTER_MOVE', index: chooseComputerMove(state.board, state.difficulty, () => 0),
          matchId: state.matchId, expectedPly: state.ply }));
      }
    }
    expect(result.current.state.outcome).toBe('human-win');
    expect(vi.mocked(audio.play).mock.calls.filter(([event]) => event === 'move')).toHaveLength(result.current.state.ply);
    expect(vi.mocked(audio.play).mock.calls.filter(([event]) => event === 'human-win')).toHaveLength(1);
    expect(result.current.feedback?.result).toBe(true);
    const count = vi.mocked(audio.play).mock.calls.length;
    act(() => result.current.dispatch({ type: 'SET_SOUND_ENABLED', enabled: false }));
    act(() => result.current.dispatch({ type: 'SET_SOUND_ENABLED', enabled: true }));
    expect(audio.play).toHaveBeenCalledTimes(count);
    act(() => result.current.dispatch({ type: 'PLAY_AGAIN' }));
    expect(result.current.feedback).toBeNull();
    expect(audio.stop).toHaveBeenCalled();
  });
  it('does not replay moves when returning from Settings or enabling feedback', () => {
    const audio = audioMock();
    let state = gameReducer(createInitialState(), { type: 'START_MATCH' });
    const { result, rerender } = renderHook(({ gameVisible }) => useGameFeedback(state, true, gameVisible, audio),
      { initialProps: { gameVisible: true } });
    state = gameReducer(state, { type: 'HUMAN_MOVE', index: 0 });
    rerender({ gameVisible: true }); expect(result.current?.cells).toEqual([0]);
    rerender({ gameVisible: false }); expect(result.current).toBeNull();
    state = gameReducer(state, { type: 'COMPUTER_MOVE', index: 1, matchId: state.matchId, expectedPly: state.ply });
    rerender({ gameVisible: false });
    expect(audio.play).toHaveBeenCalledTimes(2);
    rerender({ gameVisible: true }); expect(result.current).toBeNull();
    expect(audio.play).toHaveBeenCalledTimes(2);
    state = gameReducer(state, { type: 'SET_SOUND_ENABLED', enabled: false });
    state = gameReducer(state, { type: 'SET_ANIMATIONS_ENABLED', enabled: false });
    rerender({ gameVisible: true });
    state = gameReducer(state, { type: 'HUMAN_MOVE', index: 3 });
    rerender({ gameVisible: true });
    state = gameReducer(state, { type: 'SET_SOUND_ENABLED', enabled: true });
    state = gameReducer(state, { type: 'SET_ANIMATIONS_ENABLED', enabled: true });
    rerender({ gameVisible: true });
    expect(result.current).toBeNull(); expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it('stops live feedback when the OS requests reduced motion and does not replay on reversal', () => {
    const media = new EventTarget() as MediaQueryList;
    Object.defineProperty(media, 'matches', { value: false, writable: true });
    vi.stubGlobal('matchMedia', () => media);
    let state = gameReducer(createInitialState(), { type: 'START_MATCH' });
    const { result, rerender } = renderHook(() => useGameFeedback(state, true, true, audioMock()));
    state = gameReducer(state, { type: 'HUMAN_MOVE', index: 0 });
    rerender(); expect(result.current).not.toBeNull();
    act(() => { Object.defineProperty(media, 'matches', { value: true }); media.dispatchEvent(new Event('change')); });
    expect(result.current).toBeNull();
    act(() => { Object.defineProperty(media, 'matches', { value: false }); media.dispatchEvent(new Event('change')); });
    expect(result.current).toBeNull();
  });
  it('stops on pagehide, hidden visibility and unmount', () => {
    const audio = audioMock();
    const { unmount } = renderHook(() => useGameFeedback(createInitialState(), true, true, audio));
    act(() => window.dispatchEvent(new Event('pagehide')));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(audio.stop).toHaveBeenCalledTimes(2);
    unmount(); expect(audio.dispose).toHaveBeenCalledTimes(1);
  });
  it('persisted restoration closes Settings even from Setup and the next match stays visible', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Sound effects' }));
    act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(screen.getByRole('status').textContent).toBe('Your turn');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('switch', { name: 'Sound effects' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('local audio service', () => {
  it('initializes once after a gesture, catches rejection, stops and disposes the pool', async () => {
    const players: Array<{ load: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; removeAttribute: ReturnType<typeof vi.fn>; currentTime: number }> = [];
    const factory = vi.fn(() => {
      const player = { load: vi.fn(), play: vi.fn().mockRejectedValue(new Error('NotAllowedError')), pause: vi.fn(), removeAttribute: vi.fn(), currentTime: 4 };
      players.push(player); return player as unknown as HTMLAudioElement;
    });
    const audio = createGameAudio(factory);
    audio.play('move'); expect(factory).not.toHaveBeenCalled();
    audio.unlock(); audio.unlock(); expect(factory).toHaveBeenCalledTimes(Object.keys(SOUND_FILES).length);
    audio.play('move'); await Promise.resolve();
    expect(players[0].play).toHaveBeenCalledTimes(1); expect(players[0].currentTime).toBe(0);
    audio.stop(); expect(players.every(player => player.pause.mock.calls.length === 1)).toBe(true);
    audio.dispose(); expect(players.every(player => player.removeAttribute.mock.calls.length === 1)).toBe(true);
    audio.play('move'); expect(players[0].play).toHaveBeenCalledTimes(1);
  });
  it('tolerates unsupported construction, throwing playback and broken media cleanup', () => {
    const unsupported = createGameAudio(() => { throw new Error('Unsupported audio'); });
    expect(() => { unsupported.unlock(); unsupported.play('move'); unsupported.dispose(); }).not.toThrow();
    const player = { load() {}, play() { throw new Error('No decoder'); }, pause() { throw new Error('Broken media'); }, removeAttribute() {} };
    const audio = createGameAudio(() => player as unknown as HTMLAudioElement);
    audio.unlock(); expect(() => { audio.play('move'); audio.stop(); audio.dispose(); }).not.toThrow();
  });
});
