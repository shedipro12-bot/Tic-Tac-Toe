# Tic-Tac-Toe — Milestone 3

A mobile-friendly, English-language game against a local computer opponent.
Choose Easy, Medium or Hard, press **Start Game**, and play X against O.
You always move first. All levels occasionally make mistakes, including Hard.

Press **Restart** during a match to clear the board immediately and play first
again at the same difficulty, without changing your session scores.
After a result, choose **Next game difficulty** and press **Play Again**.
Wins, Losses and Draws count completed matches once and accumulate while you play.
Restarting an unfinished match does not count a result.

Open **Settings** from setup or any game state to control **Sound effects** and
**Animations** independently. Both start On. **Back** returns to the current
game without a reset; the computer can finish its turn while Settings is open.
Short local sounds and restrained neon feedback accompany accepted moves and
results. Reduced-motion preferences suppress animations even when the toggle is
On. Audio failures never interrupt play, and disabling animations keeps the
400ms computer delay. Re-enabling feedback does not replay old events.

Scores, matches, difficulty and feedback preferences exist only in the running document's memory.
Refresh, a new document, or restoration from the browser's back-forward cache
starts a fresh session. Tabs are independent; backgrounding a surviving document
preserves it and pauses the computer timer. Game-error restart retains scores;
the top-level rendering recovery starts a fresh session.

Offline PWA support, installation and hosting belong to later milestones.

## Run locally

Use Node.js 24 LTS (verified with 24.15.0) and npm (verified with 11.12.1).
Dependencies are pinned in package.json and package-lock.json.

```sh
npm ci
npm run dev
```

The development server prints its local address. For the production preview:

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4173. This is a local preview; no public deployment is made.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright uses installed Google Chrome by default. Set `PLAYWRIGHT_CHANNEL`
to `msedge` to use installed Microsoft Edge instead. The browser runs headlessly.
The browser suite starts a production preview automatically, or reuses one that
is already running. Rebuild after changing application code before rerunning it.

Tests cover rules, all reachable boards, independently scored opponent decisions,
Hard beatability, guarded reducer actions, timer/visibility lifecycle, error
recovery, complete browser games, keyboard input and responsive layouts.
Session checks cover repeat play, exactly-once counters, difficulty capture,
restart during computer delay, fresh sessions, independent tabs and a real
back-forward-cache restoration. A dedicated Chrome launch allows that cache
and verifies both the persisted event and the original document's identity.
Feedback checks cover all four toggle combinations and all outcomes, navigation,
unchanged computer timing, reduced-motion changes, blocked/unavailable audio,
local MP3 decoding and successful real media playback in Chrome. The final suite
contains 54 unit tests and 50 browser tests.
Browser screenshots are saved in `artifacts/milestone-3/`; previous milestone
screenshots remain in `artifacts/milestone-1/` and `artifacts/milestone-2/`. A test report is
available in `playwright-report/` after the browser suite.

## Implementation boundaries

- `src/features/game/domain/`: pure rules, state transitions and local Minimax.
- `src/features/game/hooks/`: React controller and cancellable computer timer.
- `src/features/game/components/`: setup and accessible board/game views.
- `src/features/settings/`: independent feedback switches.
- `src/services/`: lazy local audio pool with safe playback and cleanup.
- `src/app/`: composition, error boundary and CSS Modules.
- `src/styles/`: global styles and design tokens.
- `public/textures/`: original, local SVG grass/wood/chalk textures.
- `public/sounds/`: four short original, versioned MP3 effects.
- `tests/`: independent game oracle, unit/lifecycle and production-browser tests.

The app stores its current match only in memory. It has no accounts, backend,
analytics, persistent player data or third-party runtime requests. Nunito Sans
is bundled locally from `@fontsource/nunito-sans`, under the SIL Open Font
License included in `public/licenses/`. Textures are created for this project;
spec images remain visual references. Sound recordings are original synthesized
tones dedicated under CC0, with provenance in `public/licenses/Sound-effects-CC0.txt`.
To regenerate them, run `python scripts/generate-sounds.py --ffmpeg /path/to/ffmpeg`
using an FFmpeg build with libmp3lame. Python and FFmpeg are optional asset-generation
tools; running or building the app needs neither.

Follow `Codex.md` and `spec/MILESTONE-3-PLAN.md`. Results and review steps are in
`spec/MILESTONE-3-REVIEW.md`. At the end of this milestone,
submit the runnable result and evidence for developer review and stop until
explicit approval. Do not begin the next milestone automatically.
