# Plan: Desktop layout pass, start stopped, and Follow for 32-step patterns

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), make six changes. The
desktop layout is the priority. Phones must still work: no sideways scroll and no clipped
labels.

1. **Header**: remove the Backing volume slider. Backing volume stays in the Mix view. The
   header keeps **Vol** only.
2. **Length button**: move `#length` (16/32 steps) into the header, next to the Step LCD and
   the Page button.
3. **Share and Backing swap places**:
   - **Share** (`#share-toggle`) moves into the transport, where Backing was. It still opens
     the Share panel in the dock.
   - **Backing** (`#backing`, Song/Loop/Off) moves into the tab row, between FX and ⓘ.
4. **Equal heights**: on desktop, the Instruments bank and the Transport bank are the same
   height, and the transport buttons stretch to match the pads.
5. **Start stopped**: pressing **Start** (or Enter/Space on the start screen) turns on the
   audio but does not start playback. The Play button shows **Play**.
6. **Follow**:
   - A **Follow** toggle in the header, next to Page, shown only when the length is 32 (like
     Page). Key **F**.
   - When on, the board flips to the page the playhead is on as it plays.
   - Flipping the page by hand (button or **P**) turns Follow off.
   - Saved as `drumline-follow` (default on).

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- `.levels`: remove the Backing `<label class="level">…#mix-backing…</label>`. The Mix view's
  Backing slider (`data-mix-channel="backing"` in `#mix-all`) stays and keeps working.
- `.lcds`: after `#page`, add the `#length` button, moved from `.keys` with its attributes,
  then add:
  `<button id="follow" class="hw" type="button" hidden aria-pressed="true" title="Follow the playhead across pages (F)">Follow</button>`
- `.keys`: remove `#length`. Move `#backing` out and put `#share-toggle` (from the tab row) in
  its place, with its attributes but without the `tab` class.
- `#tabs`: the order is now Mix, Beats, FX, Backing, ⓘ. Move `#backing` (with its
  `<small>`/`<span id="backing-value">` content) between `#fx-toggle` and `#info-toggle`, and
  give it `class="hw tab"`.

### 2. `src/main.ts`

- **Start stopped**:
  - In `startAudio()`'s success path, remove the `play()` call. Keep `hideOverlay()`.
  - `startButton` click and the start-screen Enter/Space call `startAudio()` (via `void`)
    instead of `play()`.
  - `play()` when `!started` should start the audio and then play. Change it to
    `void startAudio().then(() => { if (started) play(); });` and return. Check that this
    doesn't recurse: `startAudio` no longer calls `play`.
- **Follow**:
  - `const FOLLOW_KEY = 'drumline-follow';`
  - `let follow = loadFollow();`, where `loadFollow()` returns
    `localStorage.getItem(FOLLOW_KEY) !== '0'` in `try`/`catch`, default `true`.
  - `followButton` (`#follow`).
  - `updateFollowButton()`: set `followButton.hidden = sequencer.length === 16`, toggle the
    `selected` class with `follow`, and set `aria-pressed`.
  - `setFollow(on)`: store it, save it to `FOLLOW_KEY` in `try`/`catch`, and update the
    button.
  - The button click and key `'f'` toggle it. Add `case 'f'` to the keydown `switch`; it is
    unused today. Check this.
  - Call `updateFollowButton()` from `setLength`, and once at startup.
  - Manual page flips turn Follow off: the page button click and key `'p'` call
    `setFollow(false)` before flipping. The automatic flip must not.
  - In `frame()`, after `playhead` is updated from a step mark: if `follow`, `playing`, and
    `sequencer.length === 32` are all true and `Math.floor(playhead / GRID_COLS) !== page`,
    call `setPage(Math.floor(playhead / GRID_COLS))`.
- Nothing else changes: ids are kept, so the existing wiring finds every moved button.

### 3. `src/style.css`

- **Header**:
  - `.lcds` keeps `#page`, `#length`, and `#follow` the same height as the LCDs. Apply the
    existing `#page` sizing rule (`min-height: 0; padding: 2px 10px;`) to `#length` and
    `#follow` too. `#length` shows "16 steps" or "32 steps" on one line, so add
    `white-space: nowrap`.
  - `.levels` now holds one slider. Keep its width, and center it vertically in `.sys`.
- **Tab row**:
  - `.tabs` becomes `grid-template-columns: repeat(4, minmax(0, 1fr)) auto;`, which still fits
    (Mix, Beats, FX, Backing, then ⓘ).
  - The Backing button's caption layout (`#backing` column flex, small caption) must fit the
    tab height. Set `#backing.tab { min-height: 32px; padding-block: 2px; }`.
- **Transport**: base `.keys` uses `repeat(7, 1fr)`: Play, Stop, tempo (span 2), Share, Mute,
  Clear.
- **Equal heights (desktop)**:
  - `.deck { align-items: stretch; }`.
  - Each `.bank` fills the row (`height: 100%`), and its content area grows.
  - `.pads` and `.keys` get `flex: 1;` and `align-content: stretch;`.
  - Their direct buttons (and `.tempo`'s children) stretch to the full height
    (`height: 100%` or `align-self: stretch`).
  - The transport buttons end up as tall as the pads, with labels vertically centered.
  - Keep each `.cap` label above its bank. The goal is that the two banks' top edges and
    bottom edges line up.
- **Narrow** (`@media (max-width: 760px)`):
  - `.keys { grid-template-columns: repeat(6, 1fr); }`.
  - `.hw.go`, `#stop`, and `.tempo` span 2 each (row 1).
  - `.keys > .hw:not(.go):not(#stop)` span 2 (row 2: Share, Mute, Clear).
  - Remove the old 8-column narrow rules that this replaces.
  - Turn off the equal-height stretch when the deck is one column. The deck stacks there, so
    each bank keeps its natural height.
- **Phones held sideways**: keep it working. If `.keys` there is 2 columns, Play/Stop, tempo,
  Share/Mute, and Clear may leave one empty cell. That's acceptable.

### 4. Docs

- `README.md`, updated to match:
  - The Length and Follow buttons sit by the Step counter.
  - Follow (key **F**): the board follows the playhead across pages; flipping the page by hand
    turns it off; it is remembered.
  - Share is in the transport.
  - Backing (Song/Loop/Off) is in the tab row.
  - Backing volume is in the Mix view only.
  - Start opens stopped; press Play.
  - Add **F** to Controls.
- `docs/references.md`:
  - Update the layout description.
  - Add `drumline-follow` to the storage keys.
  - Note that Start no longer plays.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="follow"' -- index.html` prints one line.
- PowerShell: `(Select-String -Path index.html -Pattern 'id="mix-backing"').Count` prints 0.
- PowerShell: `(Select-String -Path index.html -Pattern 'class="hw tab"').Count` prints 5.
- PowerShell: `Select-String -Path src/main.ts -Pattern 'drumline-follow'` prints at least one
  line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check: desktop bank heights, Start opens stopped, Follow flips pages, and phones
  have no overflow.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change sounds, panel contents, saved keys other than adding `drumline-follow`,
  or existing shortcuts.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New features beyond Follow.
- Restyling pads or the board.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
