# Plan: Tab row for the panels, a clearer Backing button, tidier header and transport

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), tidy the layout:

1. **Tab row**: move the panel buttons into one row directly above the dock (between the
   board and the dock), in this order: **Mix**, **Beats**, **FX**, **Share**, **ⓘ**. Each
   button keeps its id, behavior, and shortcut. The header and transport no longer hold them.
2. **Header**: only the logo, LCDs, **Theme**, and the Vol/Backing sliders remain.
3. **Transport**: Play, Stop, tempo, Backing, Mute, Clear, Length. That's 8 columns on
   desktop and two rows on narrow screens, with no lone button.
4. **Backing button**: shows a small "Backing" caption above its value (Song / Loop / Off).
5. **Random button**: plain text `Random`. Remove the 🎲 emoji, which the pixel font can't
   draw.

No behavior changes. Only where controls sit and how they're labeled changes.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- Remove `#info-toggle`, `#fx-toggle`, `#share-toggle`, and `#mix-toggle` from `.sys`.
- Remove `#beats-toggle` from `.keys`.
- Add this row directly before `<div id="dock" class="dock">`. Keep each button's attributes
  as they were, and add `class="hw tab"`:

  ```html
  <nav id="tabs" class="tabs" aria-label="Panels">
    <button id="mix-toggle" class="hw tab" type="button" aria-expanded="false" aria-controls="mix-all">Mix</button>
    <button id="beats-toggle" class="hw tab" type="button" aria-expanded="false" aria-controls="beats">Beats</button>
    <button id="fx-toggle" class="hw tab" type="button" aria-expanded="false" aria-controls="fx">FX</button>
    <button id="share-toggle" class="hw tab" type="button" aria-expanded="false" aria-controls="share">Share</button>
    <button id="info-toggle" class="hw tab" type="button" aria-haspopup="dialog" aria-controls="backing-info" title="About the backing music (I)">ⓘ</button>
  </nav>
  ```

- `#backing` button: change its content to
  `<small>Backing</small><span id="backing-value">Song</span>`.
- `#beat-random`: change the text to `Random`.

### 2. `src/main.ts`

- `updateBackingButton()`:
  - Set `backingValue.textContent` (the new `#backing-value` span) instead of the button's
    `textContent`, so the caption stays.
  - Keep the title, `selected`, and `aria-pressed` logic.
- Check that the share toggle's recording label still works. `updateRecordLabel` sets
  `shareToggle.textContent` to `● 0:12` while recording and back to `Share` after. That's
  fine for a tab button. Make sure the text still fits by keeping it short.
- No other changes: every button keeps its id, so the existing wiring finds them.

### 3. `src/style.css`

- **Tab row**:

  ```css
  .tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    gap: 6px;
  }

  .tabs .hw {
    min-height: 32px;
    padding-block: 4px;
  }

  #info-toggle {
    min-width: 40px;
  }
  ```

  The `.selected` class already marks an open tab. Keep it.
- **Backing button caption**:

  ```css
  #backing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    line-height: 1;
  }

  #backing small {
    font: 400 0.5rem/1 var(--label);
    color: var(--mute);
  }
  ```

- **Transport**: base `.keys` back to `grid-template-columns: repeat(8, 1fr);`. Inside
  `@media (max-width: 760px)` the existing rules (8 columns, `.hw.go` span 2, `.tempo` span 4,
  other buttons span 2) give two full rows: Play, Stop, and tempo on the first, and Backing,
  Mute, Clear, and Length on the second. Check that this holds with Beats removed.
- **Header**: remove any `.sys` rules that only existed for the moved buttons. Keep `.levels`
  as it is. On desktop, `.sys` should be Theme then the levels.
- **Board size**: the tab row adds about 38px of height. Wherever `#stage` width is computed
  from `100dvh` minus a fixed allowance, add 38 to that allowance:
  - base `calc((100dvh - 276px) * 2)` → `314px`
  - the short-screen rule `118px` → `156px`
  - Leave the landscape rule (`30px`) alone. In that layout the tab row sits in the side
    column (next bullet).
- **Phones held sideways** (`@media (max-height: 520px) and (orientation: landscape)`):
  - `#app` gets `grid-template-rows: auto auto minmax(0, 1fr);`.
  - `#stage`: `grid-row: 1 / 4;`.
  - `#hud` stays on row 1. Add `#tabs { grid-column: 2; grid-row: 2; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }`
    and `#tabs .hw { min-height: 30px; font-size: 0.6rem; padding-inline: 2px; }`.
  - `#controls`: `grid-row: 3;`.
  - The dock keeps its fixed floating position.
- **Narrow screens** (`@media (max-width: 760px)`): `.tabs { gap: 4px; }` and
  `.tabs .hw { font-size: 0.66rem; }`.

### 4. Docs

- `README.md`:
  - The tab row above the slot under the board holds Mix, Beats, FX, Share, and ⓘ.
  - The header holds Theme and the Vol/Backing sliders.
  - The Backing button shows its mode under a "Backing" caption.
  - Remove wording that places these buttons in the header or transport.
- `docs/references.md`: update the layout and dock paragraphs to match.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="tabs"' -- index.html` prints one line.
- PowerShell: `(Select-String -Path index.html -Pattern 'class="hw tab"').Count` prints 5.
- PowerShell: `Select-String -Path index.html -Pattern '🎲'` prints nothing.
- `git grep -n -F 'id="backing-value"' -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of desktop, laptop, phone upright (390 and 360 wide), and phone sideways.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change behavior, ids, shortcuts, sounds, or saved keys.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New features.
- Restyling the pads or the board.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
