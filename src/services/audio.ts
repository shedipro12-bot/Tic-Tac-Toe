export const SOUND_FILES = {
  move: '/sounds/move-v1.mp3',
  'human-win': '/sounds/win-v1.mp3',
  'computer-win': '/sounds/loss-v1.mp3',
  draw: '/sounds/draw-v1.mp3',
} as const;
export type SoundEvent = keyof typeof SOUND_FILES;
export interface GameAudio {
  unlock(): void;
  play(event: SoundEvent): void;
  stop(): void;
  dispose(): void;
}

// Nothing is created or fetched until a user interacts with the document.
export function createGameAudio(makeAudio = (url: string) => new Audio(url)): GameAudio {
  const pool = new Map<SoundEvent, HTMLAudioElement>();
  const stop = () => {
    for (const audio of pool.values()) {
      try { audio.pause(); audio.currentTime = 0; } catch { /* Audio is optional. */ }
    }
  };
  return {
    unlock() {
      for (const [event, url] of Object.entries(SOUND_FILES)) {
        const key = event as SoundEvent;
        if (pool.has(key)) continue;
        try {
          const audio = makeAudio(url);
          audio.preload = 'auto';
          audio.volume = 0.3;
          pool.set(key, audio);
          audio.load();
        } catch { /* Unsupported audio never changes gameplay. */ }
      }
    },
    play(event) {
      const audio = pool.get(event);
      if (!audio) return;
      try {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      } catch { /* Includes unavailable media and playback restrictions. */ }
    },
    stop,
    dispose() {
      stop();
      for (const audio of pool.values()) {
        try { audio.removeAttribute('src'); audio.load(); } catch { /* Best effort. */ }
      }
      pool.clear();
    },
  };
}
