# Tic-Tac-Toe PWA — Development Milestones

Scope: MVP · Date: October 4, 2026

## Source documents and scope

This plan translates `PRD.md`, `ARCHITECTURE.md`, and `DESIGN.md` into five significant, sequential milestones. The wireframes, mockups, and style-guide images embedded in `DESIGN.md` are the visual references. Each milestone delivers a working user capability or a complete release capability, including its UI, local logic, integration, and verification.

The application uses React, TypeScript, Vite, CSS Modules, a local Minimax-based opponent, in-memory state, locally packaged audio and fonts, vite-plugin-pwa/Workbox, and static HTTPS hosting on Cloudflare Pages. Verification uses Vitest and Playwright, supplemented by real mobile-device checks. There is no backend, database, authentication service, external AI service, or remote gameplay API to build.

Use the latest `DESIGN.md` for appearance where earlier architecture defaults differ: locally packaged Nunito Sans, the grass/wood/chalk palette, 8 px controls, a 12 px board frame, and the specified restrained shadow. Include these local visual assets in offline caching. This resolves visual specification differences without changing product behavior.

Do not add accounts, multiplayer, persistent scores or settings, analytics, ads, purchases, tutorials, hints, alternate rules, or additional screens. Human-turn, computer-turn, win, loss, and draw are states of the same game screen.

## Mandatory approval rule

**After completing each milestone, the AI must stop development and wait for review and explicit approval from me (the developer) before moving on to the next milestone.**

Completion means every Definition of Done item for that milestone is satisfied. Present the working result, relevant test evidence, visual evidence, and any limitations for review. Silence, elapsed time, or passing tests does not constitute approval. If a criterion is blocked or fails, report it and continue only work needed to complete the current milestone; do not declare it complete or begin the next one. Changes requested during review remain within the current milestone until explicitly approved.

Intermediate versions may expose only the controls implemented in their milestone; do not present nonfunctional controls as finished features. The final milestone must match the full documented interface. Every milestone preserves previously approved capabilities and includes relevant regression checks.

## Milestone sequence

| Order | Milestone | Complete capability | Dependency |
| --- | --- | --- | --- |
| 1 | Choose a challenge and complete a match | Start unaided, play against the computer, and understand the result. | None |
| 2 | Keep playing within a session | Restart, replay, change difficulty between matches, and see temporary scores. | Approval of Milestone 1 |
| 3 | Control gameplay feedback | Adjust sound and animations while retaining the current match. | Approval of Milestone 2 |
| 4 | Play offline and install the app | Reopen and use the complete game without a connection after caching. | Approval of Milestone 3 |
| 5 | Use a reliable hosted release | Play on supported mobile devices and receive updates without losing an active match. | Approval of Milestone 4 |

## Milestone 1 — Choose a challenge and complete a match

### Purpose

Deliver the core entertainment experience: choose a difficulty, start immediately, and finish a correct, understandable single-player match.

### What needs to be implemented

- Establish the documented React/TypeScript/Vite application and pure rules, reducer, opponent, and controller boundaries as part of this working slice.
- Implement setup with English text, Easy/Medium/Hard selection, and Start Game. Initialize Medium as the architecture default.
- Implement the mobile game screen with a square 3×3 board, selected difficulty, human X/computer O labels, and clear turn/result text.
- Apply the documented grass, wood, and chalk appearance, local Nunito Sans, readable type, responsive placement, accessible labels, focus indication, and touch targets.
- Enforce alternating legal moves, human-first starts, all winning lines, win-before-draw evaluation, terminal board locking, and user-perspective results. Display a static winning-line indication for wins and losses.
- Implement the on-device strategic opponent at all three levels. Use the architecture's initial mistake probabilities—Easy 0.50, Medium 0.25, Hard 0.10—and initial 400 ms turn delay as tunable technical defaults, not promised win rates.
- Keep reducer transitions deterministic; inject randomness into opponent tests. Guard scheduled computer moves using match identity and expected move count, with effect cleanup and background/visibility handling.
- Ignore occupied cells, rapid/repeated taps, computer-turn input, and terminal-state input. Provide the documented internal-error message and Restart recovery without a new error screen.

### Expected output

A runnable mobile web app in which a user can select any documented difficulty and complete one match from setup through win, loss, or draw. The game works entirely on the device. Offline packaging, session-score UI, ordinary replay/restart controls, and feedback settings arrive in subsequent slices.

### Definition of Done

- An interaction test can select each difficulty, start an empty board, accept the human's first legal move, and continue through a terminal result.
- Rule tests cover every row, column, and diagonal for both symbols, a draw, and a full-board win that must not be classified as a draw.
- Illegal and duplicate input cannot change the board or produce an extra turn. The computer never plays an occupied cell or moves after completion.
- Deterministic opponent tests demonstrate strategic choices and a strictly worse legal choice when the mistake branch is selected and such a move exists. Tests verify the configured difficulty ordering and a player-winning path against Hard; Hard is not implemented as always optimal.
- Fake-timer and lifecycle checks show that stale callbacks, repeated effects, backgrounding, and recovery cannot corrupt the current match.
- Setup and game/result states are usable in portrait and landscape, by touch and keyboard, with readable labels and no clipped controls or horizontal overflow. Meaning does not depend on color or sound.
- The production build succeeds; relevant Vitest and Playwright checks pass. Provide screenshots of setup, both turn states, and all three result states for review.

## Milestone 2 — Keep playing within a session

### Purpose

Make short repeat-play sessions complete and reliable, including immediate restarts and temporary scorekeeping.

### What needs to be implemented

- Add the documented Restart action during play and Play Again action after a result, with no confirmation dialog for restart.
- Implement between-match difficulty selection. Capture the chosen difficulty when starting a match; do not change the active opponent mid-match. Restart retains the active difficulty; replay uses the next selected difficulty.
- Add Wins, Losses, and Draws cards. Update exactly one counter once per completed match; preserve counters across replay and restart. An unfinished abandoned match contributes nothing.
- Cancel or invalidate pending computer work and feedback when a board is reset. Start every replacement board with the human turn.
- Apply the architecture's in-memory lifecycle contracts: no saved match, scores, or preferences; independent tab sessions; reset on refresh/new document and persisted back-forward-cache restoration; retain state when a backgrounded document survives.
- Complete the documented repeat-play control layout without adding navigation screens.

### Expected output

A continuous play session in which the user can finish multiple matches, see accurate temporary totals, restart immediately, and select the next challenge between matches.

### Definition of Done

- Browser checks complete a match and replay into an empty human-first board with the correct selected difficulty and retained counters.
- Win, loss, and draw each increment only their own counter exactly once, including under repeated completion actions.
- Restart during the pending computer delay clears the board immediately, shows no confirmation, preserves totals, and prevents the old move from appearing later.
- Restarting an unfinished game adds no result. Illegal or repeated replay/restart actions cannot produce duplicate computer turns or corrupt state.
- Difficulty changes between matches affect the next match only; restarting an active match retains its original difficulty.
- Refresh and a new app document reset the session. Separate tabs do not share scores. A surviving backgrounded document retains the match; persisted back-forward-cache restoration follows the documented reset contract.
- No localStorage, sessionStorage, IndexedDB, cookies, or URL state is used to restore gameplay or scores. Existing gameplay tests remain passing.
- Provide a repeat-play demonstration and test evidence covering counters, resets, and stale-move prevention for review.

## Milestone 3 — Control gameplay feedback

### Purpose

Deliver the complete documented visual and feedback experience while allowing the user to control sound and motion independently.

### What needs to be implemented

- Add Settings access from setup and game, the Settings screen, and Back navigation to the originating view without resetting gameplay.
- Implement independent sound-effects and animations On/Off controls. Both start On under the architecture defaults and remain session-only.
- Package gameplay sounds locally and handle browser audio restrictions or playback failures without interrupting play.
- Implement the documented restrained move/result feedback, including brief neon accents where specified, without flashing. Keep permanent X/O marks, result text, and the static winning-line indication understandable without motion or sound.
- Respect both the animation toggle and reduced-motion preferences. Turning animations off does not remove the computer turn delay or change game rules.
- Finish all visual details from `DESIGN.md`: palette, Nunito Sans sizing, chalk marks, wood frame, opaque readable surfaces over grass imagery, spacing, corners, button/card/icon treatments, and shadows.
- Allow the computer to complete its pending turn while Settings is open, as documented; returning shows the current game state.

### Expected output

A fully designed online MVP with all setup, game/result, and settings views, independently controllable feedback, and uninterrupted navigation back to the current match.

### Definition of Done

- Settings opens from setup and from every game state and returns to the correct origin without losing the board, difficulty, or counters.
- All four sound/animation toggle combinations preserve complete gameplay and understandable results. Preferences reset with a new session.
- A computer move or completed result while Settings is open appears correctly on return, without duplicate actions or resets.
- Muted, rejected, or unavailable audio remains nonfatal. Animation-off and reduced-motion checks show static equivalents and no flashing feedback.
- Screenshots of all implemented states and Settings match the latest design references; no unintended new controls, inputs, or screens are present.
- Mobile portrait/landscape, keyboard focus, touch-target size, labels, and contrast/readability checks pass, including with unavailable font/audio resources where applicable.
- Relevant rule, repeat-play, navigation, and feedback tests pass. Provide visual and interaction evidence for review.

## Milestone 4 — Play offline and install the app

### Purpose

Make the complete game available without a connection after successful initial caching, in both the browser and an installed PWA where supported.

### What needs to be implemented

- Add the documented manifest, standalone presentation, root scope/start URL, English language metadata, and required standard, maskable, and Apple icons. Do not lock screen orientation.
- Configure vite-plugin-pwa/Workbox generated service-worker caching for the complete application: HTML, scripts, styles, icons, local fonts, sounds, and visual assets. Keep gameplay modules available without later network-dependent loading.
- Register the service worker once and base offline readiness on successful resource caching rather than connection status alone.
- Verify offline reopening, all difficulty levels, results, scorekeeping, replay, restart, and settings using the production build served over HTTPS or a suitable local secure context.
- Implement the documented Connection needed view when an available app shell cannot support play. A first-ever offline visit may use the browser's offline error; do not claim that an uncached app can load itself.
- Handle unavailable installation, failed service-worker registration, and incomplete caching while retaining normal online browser play where resources can load. Do not require installation or add a custom installation flow.

### Expected output

An installable, offline-capable production build. After complete online caching, the user can reopen and play the full game without network access, including its local feedback assets.

### Definition of Done

- Inspect the generated manifest, icons, worker, and precache inventory; required resources are present and scoped correctly.
- A production-build browser test loads online, confirms complete caching, disables networking, reopens the app, and exercises all three difficulties, a completed match, replay, restart, session counters, and both feedback controls.
- No remote request is required for successful offline gameplay. Offline launch begins a new in-memory session when it creates a new document.
- Tests cover first-ever offline loading, partial/failed caching, and service-worker registration failure without misleading offline-readiness messages.
- Where installation is supported, installation and standalone launch work; otherwise normal browser use remains available. Portrait and landscape remain usable.
- Every planned offline gameplay test passes: **100%**, as required by the PRD. Report the test cases and environment alongside the result.
- Existing online gameplay and settings tests remain passing. Provide offline and installation evidence for review; hosted real-device coverage is completed in Milestone 5.

## Milestone 5 — Use a reliable hosted release

### Purpose

Validate the complete MVP in its intended hosted mobile environment, including safe application updates, privacy constraints, and the PRD's success criteria.

### What needs to be implemented

- Configure the documented static Cloudflare Pages deployment from GitHub, HTTPS, isolated preview origins, reproducible locked dependencies, and the documented supported Node build environment. No server functions or gameplay services are introduced.
- Implement the waiting-worker update experience. Offer **Update and reset session** only at setup, finished-game, or recovery states; never force a reload during an active match.
- Verify cross-tab update behavior: activating an update elsewhere cannot automatically reload a tab in active play. Each tab's match and counters remain independent.
- Apply the documented static security and caching headers, including self-hosted content restrictions, content-type protection, referrer and device-permission restrictions, revalidation of the document/worker/manifest, and immutable caching of hashed assets.
- Complete real-device compatibility and release verification on Android Chrome and iOS Safari, in browser and installed modes where supported, including portrait and landscape. Use the architecture's current-and-previous-major policy where those environments are available; record exact browser/OS versions and any gaps.
- Evaluate the PRD's unaided match-start criterion through pre-release usability testing and rerun the offline suite on the release candidate. Define and record the usability sample size and device matrix before reporting results; do not add production tracking.

### Expected output

A hosted release candidate with verified update behavior, mobile/PWA evidence, security/privacy checks, and a documented assessment of the approved MVP success criteria, ready for developer approval.

### Definition of Done

- The hosted production build loads over HTTPS with the documented headers and assets. Preview and production environments do not share an origin or service-worker scope.
- An update test moves from one build to another, demonstrates the waiting-worker notice at a safe state, and confirms that the explicit update action resets the session only when accepted.
- Updates arriving during play, including activation in another tab, do not interrupt the active match. Reload remains deferred until a safe state and user choice. Failed update delivery leaves the usable cached version available.
- Complete gameplay, session-reset, feedback, offline, and responsive-layout checks pass on the recorded target devices and modes. Unavailable environments or failed checks are reported as unmet criteria, not assumed successes.
- At least **90%** of the recorded pre-release test users select a difficulty and start a match without help. Report the numerator, denominator, and test method without collecting personal information through the app.
- **100%** of the planned release-candidate offline gameplay tests pass after complete initial caching, with the device matrix and test cases reported.
- Privacy/storage/network inspection confirms no app analytics, account flow, remote AI, gameplay-data transmission, or persistent gameplay/preferences. Distinguish normal hosting request processing from application data collection as described in the architecture.
- All relevant automated checks and the production build pass. Deliver screenshots, device/usability results, update/offline evidence, and any remaining limitations for explicit developer review.
- Stop after review submission. The MVP is approved only when the developer explicitly approves this milestone; do not infer permission for additional features or further development.

## Evidence required at each review

Provide a runnable build or preview, a concise statement of the capability delivered, relevant automated test results, and screenshots or an interaction demonstration. Identify which Definition of Done items were checked and disclose anything unverified. Later reviews also demonstrate that earlier approved capabilities still work. Review evidence is a development deliverable, not an in-app statistics feature.

This document defines development gates only. It introduces no dates, estimates, additional product features, or separate technical-layer milestones.
