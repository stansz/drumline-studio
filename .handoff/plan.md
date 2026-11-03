# Plan: rename Beats to Menu, and add theme and backing controls to the Music page

## Goal

Rename the "Beats" tab button to "Menu", rename the screen's "Backing" page tab to "Music", and add
theme and backing controls to the top of that Music page. Keep all existing element ids.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/themes.ts`
- `src/style.css`
- `tests/themes.test.ts`
- `docs/guide.md`
- `README.md`

## Steps

1. `src/themes.ts`: add, after `nextTheme`:
   ```ts
   export function previousTheme(current: Theme): Theme {
     const index = Math.max(0, THEMES.indexOf(current));
     return THEMES[(index - 1 + THEMES.length) % THEMES.length] ?? DEFAULT_THEME;
   }
   ```
2. `tests/themes.test.ts`: import `previousTheme`; add a test that `previousTheme(DEFAULT_THEME)` is
   `THEMES[THEMES.length - 1]`, and that for every theme `t` in `THEMES`,
   `previousTheme(nextTheme(t)) === t`.
3. `index.html`:
   - `#beats-toggle`: text `Menu`, `title="Beats, music, and sounds"`. Keep its id and aria attributes.
   - `#beats-screen .info-panel`: `aria-label="Menu"`.
   - `#screen-backing`: text `Music`.
   - In `#backing-page`, insert before `#info-title`:
     ```html
     <div class="music-controls">
       <span class="music-label">Theme</span>
       <div class="music-row">
         <button id="music-prev" class="hw" type="button" aria-label="Previous theme">◀</button>
         <span id="music-theme" class="music-lcd" aria-live="polite"></span>
         <button id="music-next" class="hw" type="button" aria-label="Next theme">▶</button>
       </div>
       <span class="music-label">Backing</span>
       <div class="music-row music-modes" role="radiogroup" aria-label="Backing music">
         <button id="music-song" class="hw" type="button" role="radio" data-mode="song">Song</button>
         <button id="music-loop" class="hw" type="button" role="radio" data-mode="loop">Loop</button>
         <button id="music-off" class="hw" type="button" role="radio" data-mode="off">Off</button>
       </div>
     </div>
     ```
4. `src/main.ts`:
   - Look up the new elements with `byId` next to the other screen elements.
   - Import `previousTheme` from `./themes`.
   - Add `type BackingMode = 'song' | 'loop' | 'off'`, `function backingMode(): BackingMode`
     (`!backing` → off, `sections` → song, else loop), and
     `function setBacking(mode: BackingMode): void` that sets `backing`/`sections`, then does exactly
     what `cycleBacking` does after changing them (`updateBackingButton()`, `renderInfo()` if
     `backingShown()`, `saveBackingSettings()`). Rewrite `cycleBacking` to call `setBacking` with the
     next mode in the order off → song → loop → off (same order as today).
   - `updateBackingButton()` also updates the three music mode buttons: the one matching
     `backingMode()` gets class `selected` and `aria-checked="true"`, the others lose `selected` and
     get `aria-checked="false"`.
   - `updateThemeButton()` also sets `musicTheme.textContent = theme.name` and
     `musicTheme.title = theme.blurb`.
   - Add `function previousThemeStep(): void { applyTheme(previousTheme(theme)); }`.
   - Clicks: `#music-prev` → `previousThemeStep`, `#music-next` → `cycleTheme`, each mode button →
     `setBacking(button.dataset.mode as BackingMode)`. None of them closes the screen.
   - Screen keyboard handler (the `if (!beatsScreen.hidden)` block): add, before the per-page
     branches, `t` → `cycleTheme()` and `b` → `cycleBacking()` (any page, ignore `event.repeat`). Add a
     `screenPage === 'backing'` branch: `ArrowLeft` → `previousThemeStep()`, `ArrowRight` →
     `cycleTheme()`, `ArrowUp`/`ArrowDown` → `setBacking` to the previous/next mode in the list
     `['song', 'loop', 'off']` (wrapping); `Enter` → `closeScreen()`. `preventDefault()` on each.
   - The `i` key and `openScreen('backing')` stay as they are.
   - Make sure the music buttons show the right state on load: `updateBackingButton()` and
     `updateThemeButton()` must run after the new elements are looked up.
   - Update comments and user-visible strings that say "Beats screen" (meaning the whole screen) to
     "Menu screen".
5. `src/style.css`, near the other screen styles:
   - `.music-controls`: `display: grid; grid-template-columns: auto 1fr; align-items: center;
     gap: 8px 10px;`
   - `.music-label`: `font: 400 0.55rem/1 var(--label); color: var(--mute);`
   - `.music-row`: `display: flex; gap: 6px; align-items: stretch;` and `.music-row .hw`:
     `min-height: 40px; padding-inline: 12px;` and `.music-modes .hw { flex: 1; }`
   - `.music-lcd`: `flex: 1; display: flex; align-items: center; justify-content: center;
     background: #101a14; box-shadow: inset 0 2px 0 #000, inset 0 -1px 0 #3a3743;
     font: 400 1.3rem/1 var(--lcd); color: #cfe8c8; min-height: 40px; padding-inline: 8px;`
   - `.music-modes .hw.selected { color: var(--amber); background: #4a4655; }`
6. `docs/guide.md`: describe the button as **Menu** and the screen as the Menu screen with the pages
   **Beats**, **Music**, and **Sounds**. The Music page (formerly the Backing page) has Theme ◀ ▶ and
   Song / Loop / Off at the top, above the backing info. Update the tab row list (Mix, FX, ♪ Theme,
   Backing, Menu), the shortcut table (**I** opens the Music page of the Menu screen), and the keys
   for while the screen is open: T next theme and B cycles backing on any page; on the Music page
   ←/→ change theme, ↑/↓ change backing, Enter closes. The Beats section says to open **Menu** (the
   Beats page is the first page). Image alt text "Backing page" → "Music page". Do not change image
   files.
7. `README.md`: Quick start step 2 says "open **Menu** and pick a preset".

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `grep -n "previousTheme" src/themes.ts src/main.ts tests/themes.test.ts` shows matches in all three files.
- `grep -c 'id="music-' index.html` prints `6`.
- `grep -n ">Menu<" index.html` matches the `#beats-toggle` line.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not rename existing element ids, CSS classes, functions, or `localStorage` keys.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- Follow `AGENTS.md`.

## Out of scope

- The tab row's ♪ Theme and Backing buttons stay as they are.
- No changes to theme sounds, presets, or the Beats and Sounds pages beyond the label changes.
- No new screenshots.

## If blocked

Stop and write what failed and why to `.handoff/report.md`.
