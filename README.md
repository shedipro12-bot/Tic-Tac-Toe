# Tic-Tac-Toe — Milestone 1

A mobile-friendly, English-language game against a local computer opponent.
Choose Easy, Medium or Hard, press **Start Game**, and play X against O.
You always move first. All levels occasionally make mistakes, including Hard.

This slice includes setup, one complete match, static results and error recovery.
After a result, refresh the page to choose a difficulty and start another match.
The Restart button appears only when recovering from a game error.
Scores, normal restart/replay, settings, sound, animation effects, offline PWA
support and hosting belong to later milestones.

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
Browser screenshots are saved in `artifacts/milestone-1/`; a test report is
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

Follow `Codex.md` and `spec/MILESTONE-1-PLAN.md`. At the end of this milestone,
submit the runnable result and evidence for developer review and stop until
explicit approval. Do not begin the next milestone automatically.
