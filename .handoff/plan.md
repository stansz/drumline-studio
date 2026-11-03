# Plan: Beats screen with Grooves and Tunes, and four new public-domain tunes

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`):

1. Replace the Beats row in the dock with a **Beats screen**: a pop-up styled like a drum machine's
   LCD that reuses the look of the existing backing info pop-up (`#backing-info`, classes
   `info-backdrop` / `info-panel` / `info-head`). It lists presets in two groups, **Grooves** and
   **Tunes**, shows details for the highlighted preset, and has ▲, ▼, Load, Random, and Undo.
2. Add four public-domain tunes as presets: In the Hall of the Mountain King, Ode to Joy, Für
   Elise, and Can-Can, each with its own scale.

## Files to touch

- `src/presets.ts`
- `tests/presets.test.ts`
- `index.html`
- `src/main.ts`
- `src/style.css`
- `docs/guide.md`
- `docs/references.md`
- `README.md`
- `.handoff/report.md`

## Steps

### 1. `src/presets.ts`

- Add to `interface Preset`: `kind: 'groove' | 'tune';` and `blurb: string;` (place them after
  `name`).
- Add these scales to `SCALES` (keep `'a-minor'`):
  ```ts
  'mountain-king': [69, 70, 71, 72, 74, 75, 76, 79], // A4 A#4 B4 C5 D5 D#5 E5 G5
  'c-major': [72, 74, 76, 77, 79, 81, 83, 84], // C5 D5 E5 F5 G5 A5 B5 C6
  'fur-elise': [64, 68, 69, 71, 72, 74, 75, 76], // E4 G#4 A4 B4 C5 D5 D#5 E5
  ```
- Give each existing preset `kind` and `blurb`:
  - `four-floor`: `'groove'`, `'A kick on every beat, offbeat hats, and a clap. Club basics.'`
  - `boom-bap`: `'groove'`, `'A laid-back hip-hop beat with a heavy kick and a crisp snare.'`
  - `breakbeat`: `'groove'`, `'A busy, broken drum pattern with ghost snares.'`
  - `trap`: `'groove'`, `'Rolling hi-hats, a sparse kick, and a deep bass.'`
  - `dembow`: `'groove'`, `'The bouncing reggaeton rhythm: steady kick, off-kilter snare.'`
  - `funk`: `'groove'`, `'A syncopated kick, a ghost snare, and a walking bass.'`
  - `korobeiniki`: `'tune'`, `'Russian folk song, 1861. The Tetris tune.'`
- Append these four presets after `korobeiniki`, in this order, exactly:
  ```ts
  {
    id: 'mountain-king',
    name: 'In the Hall of the Mountain King',
    kind: 'tune',
    blurb: 'Grieg, 1875. A sneaky minor riff from Peer Gynt.',
    themeId: 'techno',
    bpm: 64,
    length: 32,
    backing: 'off',
    scale: 'mountain-king',
    cells: [
      ...melody('synth', [
        [0, 7], [1, 5], [2, 4], [3, 3], [4, 1], [5, 4], [6, 1],
        [8, 2], [9, 5], [10, 2], [12, 3], [13, 6], [14, 3],
        [16, 7], [17, 5], [18, 4], [19, 3], [20, 1], [21, 4], [22, 1],
        [24, 0], [25, 1], [26, 4], [27, 1], [28, 0],
      ]),
      ...line('bass', 7, [2, 6, 10, 14, 18, 22, 26, 30]),
      ...line('kick', 6, [0, 8, 16, 24]),
      ...line('snare', 5, [4, 12, 20, 28]),
    ],
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    kind: 'tune',
    blurb: "Beethoven, 1824. The big tune from the Ninth Symphony.",
    themeId: 'neon',
    bpm: 60,
    length: 32,
    backing: 'off',
    scale: 'c-major',
    cells: [
      ...melody('synth', [
        [0, 5], [2, 5], [4, 4], [6, 3], [8, 3], [10, 4], [12, 5], [14, 6],
        [16, 7], [18, 7], [20, 6], [22, 5], [24, 5], [27, 6], [28, 6],
      ]),
      ...melody('bass', [
        [0, 7], [4, 7], [8, 6], [12, 3], [16, 5], [20, 7], [24, 3], [28, 3],
      ]),
      ...line('kick', 1, [0, 8, 16, 24]),
      ...line('snare', 2, [4, 12, 20, 28]),
    ],
  },
  {
    id: 'fur-elise',
    name: 'Für Elise',
    kind: 'tune',
    blurb: 'Beethoven, 1810. The piano piece everyone learns first.',
    themeId: 'lofi',
    bpm: 96,
    length: 32,
    backing: 'off',
    scale: 'fur-elise',
    cells: [
      ...melody('synth', [
        [0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 4], [6, 2], [7, 3],
        [8, 5], [12, 7], [13, 5], [14, 4], [17, 7], [18, 6], [19, 4],
        [20, 3], [23, 7], [24, 0], [25, 1], [26, 0], [27, 1], [28, 0], [29, 4], [30, 2], [31, 3],
      ]),
      ...melody('bass', [
        [10, 5], [16, 7], [22, 5],
      ]),
      ...line('kick', 6, [2, 8, 14, 20, 26]),
    ],
  },
  {
    id: 'can-can',
    name: 'Can-Can',
    kind: 'tune',
    blurb: 'Offenbach, 1858. The galop from Orpheus in the Underworld.',
    themeId: 'chiptune',
    bpm: 90,
    length: 32,
    backing: 'off',
    scale: 'c-major',
    cells: [
      ...melody('synth', [
        [0, 7], [2, 6], [3, 4], [4, 5], [5, 6], [6, 3], [8, 3], [10, 3], [11, 2], [12, 5], [13, 4],
        [14, 6], [16, 6], [18, 6], [19, 4], [20, 5], [21, 6],
        [22, 7], [23, 0], [24, 1], [25, 2], [26, 3], [27, 4], [28, 5], [29, 6], [30, 7],
      ]),
      ...melody('bass', [
        [1, 7], [5, 7], [9, 3], [13, 3], [17, 3], [21, 3], [25, 7], [29, 3],
      ]),
      ...line('kick', 4, [0, 4, 8, 12, 16, 20, 24, 28]),
      ...line('snare', 2, [2, 6, 10, 14, 18, 22, 26, 30]),
    ],
  },
  ```
  Format these arrays however Prettier-style line length requires; the values must not change.
- Update the comment above `PRESETS` to: `// Grooves are original beats named by style. Tunes are public-domain melodies: Korobeiniki
  // (1861), Grieg (1875), Beethoven (1810, 1824), and Offenbach (1858). Do not add copyrighted
  // songs.`

### 2. `tests/presets.test.ts`

- Replace the test `'gives the a-minor scale eight rising notes'` with
  `'gives every scale eight rising notes'`, looping over `Object.values(SCALES)`.
- Add `'gives every preset a kind and a short blurb'`: `kind` is `'groove'` or `'tune'`, and
  `blurb` is a non-empty string of at most 80 characters.
- Add `'lists the grooves before the tunes'`: in `PRESETS`, no `'groove'` comes after a
  `'tune'`.
- Add `'writes the four new tunes'`: for each of `mountain-king`, `ode-to-joy`, `fur-elise`,
  `can-can`, the preset exists, its `kind` is `'tune'`, its `scale` is defined in `SCALES`, its
  `length` is 32, and its first synth cell (the cell with the lowest `col` among synth cells) is,
  respectively, `{ instrument: 'synth', col: 0, row: 7 }`, `{ instrument: 'synth', col: 0, row: 5 }`,
  `{ instrument: 'synth', col: 0, row: 0 }`, `{ instrument: 'synth', col: 0, row: 7 }`.
- Keep every other test.

### 3. `index.html`

- In `#tabs`, change the Beats button to:
  `<button id="beats-toggle" class="hw tab" type="button" aria-haspopup="dialog" aria-controls="beats-screen">Beats</button>`
- Delete the whole `#beats` dock view (`<div id="beats" class="fx-panel beats-panel" hidden>…</div>`).
- After the `#backing-info` element, add:
  ```html
  <div id="beats-screen" class="info-backdrop" hidden>
    <div class="info-panel beats-panel" role="dialog" aria-modal="true" aria-labelledby="beats-title">
      <div class="info-head">
        <h2 id="beats-title">Beats</h2>
        <button id="beats-close" class="hw" type="button" aria-label="Close">✕</button>
      </div>
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
  </div>
  ```
  The ids `beat-random` and `beat-undo` are reused, so their existing wiring keeps working.

### 4. `src/main.ts`

- Remove `beatsPanel` and `presetList`, `addPresetButton`, `renderPresetButtons` and its call.
- `openPanel` type loses `'beats'`. In `updateDock`, remove the `beatsPanel` line and the two
  `beatsToggle` lines. Remove `toggleBeats`.
- The instrument-pick line `if (tool === 'sample' && openPanel !== 'beats') openPanel = null;`
  becomes `if (tool === 'sample') openPanel = null;` and its comment above is deleted.
- Add element lookups with `byId`: `beatsScreen` (`beats-screen`, `HTMLDivElement`), `beatsClose`,
  `beatsList` (`HTMLDivElement`), `beatsName`, `beatsMeta`, `beatsBlurb` (`HTMLParagraphElement`),
  `beatsUp`, `beatsDown`, `beatsLoad` (`HTMLButtonElement`).
- State: `let beatsCursor = 0;` (index into `PRESETS`) and `let loadedPresetId: string | null = null;`.
- `renderBeatsList()`: clears `beatsList`, then for each group in order `['groove', 'Grooves']`,
  `['tune', 'Tunes']` appends `<div class="beats-group" role="presentation">Grooves</div>` (or
  `Tunes`), then for each preset of that kind (in `PRESETS` order) a
  `<button class="beats-item" type="button" role="option" data-index="<index in PRESETS>">` with
  `preset.name` as text. Clicking an item sets `beatsCursor` to its index, calls `loadPreset`
  with that preset, and calls `updateBeatsScreen()`. Call `renderBeatsList()` once at startup
  where `renderPresetButtons()` was called.
- `updateBeatsScreen()`: for each `.beats-item`, toggle class `active` and set `aria-selected`
  when its index equals `beatsCursor`; toggle class `loaded` when its preset id equals
  `loadedPresetId`. Then fill the details from `PRESETS[beatsCursor]`:
  - `beatsName.textContent = preset.name`
  - `beatsMeta.textContent = \`${preset.bpm} BPM · ${themeById(preset.themeId).name} · ${preset.length} steps · Backing ${BACKING_LABEL[preset.backing]}\``
    with a local `const BACKING_LABEL = { song: 'Song', loop: 'Loop', off: 'Off' } as const;`
  - `beatsBlurb.textContent = preset.blurb`
  Then call `scrollIntoView({ block: 'nearest' })` on the active item.
- `moveBeatsCursor(delta: number)`: `beatsCursor = (beatsCursor + delta + PRESETS.length) % PRESETS.length`,
  then `updateBeatsScreen()`. It does not load.
- `openBeats()`: set `beatsCursor` to the index of `loadedPresetId` in `PRESETS` if found (else
  leave it), `updateBeatsScreen()`, `beatsScreen.hidden = false`, focus the active item.
- `closeBeats()`: `beatsScreen.hidden = true`, focus `beatsToggle`.
- Wiring: `beatsToggle` click → `openBeats`; `beatsClose` click → `closeBeats`; clicking
  `beatsScreen` itself (`event.target === beatsScreen`) → `closeBeats`; `beatsUp` click →
  `moveBeatsCursor(-1)`; `beatsDown` click → `moveBeatsCursor(1)`; `beatsLoad` click →
  `loadPreset(PRESETS[beatsCursor])` then `updateBeatsScreen()`.
- `loadPreset`: at the end set `loadedPresetId = preset.id` and, if `!beatsScreen.hidden`, call
  `updateBeatsScreen()`.
- `randomize` and `undo`: set `loadedPresetId = null`, and if `!beatsScreen.hidden` call
  `updateBeatsScreen()`.
- Keyboard: at the top of the `window` `keydown` handler, before the backing info check, add:
  while `!beatsScreen.hidden`:
  - `Escape` → `closeBeats()`
  - `ArrowUp` → `moveBeatsCursor(-1)`, `ArrowDown` → `moveBeatsCursor(1)`, both with
    `event.preventDefault()`
  - `Enter` → `event.preventDefault()`, load `PRESETS[beatsCursor]`, `updateBeatsScreen()`
  - `Space` (`event.code === 'Space'`) → `event.preventDefault()` and `togglePlay()`, unless
    `event.repeat`
  - every other key is ignored. Then `return`.
- Nothing else changes: presets still load live while playing, and the Undo button's
  `disabled` handling stays as it is.

### 5. `src/style.css`

- Delete the `.beats-panel` rule that sets `grid-template-columns: minmax(0, 1fr) auto auto;`
  and any other rules that only target the removed dock view (`#beats`, `#preset-list`).
- Add after the backing info rules:
  ```css
  /* ---- Beats screen ---- */
  .beats-panel {
    width: min(560px, 100%);
  }

  .beats-lcd {
    background: #101a14;
    box-shadow: inset 0 2px 0 #000, inset 0 -1px 0 #3a3743;
    padding: 8px;
    display: grid;
    gap: 8px;
  }

  .beats-list {
    display: flex;
    flex-direction: column;
    max-height: min(220px, calc(100dvh - 230px));
    min-height: 72px;
    overflow-y: auto;
  }

  .beats-group {
    font: 400 0.55rem/1 var(--label);
    color: var(--mute);
    padding: 8px 6px 4px;
  }

  .beats-item {
    all: unset;
    cursor: pointer;
    font: 400 1.2rem/1.2 var(--lcd);
    color: #cfe8c8;
    padding: 2px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .beats-item.active {
    background: var(--amber);
    color: #1d1a10;
  }

  .beats-item:focus-visible {
    outline: 2px solid var(--cream);
    outline-offset: -2px;
  }

  .beats-item.loaded::after {
    content: ' ♪';
  }

  .beats-detail {
    border-top: 1px solid #2c3a30;
    padding: 6px 6px 0;
    display: grid;
    gap: 2px;
  }

  .beats-name,
  .beats-meta,
  .beats-blurb {
    margin: 0;
    font: 400 1.1rem/1.2 var(--lcd);
  }

  .beats-name { color: var(--amber); }
  .beats-meta { color: var(--mute); }
  .beats-blurb { color: #cfe8c8; }

  .beats-controls {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
    gap: 6px;
  }

  .beats-controls .hw {
    min-height: 40px;
    padding-inline: 12px;
  }
  ```
- Inside `@media (max-height: 520px) and (orientation: landscape)`, add:
  `.beats-list { max-height: calc(100dvh - 190px); }` and
  `.beats-blurb { display: none; }`.

### 6. Docs

- `docs/guide.md`, section `## Beats: presets and Random`: rename the heading to
  `## Beats: grooves, tunes, and Random` (update the table of contents link to
  `#beats-grooves-tunes-and-random`). Rewrite it to say: **Beats** opens the Beats screen with two
  lists, **Grooves** (Four on the Floor, Boom Bap, Breakbeat, Trap, Dembow, Funk Groove) and
  **Tunes** (Korobeiniki, In the Hall of the Mountain King, Ode to Joy, Für Elise, Can-Can). The
  screen shows the highlighted preset's tempo, theme, length, Backing mode, and a one-line
  description. Tap a preset to load it; the screen stays open so you can try others. **▲** and
  **▼** (or the arrow keys) move the highlight without loading, and **Load** (or **Enter**)
  loads it. **Space** plays or pauses while the screen is open. The loaded preset is marked
  with ♪. Random and Undo work as before and are on the screen. Close it with **✕**, **Esc**, or
  a click outside it. Keep the sentence about what a preset sets and that the music keeps
  playing. Replace the Korobeiniki paragraph with one saying the tunes are public-domain
  melodies, each with its own scale, and **Clear** goes back to the theme's own scale. Keep the
  `![The Beats panel](images/beats.png)` image line as `![The Beats screen](images/beats.png)`.
  In `## The screen`, the Dock bullet's list of panels becomes "Mix, FX, or Share".
- `docs/references.md`: remove Beats from the dock paragraphs (the panels that share the dock
  are the mixer, sampler, FX, and Share; the open-panel list in the `updateDock()` sentence
  becomes FX, Share, or the `mixall` view). Add one paragraph: the Beats screen (`#beats-screen`)
  is a pop-up like the backing info screen; `renderBeatsList()` builds it from `PRESETS` grouped
  by `kind`, `updateBeatsScreen()` shows the highlighted preset (`beatsCursor`) and marks the
  loaded one (`loadedPresetId`), and the screen takes the keyboard while open.
- `README.md`: the Presets feature bullet becomes
  `- **Grooves and tunes:** six ready-made grooves and five public-domain tunes, from the Tetris
  tune to Ode to Joy, plus a random groove maker with undo.` In Credits, replace the Korobeiniki
  sentence with: `Korobeiniki (1861), In the Hall of the Mountain King (Grieg, 1875), Ode to Joy
  (Beethoven, 1824), Für Elise (Beethoven, 1810), and the Can-Can (Offenbach, 1858) are in the
  public domain.`

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="beats-screen"' -- index.html` prints one line.
- `git grep -n -F 'id="preset-list"' -- index.html src` prints nothing.
- `git grep -n -F "'beats'" -- src/main.ts` prints nothing.
- `git grep -n -F "id: 'can-can'" -- src/presets.ts` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of the Beats screen at desktop and phone sizes, and listening to the tunes.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change the cell values, scales, tempos, or themes given above, sounds, saved keys,
  share-link formats, or other shortcuts.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line, type-only
  fix that doesn't change behavior, apply it and list it in the report instead of stopping.

## Out of scope

- Moving the backing info into the Beats screen.
- Moving the sampler or themes into a screen.
- New screenshots (the verifier retakes them).

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
