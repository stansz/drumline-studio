# Plan: Fixed-height dock so panels stop shifting the layout

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), the sampler, FX, and
Share panels currently appear as extra rows under the info line. Opening or closing one moves
the board and the controls. Selecting Sample opens the sampler, and picking another
instrument closes it, so the layout jumps every time.

Replace the info line and the three panels with one **dock**: a slot with a fixed height that
shows exactly one view at a time:

- the **info** line (default)
- the **sampler**, while Sample is the selected instrument
- **FX**, while the FX panel is open
- **Share**, while the Share panel is open

Swapping views never changes the dock's height, so nothing else on the page moves. Each view
fits in a single row at every width.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

Wrap the existing `#info`, `#fx`, `#share`, and `#sampler` elements, in that order, in:

```html
<div id="dock" class="dock">
  ...the four existing elements, unchanged except as below...
</div>
```

- `#sampler`: delete the `<small class="sampler-cap">Sample</small>` element, so the panel
  holds only `#sample-list`.
- Keep every id and every existing child otherwise unchanged.

### 2. `src/main.ts`

- Add `let openPanel: 'fx' | 'share' | null = null;`.
- Add one function that decides what the dock shows, and call it wherever panel visibility
  used to change:

  ```ts
  // The dock shows one view at a time: an opened panel, else the sampler while Sample is
  // selected, else the info line.
  function updateDock(): void {
    const view = openPanel ?? (selected === 'sample' ? 'sampler' : 'info');
    infoEl.hidden = view !== 'info';
    fxPanel.hidden = view !== 'fx';
    sharePanel.hidden = view !== 'share';
    samplerPanel.hidden = view !== 'sampler';
    fxToggle.setAttribute('aria-expanded', String(view === 'fx'));
    shareToggle.setAttribute('aria-expanded', String(view === 'share'));
  }
  ```

- Replace these functions:

  ```ts
  function toggleFxPanel(): void {
    openPanel = openPanel === 'fx' ? null : 'fx';
    updateDock();
  }

  function toggleSharePanel(): void {
    openPanel = openPanel === 'share' ? null : 'share';
    updateDock();
  }
  ```

- In `updateSampler`, remove the `samplerPanel.hidden = ...` line. Keep the button
  highlighting.
- In `selectTool`:
  - When the tool is `'sample'`, set `openPanel = null` so the sampler shows.
  - Call `updateDock()` after `updateSelection()`.
- Call `updateDock()` once at startup, after `updateSelection()`.
- Recording: while recording, the share toggle already shows the timer. No change.
- The `shareStatus` messages ("Link copied." and so on) stay in the Share view.

### 3. `src/style.css`

- Add a dock rule. Use one custom property for the height, so every view matches it:

  ```css
  .dock {
    --dock-h: 46px;
    height: var(--dock-h);
    display: grid;
    min-width: 0;
  }

  .dock > * {
    height: var(--dock-h);
    min-width: 0;
    box-sizing: border-box;
    margin: 0;
  }

  .dock > [hidden] {
    display: none;
  }
  ```

- `.readout` (the info line): keep its look. Inside the dock it fills the full dock height
  and centers its text vertically: add `display: flex; align-items: center;`. Keep the
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` behavior. Because the
  readout becomes a flex container, put the ellipsis on the text. Make sure long text still
  truncates: if `text-overflow` stops working on the flex container, wrap the text in a
  `<span>` from `main.ts`, or use `display: block` with `line-height: var(--dock-h)`.
  Pick whichever keeps the ellipsis, and say which in the report.
- `.fx-panel`: keep the background, shadow, and padding. Use `padding: 4px 10px` and
  `align-items: center` so content fits the dock height.
- `.share-panel .hw`, `#fx-reset`, and the sample buttons inside the dock: set
  `min-height: 0; height: 34px; padding-block: 0;`, so the buttons fit the 46px dock.
- `.sampler-panel`: `grid-template-columns: 1fr;`. `.sample-list` stays at 6 equal columns.
- Delete the `.sampler-cap` rule.
- Inside `@media (max-width: 760px)`:
  - Delete the rules that turned the panels into several rows: the `.fx-panel` two-column
    rule, `.sampler-panel`, `.sample-list` three-column, `.share-panel` three-column,
    `.share-status { grid-column: 1 / -1; }`, and `#fx-reset { grid-column: 1 / -1; }`.
  - Instead add, so everything stays in one row:

    ```css
    .dock { --dock-h: 44px; }
    .fx-panel { gap: 6px; padding: 4px 6px; }
    .sample-list { gap: 4px; }
    .sample-list .hw,
    .share-panel .hw,
    #fx-reset { font-size: 0.6rem; padding-inline: 4px; }
    .share-status { display: none; }
    ```

  - Delete the `#info { min-height: ... }` rule if one still exists there.
- Inside `@media (max-width: 760px) and (max-height: 600px)`: the `#info` font-size rule can
  stay.
- Inside `@media (max-height: 520px)` (short screens): the existing rule hides `#info`. Change
  it so the dock does not take space while showing the info view: replace `#info` in that
  `display: none` selector list with `#dock:has(> #info:not([hidden]))`. Keep `.cap` and
  `.steps em` in the list.
- Inside `@media (max-height: 520px) and (orientation: landscape)`:
  - Replace the `#fx, #share, #sampler { position: fixed; ... }` rule and the `#share` rule
    after it with one rule on the dock:

    ```css
    #dock {
      position: fixed;
      left: 8px;
      right: 206px;
      bottom: 8px;
      z-index: 5;
    }
    ```

  - In the `#hud, #info, #controls { margin-inline: 8px; }` selector list, replace `#info`
    with `#dock`.

### 4. Docs

- `README.md`:
  - Replace the sentence about panels opening over the board when the phone is held
    sideways with: "The info line, sampler, FX, and Share panels share one slot under the
    board, so opening one never moves the board. Held sideways, that slot floats over the
    bottom of the board."
  - Mention that opening FX or Share closes the other, and that selecting Sample shows the
    sampler.
- `docs/references.md`, **Visuals**: add one paragraph about the dock: one fixed-height slot,
  one view at a time, decided by `updateDock()` in `main.ts` (open panel, else sampler while
  Sample is selected, else info).

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="dock"' -- index.html` prints one line.
- `git grep -n -F 'function updateDock' -- src/main.ts` prints one line.
- PowerShell: `Select-String -Path src/style.css -Pattern 'sampler-cap'` prints nothing.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check that the board does not move when switching dock views.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change behavior other than panel visibility. Keep sounds, FX values, recording,
  sharing, the sampler presets, and keyboard shortcuts as they are.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New panels or controls.
- Restyling the panels beyond fitting them in one row.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
