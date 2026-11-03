# Plan: Beat presets, Randomize, and a Tetris-style preset

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add a **Beats** dock view,
opened by a **Beats** button in the transport. It holds:

- **Preset buttons**: one tap loads a premade beat. A preset sets the pattern (drums,
  samples, synth, bass), length, tempo, theme, and Backing mode. Some presets also set a
  synth **scale**.
- **🎲 Random**: replaces the pattern with a fresh, musical random groove. Theme, tempo, and
  length stay as they are.
- **Undo**: restores the pattern, and the settings a preset changed, from just before the last
  preset or Random. One level of undo.

A preset can carry a named **scale** that replaces the theme's synth scale. Bass uses the
same scale. This lets the **Korobeiniki** preset (the public-domain folk tune behind Tetris)
play in A natural minor. The scale is saved with the pattern and carried in share links (a
new `v5` format; v1–v4 still load). **Clear** resets the scale to the theme's.

## Files to touch

- `src/presets.ts` (new)
- `src/random.ts` (new)
- `src/audio.ts`
- `src/pattern.ts`
- `src/midi.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/presets.test.ts` (new)
- `tests/random.test.ts` (new)
- `tests/pattern.test.ts`
- `tests/midi.test.ts`
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/presets.ts` (new; no DOM, no audio, no storage)

```ts
import type { Cell, Instrument, PatternLength } from './sequencer';

// Named synth scales, low to high, one MIDI note per board row (index 0 is the bottom row).
export const SCALES: Readonly<Record<string, readonly number[]>> = {
  'a-minor': [69, 71, 72, 74, 76, 77, 79, 81], // A4 B4 C5 D5 E5 F5 G5 A5
};

export function scaleNotes(id: string | null | undefined): readonly number[] | null {
  return id ? (SCALES[id] ?? null) : null;
}

export type BackingMode = 'song' | 'loop' | 'off';

export interface Preset {
  id: string;
  name: string;
  themeId: string;
  bpm: number;
  length: PatternLength;
  backing: BackingMode;
  scale: string | null;
  cells: Cell[];
}

// Notes for one instrument on one row at the given steps.
function line(instrument: Instrument, row: number, steps: readonly number[], sample?: string): Cell[] {
  return steps.map((col) => (sample ? { instrument, col, row, sample } : { instrument, col, row }));
}

// Melody notes as [step, row] pairs.
function melody(instrument: Instrument, notes: ReadonlyArray<readonly [number, number]>): Cell[] {
  return notes.map(([col, row]) => ({ instrument, col, row }));
}

export const PRESETS: readonly Preset[] = [ /* see below */ ];

export function presetById(id: string): Preset | null {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}
```

Write `PRESETS` with exactly these entries. Rows run 0 (top) to 7 (bottom). Steps are
16ths unless noted. The board holds one note per `(step, row)`, so kicks sit on row 6 and
leave row 7, the bass's root, free. Every entry below is collision-free.

1. `four-floor`, "Four on the Floor": techno, 124 BPM, length 16, backing `song`, scale null.
   - kick row 6: 0, 4, 8, 12
   - hat row 1: 2, 6, 10, 14
   - sample `clap` row 7: 4, 12
   - bass row 7: 2, 6, 10, 14
2. `boom-bap`, "Boom Bap": lofi, 90 BPM, length 16, backing `song`, scale null.
   - kick row 6: 0, 7, 10
   - snare row 5: 4, 12
   - hat row 2: 0, 2, 4, 6, 8, 10, 12, 14
   - bass: row 7 at 0, row 5 at 10
3. `breakbeat`, "Breakbeat": funk, 112 BPM, length 16, backing `song`, scale null.
   - kick row 6: 0, 2, 10
   - snare row 5: 4, 12
   - snare row 1 (a tight ghost): 7, 15
   - hat row 3: 0, 2, 4, 6, 8, 10, 12, 14
   - bass: row 7 at 0, row 4 at 10
4. `trap`, "Trap": neon, 140 BPM, length 16, backing `loop`, scale null.
   - kick row 6: 0, 11
   - sample `clap` row 7: 8
   - hat row 2: every step 0–15
   - bass: row 7 at 0, row 7 at 11, row 4 at 14
5. `dembow`, "Dembow": funk, 96 BPM, length 16, backing `song`, scale null.
   - kick row 6: 0, 4, 8, 12
   - snare row 4: 3, 6, 11, 14
   - bass: row 7 at 0 and 8
6. `funk`, "Funk Groove": funk, 104 BPM, length 16, backing `song`, scale null.
   - kick row 6: 0, 6, 10
   - snare row 5: 4, 12
   - snare row 1: 9
   - hat row 2: 0, 2, 4, 6, 8, 10, 12, 14
   - bass: row 7 at 0, row 5 at 3, row 7 at 6, row 4 at 10, row 6 at 14
7. `korobeiniki`, "Korobeiniki (Tetris tune)": chiptune, 80 BPM, length 32, backing `off`,
   scale `a-minor`. Here each step is an eighth note: at 80 BPM, 16ths at 320 per minute
   give a brisk eighth-note pulse. In the scale, row 7 is A4, row 6 B4, row 5 C5, row 4 D5,
   and row 3 E5.
   - synth melody `[step, row]`:
     `[0,3],[2,6],[3,5],[4,4],[6,5],[7,6],[8,7],[10,7],[11,5],[12,3],[14,4],[15,5],[16,6],[19,5],[20,4],[22,3],[24,5],[26,7],[28,7]`
   - bass (two octaves down: row 3 is E3, and row 0 is A3): row 3 at 2, 4, 16, 20; row 0 at 8,
     12, 24, 28
   - kick row 1: 0, 8, 16, 24
   - snare row 2: 4, 12, 20, 28
   - no hats

Add a comment above `PRESETS` saying genre presets are original grooves named by style, and
that Korobeiniki is a 19th-century folk song in the public domain. Do not name presets after
copyrighted songs.

### 2. `src/random.ts` (new; no DOM, no audio, no storage)

```ts
import type { Cell } from './sequencer';

export type Rng = () => number; // 0 <= value < 1

// A seeded generator for tests and repeatable results.
export function seededRng(seed: number): Rng {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// A musical random 16-step groove: kick on the downbeat, snare on 2 and 4, a hat pattern,
// a bass line that follows the kick, and a few synth notes in key (rows are scale degrees).
export function randomPattern(rng: Rng): Cell[] { /* rules below */ }
```

Rules for `randomPattern` (16 steps; rows 0–7):

- **Kick** (row 6): always on 0. On 8 with chance 0.8. On each other even step with chance
  0.2, and on each odd step with chance 0.08.
- **Snare** (row 5): always on 4 and 12. A ghost on row 1, on one random odd step, with
  chance 0.4.
- **Hat** (row 2 or 3, chosen once): pick one pattern with equal chance:
  - every even step
  - every step
  - offbeats only (2, 6, 10, 14)
- **Bass**: on every kick step with chance 0.85. Row picked from `[7, 7, 5, 4, 3]` with equal
  chance per note. One bass note per step.
- **Synth**: 3–6 notes (picked uniformly) on distinct random steps, rows picked from 1–6.
- **Sample**: with chance 0.5, add `clap` on 4 and 12 (row 7, `sample: 'clap'`). Sample cells
  must carry a `sample`.
- At most one note per cell. Where two rules want the same `(col, row)`, keep the first by
  rule order: kick, snare, hat, bass, synth, sample.
- Use only `rng` for randomness.

### 3. `src/audio.ts`

- Add `private scaleOverride: readonly number[] | null = null;` and
  `setScale(notes: readonly number[] | null): void { this.scaleOverride = notes; }`.
- `playSynth` and `playBassNote` read `const scale = this.scaleOverride ?? this.theme.synth.scale;`
  instead of `this.theme.synth.scale`.

### 4. `src/pattern.ts`

- `SavedPattern` gains optional `scale?: string`.
- Autosave JSON (`v: 1`) writes `scale` when present. `parsePattern` reads it only if it
  matches `/^[a-z0-9-]{1,24}$/`.
- **Share `v5`**: the same as `v4`, plus a scale part after the sample id:
  `v5.<length>.<bpm>.<theme>.<sample>.<scale>.<table>.<cells>` (8 parts). `<scale>` is empty
  for "theme scale", or an id matching `/^[a-z0-9-]{1,24}$/`.
  - `encodeShare` writes `v5`.
  - `decodeShare` accepts `v5`, and still accepts `v4`, `v3`, `v2`, and `v1` (with no
    scale).
  - Update the format comment.

### 5. `src/midi.ts`

`patternToMidi`'s `synthScale` parameter now receives the active scale (override or theme)
from the caller. If the code only uses that parameter, no internal change is needed. Check
it.

### 6. `index.html`

- In `.keys`, after `#length`, add `<button id="beats-toggle" class="hw" type="button" aria-expanded="false" aria-controls="beats">Beats</button>`.
- In `#dock`, after `#mix-all`, add:

  ```html
  <div id="beats" class="fx-panel beats-panel" hidden>
    <div id="preset-list" class="sample-list"></div>
    <button id="beat-random" class="hw" type="button" title="Random groove">🎲 Random</button>
    <button id="beat-undo" class="hw" type="button" disabled>Undo</button>
  </div>
  ```

### 7. `src/main.ts`

- `openPanel` gains `'beats'`. In `updateDock`, `beatsPanel.hidden = view !== 'beats'`, and set
  `aria-expanded` and the `selected` class on `#beats-toggle` like the Mix button.
- `toggleBeats()` works like `toggleMixAll`. Picking an instrument does **not** close Beats,
  so you can audition and keep it open. Opening FX, Share, or Mix closes it, and the other
  way round.
- State: `let scaleId: string | null = null;`.
  - Apply it with `audio?.setScale(scaleNotes(scaleId))` in `startAudio` and wherever
    `scaleId` changes.
  - Save it in `savePattern` (`scale: scaleId ?? undefined`).
  - Restore it from the autosave and from shared links.
- `clearPattern` also sets `scaleId = null` and applies it.
- **Undo snapshot**:

  ```ts
  interface Snapshot { cells: Cell[]; length: PatternLength; bpm: number; themeId: string; backing: boolean; sections: boolean; scaleId: string | null }
  let undoSnapshot: Snapshot | null = null;
  ```

  - `takeSnapshot()` deep-copies the cells.
  - `restoreSnapshot(s)`:
    - Restore the cells through `loadCells`, then the length through `setLength`, then the
      tempo through `setBpm`.
    - Set the theme the same way `cycleTheme` applies one (factor out an
      `applyTheme(theme)` helper from `cycleTheme` if needed).
    - Set `backing` and `sections`, save them, and call `updateBackingButton()`.
    - Set `scaleId` and apply it.
    - Save the pattern.
- `loadPreset(preset)`:
  - Take the snapshot.
  - Load the cells, set the length, tempo, and theme (`themeById(preset.themeId)`), and the
    backing mode (`song`: backing on and sections on; `loop`: backing on and sections off;
    `off`: backing off). Set `scaleId = preset.scale`.
  - Save everything, update the HUD, and enable Undo.
  - If playing, keep playing: the new pattern takes over on the next step.
- `randomize()`:
  - Take the snapshot.
  - `loadCells(randomPattern(Math.random))`, and `setLength(16)` if the length is 32.
  - Theme, tempo, backing, and scale stay as they are.
  - Save, and enable Undo.
- `undo()`: if there is a snapshot, restore it, clear it, and disable Undo.
- Build the preset buttons at startup from `PRESETS`, the same way as the sample buttons.
  Clicking one calls `loadPreset`.
- Key: none (layout and keys get reviewed later).
- **Share link**: include `scale: scaleId ?? ''` when encoding. A shared beat restores
  `scaleId` (it must be a known id in `SCALES`, otherwise null).
- **MIDI**: pass `scaleNotes(scaleId) ?? theme.synth.scale` as the scale.

### 8. `src/style.css`

- `.beats-panel { grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; }`.
- The preset list reuses `.sample-list` (horizontal scroll). `#beat-random` and `#beat-undo`
  use the same height rules as `#sample-mic` and `#sample-file`.
- `.keys` gets one more column (base `repeat(9, 1fr)`). In the narrow layout, keep the grid
  as it is and let Beats wrap. The layout gets reviewed separately.

### 9. Tests

- `tests/presets.test.ts`:
  - Ids are unique.
  - Every preset's theme id exists in `THEMES`.
  - BPM is within 40–300.
  - Every cell is inside the grid (`col < length`, `row` 0–7), and its instrument is in
    `INSTRUMENTS`.
  - No two cells share a position.
  - Every sample cell has a `sample` that is a preset sample id.
  - `scale` is null or a key of `SCALES`.
  - `SCALES['a-minor']` has 8 rising notes.
  - The Korobeiniki preset has 19 synth notes, and its first synth note is step 0, row 3.
- `tests/random.test.ts`:
  - The same seed gives the same pattern, and different seeds usually differ: check that
    seeds 1 and 2 differ.
  - For 50 seeds:
    - kick on step 0 row 6 always
    - snare on 4 and 12 always
    - all cells inside 16×8, with no duplicate positions
    - every sample cell has `sample: 'clap'`
    - 3–6 synth notes
    - at most one bass note per step, only on kick steps
- `tests/pattern.test.ts`:
  - `v5` round-trips with scale `'a-minor'` and with an empty scale.
  - Update the format regex.
  - A v4 link built in the test still decodes.
  - Autosave round-trips `scale`, and an invalid scale is dropped.
- `tests/midi.test.ts`: no change needed unless the signature changes.

### 10. Docs

- `README.md`: a `### Beats` subsection covering:
  - the presets list with names
  - what loading a preset changes
  - Random, and what it keeps
  - Undo (one level)
  - the Korobeiniki note (public-domain folk tune; the preset sets an A-minor scale for the
    synth and bass, and Clear resets it)
- `AGENTS.md`:
  - Add `src/presets.ts` and `src/random.ts` to the list of files kept free of the DOM,
    audio, and storage.
  - Add: "Presets are original grooves named by genre, plus public-domain melodies. Don't add
    copyrighted songs."
  - Update the share-link rule to mention `v5`.
- `docs/references.md`:
  - Files.
  - The `v5` format.
  - The autosave `scale` field.
  - The scale override in the audio chain.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/presets.ts src/random.ts tests/presets.test.ts tests/random.test.ts`
  prints all four paths.
- PowerShell: `Select-String -Path src/presets.ts,src/random.ts -Pattern 'document|window|localStorage|AudioContext|Math\.random'`
  prints nothing.
- `git grep -n -F "'v5'" -- src/pattern.ts` prints at least one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of presets, Random, Undo, the Korobeiniki melody notes, and share/reload
  keeping the scale.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change theme values, instrument sounds, sections, the mixer, or the sampler.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- A layout redesign.
- Saving user presets.
- More scales.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
