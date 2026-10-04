# Tic-Tac-Toe — Milestone 2

A mobile-friendly, English-language game against a local computer opponent.
Choose Easy, Medium or Hard, press **Start Game**, and play X against O.
You always move first. All levels occasionally make mistakes, including Hard.

Press **Restart** during a match to clear the board immediately and play first
again at the same difficulty, without changing your session scores.
After a result, choose **Next game difficulty** and press **Play Again**.
Wins, Losses and Draws count completed matches once and accumulate while you play.
Restarting an unfinished match does not count a result.

Scores, matches and difficulty exist only in the running document's memory.
Refresh, a new document, or restoration from the browser's back-forward cache
starts a fresh session. Tabs are independent; backgrounding a surviving document
preserves it and pauses the computer timer. Game-error restart retains scores;
the top-level rendering recovery starts a fresh session.

Settings, sound, animation effects, offline PWA support and hosting belong to
later milestones.

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
Browser screenshots are saved in `artifacts/milestone-2/`; previous milestone
screenshots remain in `artifacts/milestone-1/`. A test report is
available in `playwright-report/` after the browser suite.

## Implementation boundaries

- `src/features/game/domain/`: pure rules, state transitions and local Minimax.
- `src/features/game/hooks/`: React controller and cancellable computer timer.
- `src/features/game/components/`: setup and accessible board/game views.
- `src/app/`: composition, error boundary and CSS Modules.
- `src/styles/`: global styles and design tokens.
- `public/textures/`: original, local SVG grass/wood/chalk textures.
- `tests/`: independent game oracle, unit/lifecycle and production-browser tests.

The app stores its current match only in memory. It has no accounts, backend,
analytics, persistent player data or third-party runtime requests. Nunito Sans
is bundled locally from `@fontsource/nunito-sans`, under the SIL Open Font
License included in `public/licenses/`. Textures are created for this project;
spec images remain visual references.

Follow `Codex.md` and `spec/MILESTONE-2-PLAN.md`. At the end of this milestone,
submit the runnable result and evidence for developer review and stop until
explicit approval. Do not begin the next milestone automatically.
