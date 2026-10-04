# Tic-Tac-Toe — Design Specification

Version 1.0 · October 4, 2026 · Mobile PWA MVP · English / left-to-right

This document describes the design shown in the three reference images. The wireframes define structure and content, the mockups define the intended appearance, and the style guide defines the visual language. PRD.md governs product behavior and accessibility. Example board positions and scores in the images illustrate states; they are not fixed application data.

## 1. Screens

### Reference: wireframes.png

![Wireframes — setup, player turn, computer turn, win, loss, draw, settings, and connection-needed state](sandbox:/workspace/scratch/b5a13fe47517/tic-tac-toe-design/wireframes.png)

### Reference: mockups.png

![Designed mobile screens — grass background, cream panels, wood-framed chalkboards, and matching controls](sandbox:/workspace/scratch/b5a13fe47517/tic-tac-toe-design/mockups.png)

The images show eight views. Player turn, computer turn, win, loss, and draw are states of the same game screen, not separate destinations. Maintain consistent component positions between these states.

### 1.1 Setup

**Purpose:** Choose the computer difficulty and start a match without an account.

**What is on the screen:**

- A cream header with “Tic-Tac-Toe” on the left and an outlined “Settings” button on the right.
- A large cream content panel over the grass background.
- The message “Play against the computer.”
- A “Difficulty” label and a segmented selector: Easy, Medium, Hard.
- A visible selected state. Medium is selected in the reference.
- A wide “Start Game” button near the bottom of the panel.

**What happens:** Selecting a segment changes the difficulty for the next match. Start Game opens an empty 3×3 board at that difficulty, with the human taking the first turn. Settings opens the settings view. There is no login, tutorial, symbol chooser, or multiplayer selector.

### 1.2 Game — Player turn

**Purpose:** Place X in an empty cell and play against the computer.

**What is on the screen:**

- The same header and Settings button.
- A centered “Difficulty: Medium” label, updated to the selected difficulty.
- Three equal score cards: Wins, Losses, Draws, each with a label and number.
- The status “Your turn.”
- A square wood-framed chalkboard with nine cells. X marks are yellow chalk; O marks are lavender chalk.
- The supporting text “You: X” and “Computer: O.”
- A wide “Restart” button below the board.

**What happens:** Tapping an empty cell places one X. Tapping an occupied cell does nothing. If the move ends the match, show the appropriate result state. Otherwise, change to the computer-turn state. Restart immediately clears the board without confirmation and lets the human start again; it retains current-session counters and the current difficulty. Settings opens the feedback controls without resetting the match.

### 1.3 Game — Computer turn

**Purpose:** Clearly show that the computer is choosing its move.

**What is on the screen:** The same game layout, with “Computer’s turn” replacing “Your turn.” The board retains accepted moves. A brief neon accent on the latest mark may illustrate movement feedback, as shown in the mockup. Restart and Settings remain available.

**What happens:** Board input is disabled while the computer moves. After a legal computer move, return to the player turn or display a result. Restart clears the board and cancels any pending computer action so it cannot appear in the new match. Do not add a spinner, additional waiting screen, or confirmation dialog.

### 1.4 Game — Human win

**Purpose:** Show the player that they won and make replay easy.

**What is on the screen:**

- The shared header, difficulty label, and score cards.
- The result “You win.”
- The completed board, with the winning row, column, or diagonal highlighted by a line.
- Player/computer symbol labels.
- Easy, Medium, Hard controls below the board.
- A wide “Play Again” button.

**What happens:** Lock the completed board and increment Wins exactly once. The user may choose a difficulty for the next match and press Play Again. Clear the board, retain the session counters, and let the human start. An animated neon winning line is optional feedback; the static line and result remain when animations are disabled.

### 1.5 Game — Computer win

**Purpose:** Explain the loss and offer immediate replay.

**What is on the screen:** The same result layout, with “Computer wins,” a line through the computer’s winning marks, the difficulty selector, and Play Again.

**What happens:** Lock the board and increment Losses exactly once. Selecting difficulty affects the next match only. Play Again opens a new empty board while retaining session counters. Use the same hierarchy and component positions as the human-win view; do not introduce a punitive message or additional screen.

### 1.6 Game — Draw

**Purpose:** Show that the completed match ended without a winner.

**What is on the screen:** The same result layout, with “Draw,” a full board without a winning line, session counters, difficulty controls, and Play Again.

**What happens:** Increment Draws once and lock the board. The user may change difficulty and replay. Check a full-board win before declaring a draw. No victory highlight appears in a draw.

### 1.7 Settings

**Purpose:** Independently control sound effects and animations.

**What is on the screen:**

- A cream header with “Back” on the left and “Settings” as the title.
- Two clearly separated rows: Sound effects and Animations.
- One independently labeled On/Off toggle per row.
- The same grass background and cream surface as the other screens.

**What happens:** Each toggle changes only its own setting. Back returns to the view from which Settings was opened. Preserve the match and counters; a computer turn may complete while Settings is open, so return to the current game state rather than an outdated snapshot. This is a navigation interpretation of the references, not a new feature. Settings apply during the current session and are not stored permanently. The mockup shows both toggles On; either may be turned Off.

### 1.8 Connection needed

**Purpose:** Explain that the app cannot finish loading the resources needed to play.

**What is on the screen:** A Tic-Tac-Toe header, the centered heading “Connection needed,” and the message “Connect to the internet to load the game.” Use the normal cream panel and grass treatment where those resources are already available. No Retry button or extra menu appears in the reference.

**What happens:** When connectivity returns and the required resources load successfully, show Setup. A first-ever offline visit may show the browser’s own offline page because the app has not loaded yet. Once the app is fully cached, ordinary offline play uses the normal screens and must not be blocked by this state.

### Other PRD error behavior

An internal game error is not illustrated as a separate screen. Preserve the existing game layout, show a short readable message, lock invalid board input, and use the existing Restart action for recovery. Do not add a dedicated error page. If sound fails, continue with visual feedback. If installation is unavailable, continue in the browser.

### Navigation summary

| Starting view | Action or event | Destination |
| --- | --- | --- |
| Setup | Start Game | Empty board, player turn |
| Player turn | Legal move, match ongoing | Computer turn |
| Computer turn | Legal move, match ongoing | Player turn |
| Either turn | Winning move or draw | Matching result state |
| Unfinished game | Restart | Empty board, player turn |
| Result | Play Again | Empty board, player turn |
| Setup or any game state | Settings | Settings |
| Settings | Back | Originating setup or current game state |
| Connection needed | Required resources successfully load | Setup |
| Any view | Close and reopen, or refresh | Fresh session and Setup |

Session counters persist across Restart and Play Again but reset on closing or refreshing. An abandoned unfinished match does not count as a loss or draw.

## 2. Guide Style

### Reference: guide-style.png

![Style guide — chalkboard, grass, wood, yellow and lavender chalk, neon feedback, typography, controls, and spacing](sandbox:/workspace/scratch/b5a13fe47517/tic-tac-toe-design/guide-style.png)

### 2.1 Atmosphere and general appearance

The design combines a traditional outdoor chalkboard game with short neon feedback effects. Grass provides the background, wood frames the board, and cream surfaces keep the interface readable. The mood is friendly, tactile, and simple. Keep the board as the main visual focus.

Use the latest grass/wood/chalk guide, rather than the earlier grayscale or violet-and-teal guide. The wireframes remain the structural reference even though their colors are not the final design.

### 2.2 Primary colors

| Token | HEX | Use |
| --- | --- | --- |
| Chalkboard | `#173E35` | Board surface, primary buttons, dark green text and outlines |
| Grass | `#4F7D2A` | Reference hue for the natural grass background |
| Wood | `#B77927` | Reference hue for the board frame |
| Chalk X | `#E8D76A` | Human X marks and selected difficulty treatment |
| Chalk O | `#B5A4D8` | Computer O marks |
| Chalk lines | `#F5ECCD` | Grid lines, light button text, and cream surface family |
| Neon blue | `#27B8FF` | Brief winning-line or move feedback glow |
| Neon red | `#FF4058` | Brief move feedback accent |

The style guide prints these HEX values. Grass and wood textures naturally contain lighter and darker variations; their tokens describe their base hue, not every image pixel. The exact opaque cream-panel shade is not separately labeled in the guide. Use `#F5ECCD` as the initial cream surface token and preserve readability. Avoid using neon colors for long body text.

### 2.3 Typography

Use **Nunito Sans**, as specified in the style guide, for interface text. Use ordinary sans-serif fallbacks if the font is unavailable. Package the font locally so it remains available offline. Board marks are drawn shapes with a chalk texture, not a second display font.

| Role | Size | Weight | Example |
| --- | --- | --- | --- |
| Page title | 28 px | 800 | Tic-Tac-Toe |
| Section heading | 22 px | 700 | Settings |
| Game status | 20 px | 700 | Your turn |
| Body and buttons | 16 px | 600 | Start Game |
| Supporting text | 14 px | 400 | Difficulty: Medium |

Use a body line height of 1.5 and a heading line height of 1.2. Keep all app copy in English and left-to-right. Scale headings responsively if needed to fit without shrinking controls or clipping text.

### 2.4 Buttons, selection controls, and fields

Primary actions—Start Game, Restart, and Play Again—use dark green fills, cream labels, a restrained chalk edge, and an 8 px corner radius. Use 48 px height as the default. Keep their width and placement consistent with the mockups.

Settings and Back use cream fills, dark green text, and simple dark green outlines. The difficulty selector has three adjacent segments. A pale yellow selected segment, a visible outline, and the label identify the current choice; color alone is insufficient.

Disabled controls use muted neutral treatment and cannot activate. Do not hide important labels. Active feedback toggles use a green track and light thumb; Off uses a muted track and distinct thumb position. Provide text state labels as well.

There are no text inputs, registration forms, search fields, or other data-entry controls in this MVP. Do not invent fields solely to complete a component catalog.

### 2.5 Cards, board, and icons

Score cards are equal-width cream surfaces with a subtle border and 8 px corners. Keep the label above the value. These are temporary session counters, not a statistics or history feature.

The game board is a square 3×3 dark green chalk surface inside a warm wood frame. The frame has approximately 12 px corners and a gentle shadow. Cells stay square as the screen resizes. Grid strokes are approximately 2 px at the intended mobile scale, with light texture but clear separation.

X marks are yellow and O marks lavender. Their shapes must remain recognizable independently of color. Use simple stroke-based icons, including the Back chevron, without adding decorative symbols or new controls. The text buttons in the mockups remain valid even when an icon is available.

### 2.6 Spacing, corners, and shadows

| Relationship | Spacing |
| --- | --- |
| Text to text | 8 px |
| Label to control | 8 px |
| Text to board or image | 16 px |
| Related groups | 16 px |
| Sections | 24 px |
| Screen content padding | 16 px |

The guide uses a spacing scale of 4, 8, 12, 16, 24, and 32 px. These are nominal CSS values, not measurements of the generated image. Use consistent alignment and leave more space around important actions than around supporting labels.

Buttons and cards use 8 px corners; the wood-framed board uses 12 px corners. The guide’s board-shadow reference is `0 4px 12px` with black at 15% opacity. Keep shadows restrained and avoid heavy three-dimensional effects.

### 2.7 Background, imagery, and motion

Use natural grass imagery behind the opaque cream content. Never place small text directly over grass. Keep the board’s wood grain and chalk texture subtle enough that cells and marks remain clear. No character illustration or unrelated photography is shown or required.

Neon effects belong to short move/result feedback. The mockup’s blue winning line and red-lit latest X show example moments, not a permanently glowing interface. Return marks to their yellow/lavender base appearance after feedback. Never use rapid flashing. A winning line remains visible as a static chalk line when animation is disabled.

### 2.8 PRD UX requirements

- Maintain readable text, clear labels, large controls, and at least 44 × 44 px primary touch targets.
- Keep the current turn, difficulty, and outcome obvious through text and shapes, not only color or sound.
- Keep Restart, Play Again, and Settings easy to reach without covering the board.
- Prevent board input during the computer turn and after a completed match.
- Use independent sound and animation settings; disabling them must not remove essential information.
- Respect reduced-motion preferences even if the animation toggle is On.
- Support portrait and landscape with no clipped controls or horizontal scrolling. Allow vertical scrolling when screen height is limited.
- Preserve visible keyboard focus, accessible control labels, and readable contrast. Textures must not interfere with these requirements.
- Keep browser play available without mandatory installation, login, or instructions.
- Make the same gameplay and feedback resources available offline after successful initial caching.

The mockups are visual guidance, not a reason to reproduce inaccessible contrast, undersized text, or static example scores. Product behavior and these UX rules remain authoritative.
