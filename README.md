# Tic-Tac-Toe — Milestone 4

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

After the first successful online visit, wait for **Ready to play offline**.
The complete game, local fonts, textures, icons and sounds are then cached.
Close and reopen the app without a connection to start a fresh session.
Disconnecting an already running game preserves that game's state.
Install through your browser's built-in installation control when available;
installation is optional and there is no custom install prompt.

Readiness verifies the active worker and every required resource for the current
build. Failed or incomplete preparation shows **Offline play could not be prepared.**
without blocking a usable game. An available shell with missing game code shows
**Connection needed** and recovers to Setup after connectivity returns. A first
uncached offline visit can only show the browser's network error.
Deployment and the user-controlled update flow belong to Milestone 5.

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
local MP3 decoding and successful real media playback in Chrome. PWA checks use
production, a disabled HTTP cache, a fresh offline document, a saved browser
profile reopened in a new process, all levels, results, totals, restart/replay,
settings, Range media responses and real offline playback. Worker-owned download
failure, registration failure/retry, partial caches, quota failure, blocked cache
access, core-load recovery and unsupported workers are tested separately.
The final suite contains 59 unit tests and 69 browser tests, including 12 fixed
offline acceptance cases (12/12 passed) and an actual installed-app test.
The latter uses headed desktop Chrome in an offscreen, isolated test profile,
installs and launches via Chrome's PWA protocol, verifies actual standalone
display and an offline game, then uninstalls the test app. It requires a Windows
desktop session; this is not an Android/iOS installation test. The remaining
browser tests run headlessly. Resource-failure fallback tests block workers to
keep cached responses from hiding deliberately missing resources.
Browser screenshots and JSON evidence are saved in `artifacts/milestone-4/`;
previous milestone screenshots remain in their original directories. A test report is
available in `playwright-report/` after the browser suite.

## Implementation boundaries

- `src/features/game/domain/`: pure rules, state transitions and local Minimax.
- `src/features/game/hooks/`: React controller and cancellable computer timer.
- `src/features/game/components/`: setup and accessible board/game views.
- `src/features/settings/`: independent feedback switches.
- `src/services/`: lazy local audio pool with safe playback and cleanup.
- `src/app/`: composition, error boundary and CSS Modules.
- `src/styles/`: global styles and design tokens.
- `src/boot.ts`: small external bootstrap with core-load failure recovery.
- `src/pwa/`: single registration, cache readiness and non-blocking notice.
- `scripts/sw-support.js`: generated-worker cache inspection/repair and MP3 ranges.
- `scripts/verify-pwa.mjs`: build-time inventory, integrity and manifest validation.
- `public/icons/`: original standard, maskable and Apple PNG icons.
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
tools; running or building the app needs neither. The optional icon generator
`python scripts/generate-icons.py` needs Pillow and renders original X/O artwork.
The production build generates a unique worker-support filename and resource
integrity inventory. Workbox manages revisioned resources; gameplay and
preferences are never sent to the worker or stored there. Waiting updates do
not reload a live game. The complete unique precache has 28 resources;
Workbox also emits an identical duplicate manifest entry, deduplicated by URL.

Follow `Codex.md` and `spec/MILESTONE-4-PLAN.md`. Results and review steps are in
`spec/MILESTONE-4-REVIEW.md`. At the end of this milestone,
submit the runnable result and evidence for developer review and stop until
explicit approval. Do not begin the next milestone automatically.
