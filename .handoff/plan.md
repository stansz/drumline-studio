# Plan: Load closes the screen, Backing becomes a screen page, and pads keep equal sizes

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`):

1. **Load** (the button and **Enter**) loads the highlighted preset and closes the Beats screen.
   Tapping a list item still loads it and keeps the screen open.
2. The backing info pop-up (`#backing-info`) becomes a second page, **Backing**, of the Beats
   screen (`#beats-screen`). The screen's header gets two page tabs, **Beats** and **Backing**,
   instead of the "Beats" title. The **ⓘ** tab-row button is removed, and **Beats** moves to its
   place at the right end of the tab row: Mix, FX, ♪ Theme, Backing, Beats.
3. On phones, the six instrument pads and the BPM display keep their size when the phone's text
   size is set larger than normal.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `docs/guide.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- `#tabs` becomes, in this order: `#mix-toggle`, `#fx-toggle`, `#theme`, `#backing`,
  `#beats-toggle`. Delete `#info-toggle`. Change `#beats-toggle`'s `title` to
  `"Beats and backing info (I)"` (add the attribute).
- Delete the whole `#backing-info` element.
- Replace the `#beats-screen` element with:
  ```html
  <div id="beats-screen" class="info-backdrop" hidden>
    <div class="info-panel beats-panel" role="dialog" aria-modal="true" aria-label="Beats and backing">
      <div class="info-head">
        <div class="screen-tabs" role="tablist">
          <button id="screen-beats" class="hw" type="button" role="tab" aria-controls="beats-page">Beats</button>
          <button id="screen-backing" class="hw" type="button" role="tab" aria-controls="backing-page">Backing</button>
        </div>
        <button id="beats-close" class="hw" type="button" aria-label="Close">✕</button>
      </div>
      <div id="beats-page" class="screen-page" role="tabpanel">
        <div class="beats-lcd">
          <div id="beats-list" class="beats-list" role="listbox" aria-label="Presets"></div>
          <div class="beats-detail">
            <p id="beats-name" class="beats-name"></p>
            <p id="beats-meta" class="beats-meta"></p>
            <p id="beats-blurb" class="beats-blurb"></p>
          </div>
        </div>
        <div class="beats-controls">
          <button id="beats-up" class="hw" type="button" aria-label="Previous preset">▲</button>
          <button id="beats-down" class="hw" type="button" aria-label="Next preset">▼</button>
          <button id="beats-load" class="hw go" type="button">Load</button>
          <button id="beat-random" class="hw" type="button" title="Random groove">Random</button>
          <button id="beat-undo" class="hw" type="button" disabled>Undo</button>
        </div>
      </div>
      <div id="backing-page" class="screen-page" role="tabpanel" hidden>
        <h3 id="info-title" class="info-title">Backing</h3>
        <p id="info-blurb" class="info-blurb"></p>
        <p id="info-mode" class="info-line"></p>
        <div id="info-map" class="info-map" aria-label="Song sections"></div>
        <p id="info-position" class="info-line"></p>
        <dl class="info-facts">
          <dt>Verse chords</dt><dd id="info-verse"></dd>
          <dt>Chorus chords</dt><dd id="info-chorus"></dd>
          <dt>Feel</dt><dd id="info-feel"></dd>
          <dt>Tempo</dt><dd id="info-tempo"></dd>
        </dl>
      </div>
    </div>
  </div>
  ```
  Keep the `beat-undo` button's `disabled` attribute exactly as it was.

### 2. `src/main.ts`

- Remove the `infoToggle`, `infoBackdrop`, and `infoClose` lookups. Keep `infoTitle`
  (`HTMLHeadingElement`, id `info-title`) and the other `info-*` lookups. Add `screenBeats` and
  `screenBacking` (`HTMLButtonElement`, ids `screen-beats`, `screen-backing`), `beatsPage` and
  `backingPage` (`HTMLDivElement`, ids `beats-page`, `backing-page`).
- State: `let screenPage: 'beats' | 'backing' = 'beats';`.
- Add `function backingShown(): boolean { return !beatsScreen.hidden && screenPage === 'backing'; }`.
  Replace every `!infoBackdrop.hidden` check (in the `renderInfo()` refresh calls and in the
  `frame()` call to `updateInfoPosition()`) with `backingShown()`.
- Add `showPage(page: 'beats' | 'backing')`: set `screenPage = page`; `beatsPage.hidden =
  page !== 'beats'`; `backingPage.hidden = page !== 'backing'`; on both tab buttons toggle class
  `selected` and set `aria-selected` for the matching page. For `'beats'` call
  `updateBeatsScreen()` and focus the active `.beats-item`. For `'backing'` call `renderInfo()`,
  set `infoShownKey = ''`, call `updateInfoPosition()`, and focus `screenBacking`.
- Replace `openBeats()` with `openScreen(page: 'beats' | 'backing')`: when `page === 'beats'`,
  set `beatsCursor` to the index of `loadedPresetId` in `PRESETS` if found; then
  `beatsScreen.hidden = false` and `showPage(page)`.
- `closeBeats()` is renamed `closeScreen()`: `beatsScreen.hidden = true`, focus `beatsToggle`.
- Remove `openInfo()` and `closeInfo()`.
- Add `loadHighlighted()`: `const preset = PRESETS[beatsCursor]; if (preset) loadPreset(preset); closeScreen();`.
  The `beatsLoad` click handler calls `loadHighlighted()`. List item clicks are unchanged (they
  load and keep the screen open).
- Wiring: `beatsToggle` click → `openScreen('beats')`; `screenBeats` click → `showPage('beats')`;
  `screenBacking` click → `showPage('backing')`; `beatsClose` click → `closeScreen`; clicking the
  backdrop (`event.target === beatsScreen`) → `closeScreen`. Remove the old `infoToggle`,
  `infoClose`, and `infoBackdrop` listeners.
- Keyboard. Replace the Beats-screen block and the backing-info block at the top of the
  `window` `keydown` handler with one block that runs while `!beatsScreen.hidden`:
  - `Escape` → `closeScreen()`.
  - `i` / `I` (`event.key.toLowerCase() === 'i'`) → `closeScreen()` when `screenPage ===
    'backing'`, else `showPage('backing')`.
  - `Space` (`event.code === 'Space'`) → `event.preventDefault()`, then `togglePlay()` unless
    `event.repeat`.
  - Only when `screenPage === 'beats'`: `ArrowUp` → `preventDefault`, `moveBeatsCursor(-1)`;
    `ArrowDown` → `preventDefault`, `moveBeatsCursor(1)`; `Enter` → `preventDefault`,
    `loadHighlighted()`.
  - Every other key is ignored. Then `return`.
- In the closed-screen shortcut `switch`, `case 'i'` calls `openScreen('backing')` (instead of
  `openInfo()`). The start screen's own key handling is unchanged.
- `loadPreset`, `randomize`, and `undo` keep calling `updateBeatsScreen()` only when the screen is
  open; change those guards to `!beatsScreen.hidden && screenPage === 'beats'`.

### 3. `src/style.css`

- Delete the `#info-toggle` rule.
- `.tabs`: `grid-template-columns: repeat(5, minmax(0, 1fr));`.
- In `@media (max-height: 520px) and (orientation: landscape)`, replace the `#tabs`
  `grid-template-columns: repeat(3, minmax(0, 1fr));` with `repeat(6, minmax(0, 1fr))`, and add:
  ```css
  #tabs .hw { grid-column: span 2; }
  #tabs .hw:nth-child(n + 4) { grid-column: span 3; }
  ```
  (Mix, FX, Theme on the first row; Backing and Beats on the second.)
- Rename the `.info-head h2` selector to `.info-title` and add `margin: 0;` to it if missing.
- Add after the Beats screen rules:
  ```css
  .screen-tabs {
    display: flex;
    gap: 6px;
  }

  .screen-tabs .hw {
    min-height: 32px;
    padding-inline: 12px;
    font-size: 0.7rem;
  }

  .screen-tabs .hw.selected {
    color: var(--amber);
    background: #4a4655;
  }

  .screen-page {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .screen-page[hidden] {
    display: none;
  }
  ```
- Pads: `.pads` becomes `grid-template-columns: repeat(6, minmax(0, 1fr));`. Add to `.pad b`:
  `max-width: 100%; overflow: hidden; white-space: nowrap;`.
- Inside `@media (max-width: 760px)`, add:
  ```css
  .pad {
    padding-inline: 2px;
  }

  .pad b {
    font-size: min(0.72rem, 2.6vw);
  }

  .tempo .lcd {
    font-size: min(1.25rem, 4.6vw);
  }

  .tempo .lcd small {
    font-size: min(0.6rem, 2.2vw);
  }
  ```
  These must come after any existing `.pad`, `.pad b`, or `.lcd` rules in that media block so
  they win.
- In `@media (max-width: 380px)`, change the `.pad b` font size to `min(0.62rem, 2.6vw)`.

### 4. Docs

- `docs/guide.md`:
  - The Tab row bullet: **Mix**, **FX**, **♪ Theme**, **Backing**, and **Beats**.
  - In "Backing music", replace the **ⓘ** paragraph: the **Backing** page of the Beats screen
    (tap **Beats**, then the **Backing** tab, or press **I**) shows the description, the current
    mode, the song map with the playing section highlighted, the chords, the feel, and the tempo.
    **I** again, **Esc**, **✕**, or a click outside closes it; the music keeps playing. Change the
    image alt text to `The Backing page of the Beats screen`.
  - In "Beats: grooves, tunes, and Random": **Load** (or **Enter**) loads the highlighted preset
    and closes the screen; tapping a preset loads it and keeps the screen open.
  - Shortcut table: **I** → `Backing page of the Beats screen`. The sentence after the table:
    while the Beats screen is open, **Esc** closes it, **I** switches to or closes the Backing
    page, **Space** plays or pauses, and the arrow keys and **Enter** work on the Beats page;
    other keys are ignored.
- `docs/references.md`: update every mention of `#backing-info`, the `ⓘ` button, `openInfo`,
  and `closeInfo` to describe the Backing page (`#backing-page`) of `#beats-screen`,
  `openScreen(page)`, `showPage(page)`, `closeScreen()`, and `backingShown()`. The tab row
  sentence lists Mix, FX, Theme, Backing, and Beats. Line 71's `index.html` bullet says "the
  Beats screen with its Beats and Backing pages" instead of "the backing info dialog".

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'info-toggle' -- index.html src` prints nothing.
- `git grep -n -F 'backing-info' -- index.html src` prints nothing.
- `git grep -n -F 'infoBackdrop' -- src` prints nothing.
- `git grep -n -F 'id="backing-page"' -- index.html` prints one line.
- PowerShell: `(Select-String -Path index.html -Pattern 'class="hw tab"').Count` prints 5.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of the screen pages, Load closing, the tab rows, and the pads at a 412 px wide
  phone with a 120% root font size.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change presets, sounds, saved keys, share links, or shortcuts other than **I**.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line, type-only
  fix that doesn't change behavior, apply it and list it in the report instead of stopping.

## Out of scope

- Moving the sampler or themes onto the screen.
- New screenshots (the verifier retakes them).

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
