# Plan: Master volume in the Mix view, and a Theme tab with a theme picker

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), make two changes:

1. **Master volume** moves out of the header and into the Mix view, as its first slider,
   labeled **Master**. The header keeps only **Share**. Mute stays in the transport.
2. **Theme** moves out of the transport and into the tab row, between FX and Backing. It
   shows the current theme (e.g. `♪ Neon`). Clicking it opens a **Themes** view in the dock
   with one button per theme, the current one highlighted. Picking one applies it. Key **T**
   still cycles themes.

After this:

- **Header**: logo, Notes, Step, Page, Length, Follow, Share.
- **Tab row**: Mix, Beats, FX, Theme, Backing, ⓘ.
- **Transport**: Play, Stop, BPM, Mute, Clear.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- Header `.sys`: remove the whole `.levels` block. `#share-toggle` stays.
- `#mix-all`: insert as its **first** child:
  `<label class="fx-knob mix-master" style="--c: var(--cream)"><small>Master</small><input id="volume" type="range" min="0" max="100" step="1" value="100" aria-label="Master volume" title="Master volume" /></label>`
  This keeps the id `volume`, so the existing volume wiring (`volumeSlider`, `changeVolume`,
  `drumline-volume`) keeps working. It is **not** a `data-mix-channel` slider.
- Transport `.keys`: remove `#theme`.
- `#tabs`: insert
  `<button id="theme" class="hw tab" type="button" aria-expanded="false" aria-controls="themes" aria-label="Choose music theme">♪ Neon</button>`
  between `#fx-toggle` and `#backing`.
- `#dock`: after `#beats`, add
  `<div id="themes" class="fx-panel themes-panel" hidden><div id="theme-list" class="sample-list"></div></div>`.

### 2. `src/main.ts`

- `openPanel` gains `'themes'`.
- `updateDock`:
  - `themesPanel.hidden = view !== 'themes'`
  - set `aria-expanded` on `#theme`
  - toggle the `selected` class on `#theme` while its view is open, like the Mix and Beats
    tabs
- `toggleThemes()` works like `toggleMixAll`: it closes FX, Share, Mix, and Beats, and they
  close it. Picking an instrument does not close it.
- `themeButton` click → `toggleThemes()` (it no longer calls `cycleTheme`).
- Build the theme buttons once at startup from `THEMES`: one
  `<button class="hw" type="button" data-theme="<id>">` per theme with `theme.name` as its
  text and `theme.blurb` as its `title`. Clicking one calls
  `applyTheme(themeById(button.dataset.theme ?? null))`. Keep the panel open, so the player
  can audition themes.
- Add `updateThemeList()`, which toggles `selected` on the button whose `data-theme` equals
  `theme.id`. Call it from `applyTheme` and at startup.
- Key **T** still calls `cycleTheme()`. The list follows, because `applyTheme` updates it.
- `updateThemeButton()` keeps setting the tab text to `♪ ${theme.name}`.
- The volume code needs no change beyond working with the moved element. Check that
  `volumeSlider.value` is still set at startup.
- The keydown guard already ignores events from `HTMLInputElement`s, so the Master slider is
  covered.

### 3. `src/style.css`

- Remove the `.levels` and `.level` rules, and any media-query rules that size `.levels`.
  `#volume`'s own `accent-color` rule can stay.
- Header `.sys`: holds only Share. Keep it right-aligned and the same height as the LCD row.
- `.mix-all-panel`: 8 columns, `repeat(8, minmax(0, 1fr))` (Master plus seven channels).
  `.mix-master small { color: var(--cream); }` and `.mix-master input { accent-color: var(--cream); }`.
- `.tabs`: 6 buttons, `grid-template-columns: repeat(5, minmax(0, 1fr)) auto;`. `#theme.tab`
  shows the theme name on one line (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`).
  - Inside `@media (max-width: 760px)`: `.tabs .hw { font-size: 0.58rem; padding-inline: 2px; }`.
  - Phones held sideways: `#tabs` has 6 columns, `repeat(6, minmax(0, 1fr))`.
- `.themes-panel`: `grid-template-columns: 1fr;`. The list reuses `.sample-list`, so it scrolls
  sideways on narrow screens. Give its buttons the same height rules as the sample buttons
  (`min-height: 0; height: 34px; padding-block: 0;`) and `flex: 1 0 auto`.
- **Transport**: base `.keys` `repeat(6, 1fr)`: Play, Stop, tempo (span 2), Mute, Clear.
  - Inside `@media (max-width: 760px)`: keep 6 columns. Play, Stop, and tempo span 2 each
    (row 1). Mute and Clear span 3 each (row 2). Update the selectors that set spans so
    Mute and Clear get `span 3`.
  - Phones held sideways (2 columns): Play and Stop; tempo across both; Mute and Clear.
    Check that the selectors give exactly that.
- Desktop: the Instruments and Transport banks must still be equal height. That rule exists;
  check it still applies with fewer transport buttons.

### 4. Docs

- `README.md`:
  - The master volume is the **Master** slider in the Mix view. Mute is in the transport.
  - Theme is a tab in the tab row that opens a theme picker. **T** cycles.
  - Update the layout description (header, tab row, transport).
- `docs/references.md`: update the layout and dock paragraphs. Add the `themes` dock view to
  the `updateDock()` description.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="themes"' -- index.html` prints one line.
- PowerShell: `(Select-String -Path index.html -Pattern 'class="hw tab"').Count` prints 6.
- PowerShell: `Select-String -Path index.html -Pattern 'class="levels"'` prints nothing.
- `git grep -n -F 'id="volume"' -- index.html` prints one line, and it is inside `#mix-all`.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of the theme picker, Master volume, and the layouts.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change sounds, saved keys, ids, or other shortcuts.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New themes.
- Other layout changes.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
