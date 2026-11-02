# Plan: Snare instead of Erase, one-line info, 32-step patterns

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), make three changes:

1. Replace the Erase tool with a fourth instrument, **Snare**. Clicking any existing note removes it.
2. Replace the instrument description readout above the pads with one short static line.
3. Allow 32-step patterns. A **Length** button toggles between 16 and 32 steps, and a **Page**
   button flips the board between steps 1–16 and 17–32.

## Files to touch

- `src/config.ts`
- `src/sequencer.ts`
- `src/audio.ts`
- `src/music.ts`
- `src/sprites.ts`
- `src/render.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/sequencer.test.ts`
- `tests/voices.test.ts`
- `tests/sprites.test.ts`
- `tests/loudness.ts`
- `README.md`
- `AGENTS.md`
- `docs/themes.md`
- `.handoff/report.md`

## Steps

### 1. `src/config.ts`

- Add `export const MAX_STEPS = 32;` directly below `STEPS_PER_BAR`. Leave `GRID_COLS = 16`
  unchanged: it now means "columns shown on screen at once" (one page).
- In `MIX`, add `snare: 0.32,` directly after `hat: 0.2,`.
- In `VOICE_LIMITS`, add `snare: 2` so it reads `{ kick: 2, hat: 2, snare: 2, synth: 3 }`.
- In `INSTRUMENT_INFO`, add
  `snare: { name: 'Snare', description: 'Noise crack with a short body. Higher rows sound tighter.' },`
  after `hat`.

### 2. `src/sequencer.ts`

- `export type Instrument = 'kick' | 'hat' | 'synth' | 'snare';`
- `export const INSTRUMENTS: readonly Instrument[] = ['kick', 'hat', 'synth', 'snare'];`
- Import `MAX_STEPS` from `./config`. Stop importing `GRID_COLS` and `STEPS_PER_BAR`.
- Add `export type PatternLength = 16 | 32;`
- Add the public field `length: PatternLength = 16;` to `Sequencer`.
- `inGrid` checks `col < MAX_STEPS` instead of `col < GRID_COLS`.
- Add these methods:

  ```ts
  // Notes past the length are kept, so switching back to 32 steps brings them back.
  setLength(length: PatternLength): void {
    this.length = length;
    if (this.stepIndex >= length) this.stepIndex = 0;
  }

  activeCells(): Cell[] {
    return this.cells.filter((cell) => cell.col < this.length);
  }
  ```

- In `step()`, wrap with `% this.length` instead of `% STEPS_PER_BAR`.
- Leave `set`, `erase`, `clear` (which still removes notes on all 32 steps), `rewind`, and
  `cellAt` unchanged.

### 3. `src/audio.ts`

- In `playNote`, add a branch before the final `else`:
  `} else if (instrument === 'snare') { this.playSnare(row, time, level); }`
- Add this method directly after `playHat`:

  ```ts
  private playSnare(row: number, time: number, level: number): void {
    const kit = this.theme.drumKit;
    const lift = 7 - clampRow(row);
    const decay = kit.snareDecay * 1.5;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffers.white;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kit.snareHz + lift * 180;
    filter.Q.value = 0.9;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.max(MIX.snare * level, 0.0001), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.towerBus);
    source.start(time);
    source.stop(time + decay + 0.01);

    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(190 + lift * 14, time);
    body.frequency.exponentialRampToValueAtTime(130 + lift * 10, time + 0.06);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(Math.max(MIX.snare * 0.7 * level, 0.0001), time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    body.connect(bodyGain);
    bodyGain.connect(this.towerBus);
    body.start(time);
    body.stop(time + 0.1);
  }
  ```

  Use the same `clampRow` helper that `playHat` uses.

### 4. `src/music.ts`

- In `pickVoices`, iterate over `INSTRUMENTS` (import it from `./sequencer`) instead of the
  literal `['kick', 'hat', 'synth'] as const`.

### 5. `src/sprites.ts`

- Delete the sprites `blip`, `runner`, `brute`, `boss`, and `sell`, and remove them from
  `SpriteName`.
- Add `snare` to `SpriteName` (`'kick' | 'hat' | 'synth' | 'snare'`) and add this entry to
  `SPRITES` after `synth`:

  ```ts
  snare: [
    [
      '................',
      '..40........04..',
      '...40......04...',
      '....40....04....',
      '................',
      '..000000000000..',
      '.05555555555550.',
      '.00000000000000.',
      '.0g4gggggggg4g0.',
      '.0g4gggggggg4g0.',
      '.0hhhhhhhhhhhh0.',
      '.00000000000000.',
      '..0..........0..',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '..440......044..',
      '....40....04....',
      '..000000000000..',
      '.06666666666660.',
      '.00000000000000.',
      '.0i4iiiiiiii4i0.',
      '.0i4iiiiiiii4i0.',
      '.0hhhhhhhhhhhh0.',
      '.00000000000000.',
      '..0..........0..',
      '................',
      '................',
      '................',
    ],
  ],
  ```

- Change the file's first comment line to:
  `// Every sprite is a pair of frames: idle, then strike.`

### 6. `src/render.ts`

- Rename `TOWER_FLASH` to `NOTE_FLASH`.
- Add `snare: PIXEL_COLORS.g,` to `NOTE_OUTLINE`.
- `RenderState`:
  - `selected: Instrument;` (no `'erase'`).
  - Add `page: number;` (0 shows steps 1–16, 1 shows steps 17–32).
  - `playhead` stays the absolute step index (0–31).
  - `hover` stays in on-screen coordinates (`col` 0–15).
- Use `GRID_COLS` (already imported) as the page width:
  `const offset = state.page * GRID_COLS;`
- `drawPlayhead`: take `(playhead: number, page: number)`. Draw nothing when
  `Math.floor(playhead / GRID_COLS) !== page`. Otherwise draw at on-screen column
  `playhead % GRID_COLS`, and pick the color from that on-screen column.
- `drawPreview`: remove the `selected === 'erase'` check. Look the cell up with
  `sequencer.cellAt(offset + hover.col, hover.row)`. When that cell holds a note (any
  instrument), draw `this.strokeTile(hover.col, hover.row, PIXEL_COLORS.r)` instead of the
  preview, because clicking it removes it. Otherwise draw the dithered preview as now.
- Delete `drawEraseOutline` and its call.
- `drawNotes`: draw only cells with `Math.floor(cell.col / GRID_COLS) === state.page`, at
  x = `(cell.col - offset) * ART_CELL`. Keep the flash lookup keyed by the absolute
  `` `${cell.col},${cell.row}` ``.
- `draw` passes `state.page` to `drawPlayhead`.

### 7. `index.html`

- Replace the `#tool-erase` button with:
  `<button id="tool-snare" class="pad" type="button"><span class="led"></span><canvas data-sprite="snare" width="16" height="16"></canvas><b>Snare</b><kbd>4</kbd></button>`
- In `.lcds`, after the Step LCD, add
  `<button id="page" class="hw" type="button" hidden>Page 1</button>`.
- In `.keys`, after `#clear`, add
  `<button id="length" class="hw" type="button">16 steps</button>`.

### 8. `src/main.ts`

- Import `INSTRUMENTS` and `type PatternLength` from `./sequencer`. Remove the `GRID_ROWS`
  import only if it becomes unused.
- Replace `eraseButton` with `snareButton = byId<HTMLButtonElement>('tool-snare')`. Add
  `pageButton = byId<HTMLButtonElement>('page')` and
  `lengthButton = byId<HTMLButtonElement>('length')`.
- `let selected: Instrument = 'kick';` and `selectTool(tool: Instrument)`. Remove every
  `'erase'` tool branch. `updateSelection` toggles `selected` on all four pads.
- Add `let page = 0;`.
- Board coordinates: `cellAt(event)` keeps returning on-screen `{ col, row }`. Whenever a
  sequencer method is called with a hovered or clicked cell, pass `page * GRID_COLS + col`.
- Pointer painting (`pointerdown`):
  - If the clicked step holds a note of any instrument, or `event.button === 2`, set
    `paint = 'erase'`. Otherwise set `paint = 'add'`.
  - `applyPaint` in `'add'` mode calls `sequencer.set(selected, step, row)`. In `'erase'` mode
    it calls `sequencer.erase(step, row)`.
- Add `canvas.addEventListener('contextmenu', (event) => event.preventDefault());`.
- Info line:
  - Delete `updateInfo` and its hover text. Keep `updateStepHints`, and call it everywhere
    `updateInfo` was called.
  - At startup, set
    `infoEl.textContent = 'Click or drag to paint. Click a note to remove it. Higher rows play higher.';`
    once.
  - At startup, for each name in `INSTRUMENTS`, set the `title` of button `tool-${name}` to
    `` `${INSTRUMENT_INFO[name].name}: ${INSTRUMENT_INFO[name].description}` ``.
- Pattern length and page:

  ```ts
  function setLength(length: PatternLength): void {
    sequencer.setLength(length);
    if (length === 16) setPage(0);
    lengthButton.textContent = `${length} steps`;
    lengthButton.classList.toggle('selected', length === 32);
    pageButton.hidden = length === 16;
    updateHud();
  }

  function setPage(next: number): void {
    page = next;
    pageButton.textContent = `Page ${page + 1}`;
    stepLeds.forEach((led, i) => {
      const number = led.querySelector('em');
      if (number) number.textContent = i % 4 === 0 ? String(page * GRID_COLS + i + 1) : '';
    });
    stepLeds[litStep]?.classList.remove('on');
    litStep = -1;
  }
  ```

  - `lengthButton` click: `setLength(sequencer.length === 16 ? 32 : 16)`.
  - `pageButton` click: `setPage(page === 0 ? 1 : 0)`.
  - Keys: `'4'` selects `'snare'`. `'l'` toggles length like the button. `'p'` flips the
    page only when `sequencer.length === 32`.
  - Call `setLength(16)` at startup, after the step LEDs are created.
- `updateHud`: Notes shows `sequencer.activeCells().length`. Step shows
  `` `${String(playhead + 1).padStart(2, '0')}/${sequencer.length}` ``.
- `frame()`: the LED to light is `playhead % GRID_COLS` when
  `Math.floor(playhead / GRID_COLS) === page`, else none (`-1`). Compare it with `litStep` and
  update the `on` classes as now. Call `updateHud()` whenever `playhead` changes (not only when
  the lit LED changes). Pass `page` in the `renderer.draw` state.
- `onStep`:
  - Backing intensity uses `sequencer.activeCells().length`.
  - The metronome condition uses `sequencer.activeCells().length === 0`.
- `clearPattern` calls `updateHud()` and `updateStepHints()`.
- `window.__drumline` is unchanged.

### 9. `src/style.css`

- `.readout`:
  - Add `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`.
  - Change the font size to `1.1rem` (keep the other font settings).
  - Set `min-height: 0;` and `padding: 3px 10px;`.
- Delete the `#info { min-height: 3.3em; }` rule inside `@media (max-width: 760px)`.
- `.keys` (base rule): `grid-template-columns: repeat(8, 1fr);`.
- Inside `@media (max-width: 760px)`:
  - Change `.keys` to `grid-template-columns: repeat(4, 1fr);`.
  - Change `.hw.go, .tempo` to `grid-column: span 2;`.
  - Delete the `.keys > .hw:not(.go) { grid-column: span 2; }` rule.
- Inside the `@media (max-height: 520px) and (orientation: landscape)` block, delete the
  `.keys > .hw:not(.go) { grid-column: auto; }` rule. Keep its `.hw.go, .tempo` span-2 rule.
- Add `#page { min-height: 0; padding: 2px 10px; }` after the `.lcd small` rule, so the page
  button matches the LCD height.

### 10. Tests

- `tests/sequencer.test.ts`:
  - Update any test that uses column 16 as "outside the grid" to use column 32.
  - Add tests:
    - Default `length` is 16, and `step()` wraps from 15 to 0.
    - After `setLength(32)`, `step()` reaches index 20 and returns a note placed at column 20,
      then wraps from 31 to 0.
    - `set('kick', 31, 0)` returns true. `set('kick', 32, 0)` returns false.
    - With a note at column 20 and length 16, `activeCells()` excludes it, `cells` keeps it,
      and 32 calls to `step()` never return it.
    - `setLength(16)` while `stepIndex` is 20 resets `stepIndex` to 0.
- `tests/voices.test.ts`: include `'snare'` wherever the three instruments are listed, and
  expect the snare limit of 2.
- `tests/sprites.test.ts`:
  - The one-cell size test covers `['kick', 'hat', 'synth', 'snare']`. Rename it to
    `'keeps instruments inside one board cell'`.
  - Add a test:
    `expect(Object.keys(SPRITES).sort()).toEqual(['hat', 'kick', 'snare', 'synth']);`
- `tests/loudness.ts`: set `const INSTRUMENTS: Instrument[] = ['kick', 'hat', 'synth', 'snare'];`.
  Change `sequencer.cells.length` to `sequencer.activeCells().length`.

### 11. Docs

- `README.md`, "How to use" and "Controls":
  - Four instruments: Kick, Hat, Synth, Snare on keys 1–4. Clicking or dragging over a note
    removes it, and right-click also removes. Remove all mention of Erase.
  - **Length** switches between 16 and 32 steps (key **L**). With 32 steps, **Page** flips
    the board between steps 1–16 and 17–32 (key **P**). Notes on steps 17–32 are kept but
    silent while the length is 16.
- `AGENTS.md`: change the rule "Each note plays only on its own column's step." to
  "Each note plays only on its own step, and only while that step is within the pattern
  length."
- `docs/themes.md`: add one sentence saying the playable snare uses each theme's
  `drumKit.snareHz` and `drumKit.snareDecay`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, and its output includes the new sequencer tests.
- `git grep -n -E "tool-erase|'sell'|runner|brute|boss|blip|TOWER_FLASH|=== 'erase'|Instrument \| 'erase'" -- src index.html tests`
  prints nothing (exit 1).
- `git grep -n "data-sprite=\"snare\"" -- index.html` prints one line.
- `git grep -n "id=\"length\"" -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change themes, tempo, or backing music behavior.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- In `src/render.ts`, keep to whole art pixels. Don't use `arc`, `shadowBlur`, `globalAlpha`,
  `setLineDash`, `fillText`, or `ctx.scale`.

## Out of scope

- Auto-following the playhead across pages.
- Saving patterns or the length to `localStorage`.
- A looper, FX, or instruments beyond Snare.
- Refreshing `tests/loudness-baseline.ts`.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
