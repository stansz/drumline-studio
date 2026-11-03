# Plan: Each Sample note keeps the sound it was painted with

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), all Sample notes play
whichever sample sound is currently picked. Picking another sound changes every Sample note
already on the board, including its color, and players read that as the app changing their
pattern.

Make each Sample note store its own sound id. The rules:

- Painting with Sample stores the currently picked sound on the new note.
- Picking a sound in the sampler only affects notes painted afterwards.
- Each note plays and is colored by its own sound.
- Autosave, share links (a new `v3` format; `v1` and `v2` still load), and MIDI export carry
  each note's sound.

## Files to touch

- `src/sequencer.ts`
- `src/samples.ts`
- `src/audio.ts`
- `src/render.ts`
- `src/pattern.ts`
- `src/midi.ts`
- `src/main.ts`
- `tests/sequencer.test.ts`
- `tests/samples.test.ts`
- `tests/pattern.test.ts`
- `tests/midi.test.ts`
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/sequencer.ts`

- `Cell` and `NoteEvent` gain `sample?: string`, set only for `instrument === 'sample'`.
- `set(instrument, col, row, sample?: string): boolean`:
  - For non-sample instruments, ignore `sample` and store no `sample` field.
  - For `'sample'`, store `sample` (may be undefined).
  - When the cell already holds the same instrument **and** the same `sample`, return false
    with no change.
  - When it holds the same instrument with a different `sample`, update `sample` and return
    true.
  - When it holds a different instrument, replace the instrument and set or clear `sample`,
    then return true.
  - Otherwise append the new cell, as now.
- `step()` copies `sample` into each `NoteEvent` when present.

### 2. `src/samples.ts`

Add:

```ts
// The preset or user sample a note's id refers to. Unknown ids fall back to Clap; 'mine'
// always resolves to USER_SAMPLE, so its notes keep their color before the sound loads.
export function sampleForNote(id: string | undefined): SamplePreset {
  return id === USER_SAMPLE.id ? USER_SAMPLE : sampleById(id ?? null);
}
```

### 3. `src/audio.ts`

- `playNote(instrument, row, time, voiceCount, sample?: string)`: pass `sample` to
  `playSample`.
- `playSample(row, time, level, sample?: string)`:
  - Use `this.samples.get(sample ?? this.sampleId)`.
  - If that buffer is missing (for example `'mine'` before it loads), fall back to
    `this.samples.get(DEFAULT_SAMPLE)`. Return only if both are missing.
- `auditionSample()` stays the same: it plays the currently picked sound.

### 4. `src/render.ts`

- `drawNotes`: for a sample cell, use `sampleFrames(sampleForNote(cell.sample).color)`, and
  use that color for its flash outline, instead of `state.sampleColor`.
- `drawPreview` and `drawIcon` keep using `state.sampleColor` / the picked sound, because
  they show what will be painted.

### 5. `src/pattern.ts`

- `validCell(instrument, col, row, sample?)`: for `'sample'` cells, keep `sample` only if it
  is a string matching `/^[a-z0-9-]{1,24}$/`. Otherwise leave it undefined. Never set
  `sample` on other instruments.
- **Autosave JSON**:
  - `serializePattern` writes a fourth element for sample cells that have a `sample`:
    `[instrument, col, row, sample]`.
  - `parsePattern` reads an optional fourth element.
  - Keep `v: 1`. Old saves without the fourth element still parse, with `sample` undefined.
- **Share links**: add `v3`, which carries a sample table:
  `v3.<length>.<bpm>.<theme id>.<picked sample id>.<sample table>.<cells>`
  - `<sample table>` is the distinct sample ids used by the pattern's sample cells, in first-use
    order, joined with `_`. It is empty when there are no sample cells. At most 16 entries;
    cells beyond that point at entry 0.
  - Each cell is **three** bytes: the step, then `row * 5 + instrument index`, then the
    sample-table index (0 for non-sample cells and for sample cells without a `sample`).
  - The cell bytes are base64url, as now.
  - `encodeShare` now writes `v3`.
  - `decodeShare`:
    - **v3**: validate the parts as for v2, plus every table entry against
      `/^[a-z0-9-]{1,24}$/`. Any invalid entry returns null; an empty table is allowed. The
      cell byte count must be a multiple of 3. Sample cells take `sample` from the table entry
      at their index. A missing index gives undefined.
    - **v2**: sample cells get `sample` set to the link's `sampleId`.
    - **v1**: sample cells cannot occur, so there is no change.
  - Update the format comment.

### 6. `src/midi.ts`

- Replace the `sampleNote: number` parameter with
  `sampleNoteFor: (sample: string | undefined) => number`, and call it per sample cell.
- Update the doc comment.

### 7. `src/main.ts`

- `applyPaint`, add mode: call
  `sequencer.set(selected, step, row, selected === 'sample' ? sample.id : undefined)`.
- `onStep`: pass `voice.sample` as the new last argument to `audio.playNote`. If `pickVoices`
  loses the field, check its generic. It returns the same objects, so `sample` should
  survive.
- `playLive` (hidden live tools): pass `selected === 'sample' ? sample.id : undefined` to
  `sequencer.set`, and `sample.id` to `audio.playNote` when the selected instrument is
  sample.
- `loadCells(cells)`:
  - Pass `cell.sample` to `sequencer.set`.
  - Migrate old saves: a sample cell without `sample` gets the currently picked `sample.id`,
    so it keeps sounding the way it did.
- **Shared-link branch**: before `loadCells`, map each sample cell's `sample` through
  `sampleById(cell.sample ?? null).id` (no user-sample flag). A shared beat never plays the
  recipient's own **Mine**; it falls back to Clap. Then set the picked `sample` from
  `shared.sampleId` as now.
- `exportMidi`: pass `(id) => sampleForNote(id ?? sample.id).midiNote`.
- Re-recording or reloading **Mine** still changes every Mine note. That is expected: there is
  one user sample.

### 8. Tests

- `tests/sequencer.test.ts`:
  - `set('sample', 0, 0, 'clap')` stores `sample: 'clap'`.
  - Setting the same cell with `'clap'` again returns false.
  - Setting it with `'tom'` returns true and stores `'tom'`.
  - `set('kick', 1, 0, 'tom')` stores no `sample`.
  - Replacing a sample cell with a kick clears `sample`.
  - `step()` returns the `sample` on sample notes.
- `tests/samples.test.ts`: `sampleForNote('mine')` is `USER_SAMPLE`, `sampleForNote('tom')` is
  Tom, and `sampleForNote(undefined)` and `sampleForNote('x')` are Clap.
- `tests/pattern.test.ts`:
  - `serializePattern` / `parsePattern` round-trip a pattern with sample cells using
    `'clap'`, `'tom'`, and `'mine'`, plus a kick.
  - An old save `'{"v":1,"length":16,"cells":[["sample",0,0]]}'` parses with `sample`
    undefined.
  - A bad sample id in a save is dropped to undefined, and the cell is kept.
  - `encodeShare` produces `v3`. A round-trip keeps each cell's `sample`, including two
    different sounds and `'mine'`.
  - A pattern with no sample cells round-trips with an empty table.
  - Update the format regex test to
    `/^v3\.(16|32)\.\d+\.[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9_-]*\.[A-Za-z0-9_-]*$/`.
  - Existing v1 test unchanged.
  - Add: a v2 link with sample cells decodes them with `sample` set to its `sampleId`. Build
    the link with the old v2 encoding in the test itself: two bytes per cell,
    `row * 5 + index`.
  - Add: a v3 link with a table entry `'BAD!'` returns null, and a v3 link whose cell bytes
    aren't a multiple of 3 returns null.
- `tests/midi.test.ts`: use a `sampleNoteFor` function mapping `'tom'` → 45 and everything
  else → 39. Add: two sample cells with `'tom'` and `'clap'` produce note-ons `0x99 45 100`
  and `0x99 39 100`.

### 9. Docs

- `README.md`, Sampler subsection:
  - Each Sample note keeps the sound it was painted with, so picking a new sound only
    changes the notes you paint next. Each note shows its sound's color.
  - Recording a new **Mine** changes every Mine note.
- `AGENTS.md`:
  - Update the share-link rule to mention `v3`.
  - Add: "Sample cells carry their own `sample` id; only `'sample'` cells may have one."
- `docs/references.md`:
  - Update the autosave cell format (optional fourth element).
  - Describe the `v3` link format and that v1/v2 still decode.
  - MIDI: per-note sample notes.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F "'v3'" -- src/pattern.ts` prints at least one line.
- `git grep -n -F 'sampleForNote' -- src/render.ts src/main.ts` prints at least two lines.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- Browser check: paint claps, pick Tom, paint more. The claps stay claps (color and sound),
  and a share link and a reload keep both.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change sounds, themes, FX, the mixer, the dock, or the sampler panel layout.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- More than one user sample.
- Changing an existing note's sound without repainting it.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
