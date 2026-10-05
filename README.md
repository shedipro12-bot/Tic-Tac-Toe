# Tic-Tac-Toe — Milestone 5

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
When a complete new version is available, **Update and reset session** appears
in setup, after a result, or during error recovery. It remains hidden during a
match, including Settings opened from that match. Updates never automatically
reload another tab or installed window. Choosing the button reloads this
document into the prepared version and restores Medium, zero totals and both
feedback switches On. A failed attempt unlocks the game and allows retry.
Returning to a visible online document checks for updates, at most once per
30 seconds. A fully prepared update can also be accepted offline.

The candidate is published at [Play Tic-Tac-Toe](https://shedipro12-tic-tac-toe.pages.dev/).
Cloudflare HTTPS, headers, offline play, recovery, a real preview update and
preview/production isolation were verified. The developer accepted delivery on
6 October 2026 after confirming Android/iPhone play, including reopening offline.
Detailed device-matrix and participant measurements were not supplied; the
acceptance and evidence gaps are recorded in `spec/MILESTONE-5-REVIEW.md`.

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

Open http://127.0.0.1:4173. The local static verification server applies the
same `_headers` rules, content types, revalidation and 404 policy prepared for
Pages. It is a development tool; production serves `dist` directly on Cloudflare.

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
is already running. `npm run test:e2e` prepares two distinct production builds
automatically, then runs the suite. The final build B remains in `dist` for review.
For a focused update test run:

```sh
npm run test:updates:prepare
npx playwright test tests/e2e/updates.spec.ts tests/e2e/hosting.spec.ts
```

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
The final local run passed 59 unit tests and 85 browser tests: 69 browser tests
from Milestone 4, including 12 fixed desktop offline acceptance cases, plus
16 new HTTP/CSP, two-build update and transient recovery tests. The latest results are in
`spec/MILESTONE-5-REVIEW.md`.
The latter uses headed desktop Chrome in an offscreen, isolated test profile,
installs and launches via Chrome's PWA protocol, verifies actual standalone
display and an offline game, then uninstalls the test app. It requires a Windows
desktop session; this is not an Android/iOS installation test. The remaining
browser tests run headlessly. Resource-failure fallback tests block workers to
keep cached responses from hiding deliberately missing resources.
Browser screenshots and JSON evidence are saved in `artifacts/milestone-5/`;
previous milestone screenshots remain in their original directories. A test report is
available in `playwright-report/` after the browser suite.

### Verify the hosted candidate

Eighteen HTTPS checks passed in separate Cloudflare runs: eight original checks
(including a live update at the same preview alias), seven smoke/isolation
checks against the rebuilt candidate, and three production checks after publishing
the accepted release from main. To repeat the production checks in PowerShell:

```powershell
$env:MILESTONE5_HOSTED_BASE_URL = 'https://shedipro12-tic-tac-toe.pages.dev/'
$env:MILESTONE5_HOSTED_LABEL = 'hosted-production'
npx playwright test --config playwright.hosted.config.ts release.spec.ts
```

For preview smoke checks, use
`https://codex-milestone-5-preview.shedipro12-tic-tac-toe.pages.dev/` and label
`hosted-preview`. To also test isolation, set `MILESTONE5_PRODUCTION_URL` to the
production URL and select the `separate origins` test in `update.spec.ts`.
For the live update test, set `MILESTONE5_WAIT_FOR_UPDATE=1`, run the
`same HTTPS preview` test in `update.spec.ts`, wait for its A-cached output,
then rebuild the preview branch through Pages. This requires a real second
deployment at that alias; two deployment URLs cannot substitute for it.
The hosting document records the exact deployments and build IDs used for
the completed checks. These checks do not perform the manual phone/user trials.

## Implementation boundaries

- `src/features/game/domain/`: pure rules, state transitions and local Minimax.
- `src/features/game/hooks/`: React controller and cancellable computer timer.
- `src/features/game/components/`: setup and accessible board/game views.
- `src/features/settings/`: independent feedback switches.
- `src/services/`: lazy local audio pool with safe playback and cleanup.
- `src/app/`: composition, error boundary and CSS Modules.
- `src/styles/`: global styles and design tokens.
- `src/boot.ts`: small external bootstrap with core-load failure recovery.
- `src/pwa/`: single registration, cache readiness, explicit updates and notices.
- `scripts/sw-support.js`: generated-worker cache inspection/repair and MP3 ranges.
- `scripts/verify-pwa.mjs`: build-time inventory, integrity and manifest validation.
- `scripts/verify-hosting.mjs`: exact security policy and asset-cache validation.
- `scripts/static-server.mjs`: local static preview and switchable release test server.
- `scripts/prepare-update-tests.mjs`: two production builds at one test origin.
- `public/_headers`, `public/404.html`: static Cloudflare headers and missing-route policy.
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
not reload a live game. The complete unique precache has 29 resources;
Workbox also emits an identical duplicate manifest entry, deduplicated by URL.

Follow `Codex.md` and `spec/MILESTONE-5-PLAN.md`. Results and review steps are in
`spec/MILESTONE-5-REVIEW.md`; hosting and rollback are described in
`spec/MILESTONE-5-HOSTING.md`, and the manual device/usability checklist in
`spec/MILESTONE-5-DEVICE-CHECKLIST.md`. At the end of this milestone,
submit the runnable result and evidence for developer review and stop until
explicit approval. Do not begin the next milestone automatically.
