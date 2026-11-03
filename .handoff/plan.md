# Plan: Song sections and a second chord progression for the backing

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), each theme's backing is
one 4-bar loop forever. Make it a song:

- **Sections**: the backing cycles through **verse** (8 bars), **chorus** (8), **verse** (8),
  **chorus** (8), and **break** (4), then repeats. That's 36 bars.
  - **Verse** is exactly today's arrangement.
  - **Chorus** uses the theme's new second chord progression, with more energy: fuller pad,
    bass always in, and the arpeggio on where the theme has one.
  - **Break** is the pad alone: no bass, arpeggio, or drums.
  - The last bar of each section ends with a **snare fill** on its last four sixteenths.
- **Backing button** cycles through three states: **Song** (sections on), **Loop** (sections
  off: today's steady loop), and **Off** (no backing). The default is Song. Key **B** cycles
  the same way.
- Stop restarts the song at the first verse. Pause keeps its place.

Your own pattern, the tempo, and the instrument sounds don't change.

## Files to touch

- `src/song.ts` (new)
- `src/themes.ts`
- `src/audio.ts`
- `src/main.ts`
- `tests/song.test.ts` (new)
- `tests/themes.test.ts`
- `tests/loudness.ts`
- `README.md`
- `AGENTS.md`
- `docs/themes.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/song.ts` (new; no DOM, no audio, no storage)

```ts
import { STEPS_PER_BAR } from './config';
import type { layerLevels } from './music';

export type SectionKind = 'verse' | 'chorus' | 'break';

export interface Section {
  kind: SectionKind;
  bar: number; // bar within the section, from 0
  bars: number; // length of the section in bars
  fill: boolean; // true in the section's last bar while sections are on
}

export const SONG_FORM: ReadonlyArray<{ kind: SectionKind; bars: number }> = [
  { kind: 'verse', bars: 8 },
  { kind: 'chorus', bars: 8 },
  { kind: 'verse', bars: 8 },
  { kind: 'chorus', bars: 8 },
  { kind: 'break', bars: 4 },
];

const SONG_BARS = SONG_FORM.reduce((sum, part) => sum + part.bars, 0);

// With sections off the backing is today's loop: always a verse, never a fill.
export function sectionAt(musicStep: number, sectionsOn: boolean): Section {
  if (!sectionsOn) return { kind: 'verse', bar: 0, bars: 1, fill: false };
  let bar = Math.floor(Math.max(0, musicStep) / STEPS_PER_BAR) % SONG_BARS;
  for (const part of SONG_FORM) {
    if (bar < part.bars) return { kind: part.kind, bar, bars: part.bars, fill: bar === part.bars - 1 };
    bar -= part.bars;
  }
  return { kind: 'verse', bar: 0, bars: 1, fill: false };
}

type Levels = ReturnType<typeof layerLevels>;

// How each section changes the layer levels. Verse leaves them as they are.
export function sectionLevels(levels: Levels, kind: SectionKind): Levels {
  if (kind === 'break') return { pad: levels.pad, bass: 0, arp: 0 };
  if (kind === 'chorus') {
    return {
      pad: Math.min(1, levels.pad + 0.15),
      bass: Math.max(levels.bass, 0.6),
      arp: Math.max(levels.arp, 0.6),
    };
  }
  return levels;
}

export const FILL_STEPS: readonly number[] = [12, 13, 14, 15];
```

### 2. `src/themes.ts`

- Add `chorusChords: ReadonlyArray<{ name: string; pad: number[]; bass: number }>;` to
  `Theme`, directly after `chords`.
- Add `chorusChords` to each theme, after `chords`. Use exactly these values:
  - **Neon**:
    `[{ name: 'Fmaj7', pad: [53, 57, 60, 64], bass: 41 }, { name: 'G', pad: [55, 59, 62, 67], bass: 43 }, { name: 'Em7', pad: [52, 55, 59, 62], bass: 40 }, { name: 'Am', pad: [57, 60, 64, 69], bass: 45 }]`
  - **Chiptune**:
    `[{ name: 'F', pad: [57, 60, 65, 69], bass: 41 }, { name: 'C', pad: [60, 64, 67, 72], bass: 48 }, { name: 'Dm', pad: [57, 62, 65, 69], bass: 38 }, { name: 'G', pad: [59, 62, 67, 71], bass: 43 }]`
  - **Lo-fi**:
    `[{ name: 'Fmaj9', pad: [57, 60, 64, 67], bass: 41 }, { name: 'Em7', pad: [55, 59, 62, 64], bass: 40 }, { name: 'Dm9', pad: [53, 57, 60, 64], bass: 38 }, { name: 'G13', pad: [53, 59, 64, 69], bass: 43 }]`
  - **Techno**:
    `[{ name: 'Dm', pad: [57, 62, 65], bass: 38 }, { name: 'Dm', pad: [57, 62, 65], bass: 38 }, { name: 'Am', pad: [57, 60, 64], bass: 45 }, { name: 'G', pad: [55, 59, 62], bass: 43 }]`
  - **Funk**:
    `[{ name: 'A13', pad: [55, 61, 66, 71], bass: 45 }, { name: 'A13', pad: [55, 61, 66, 71], bass: 45 }, { name: 'B9', pad: [57, 61, 63, 66], bass: 47 }, { name: 'E9', pad: [56, 62, 66, 71], bass: 40 }]`
- Change no other theme values.

### 3. `src/audio.ts`

- Import `FILL_STEPS, sectionLevels, type Section` from `./song`.
- `playMusicStep(musicStep, time, duration, levels, section: Section)`. Inside:
  - `const chords = section.kind === 'chorus' ? theme.chorusChords : theme.chords;`.
    Use `chords` everywhere the function used `theme.chords`: the chord lookup and
    `arpNote`.
  - `const layers = sectionLevels(levels, section.kind);`. Use `layers` in place of `levels`
    for the pad, bass, arp, and backing drums.
  - **Arp**: keep `Math.max(layers.arp, theme.arp.minLevel)`. Themes with no arp steps stay
    silent, because the existing `steps.includes` check covers that.
  - **Drums**: skip all backing drums when `section.kind === 'break'`. When `section.fill`
    and `FILL_STEPS.includes(local)`:
    - Play the snare on that step at level `layers.pad * (0.55 + 0.15 * FILL_STEPS.indexOf(local))`,
      so the fill rises.
    - Skip that step's regular snare, so it isn't doubled.
    - Kick and hat follow their normal pattern.
  - The **hold-style pad** uses `chord.pad` from the section's chords. The verse/chorus switch
    happens on a bar boundary, the same as chord changes today.
- Nothing else changes.

### 4. `src/main.ts`

- Imports: `sectionAt` from `./song`.
- Constant `SECTIONS_KEY = 'drumline-sections'`, and
  `let sections = loadSections();` (`localStorage.getItem(SECTIONS_KEY) !== '0'` in
  `try`/`catch`, default `true`).
- In `onStep`, pass `sectionAt(musicStep, sections)` as the new last argument of
  `audio.playMusicStep`.
- **Backing button** (three states). Replace `toggleBacking` with `cycleBacking`:
  - The order is Song (backing on, sections on) → Loop (backing on, sections off) → Off
    (backing off) → Song.
  - Save both `BACKING_KEY` (as now) and `SECTIONS_KEY` in `try`/`catch`.
  - `updateBackingButton()`:
    - Set the button text to `Song`, `Loop`, or `Off`, with a `title` of "Backing music:
      song with sections", "Backing music: steady loop", or "Backing music off".
    - Keep the `selected` class whenever the backing is on.
    - Keep `aria-pressed` as `String(backing)`.
  - The button click and the **B** key both call `cycleBacking()`.
- Nothing else changes: Stop already resets `musicStep` to 0, and Pause keeps it.

### 5. `tests/loudness.ts`

- In `renderBoard`, pass `sectionAt(musicStep, false)` to `audio.playMusicStep` for both
  modes, so loudness is measured on the verse/loop arrangement as before. Import
  `sectionAt` from `../src/song`.

### 6. Tests

- `tests/song.test.ts` (new):
  - With sections on, the bars map like this (check the first step of each bar):
    - bars 0–7: verse
    - bars 8–15: chorus
    - bars 16–23: verse
    - bars 24–31: chorus
    - bars 32–35: break
    - bar 36: verse again, with `bar` 0
  - `fill` is true only for bars 7, 15, 23, 31, and 35.
  - `bar` and `bars` are right for bar 10: chorus, `bar` 2, `bars` 8.
  - With sections off, `sectionAt(anything, false)` is
    `{ kind: 'verse', bar: 0, bars: 1, fill: false }`.
  - `sectionAt(-5, true)` is a verse at `bar` 0.
  - `sectionLevels`:
    - verse returns the input unchanged
    - break keeps `pad` and zeroes `bass` and `arp`
    - chorus raises each layer as specified, stays at most 1, and never lowers a layer
  - `FILL_STEPS` equals `[12, 13, 14, 15]`.
- `tests/themes.test.ts`: every theme has 4 `chorusChords`. Every pad note is between 36 and
  84, and every bass note is between 28 and 60.

### 7. Docs

- `README.md`, `### Playing`:
  - Replace the Backing sentence. **Backing** cycles through **Song**, **Loop**, and **Off**
    (key **B**).
  - Song moves through verse, chorus, and a break, with a short snare fill before each
    change; the chorus uses a second chord progression.
  - Loop plays the theme's steady 4-bar loop.
  - Stop restarts the song from the top.
  - Update the Controls line for **B**.
- `AGENTS.md`: add `src/song.ts` to the list of files kept free of the DOM, audio, and
  `localStorage`. Add: "Loudness is measured with sections off (`sectionAt(step, false)`),
  which is the verse arrangement."
- `docs/themes.md`:
  - Each theme has `chords` (verse and loop) and `chorusChords` (chorus).
  - The section form is in `src/song.ts`.
  - Loudness is checked with sections off.
- `docs/references.md`:
  - Add `src/song.ts` to Files.
  - Add `drumline-sections` to the storage keys.
  - In "How a step works", note that `onStep` passes the current section to `playMusicStep`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/song.ts tests/song.test.ts` prints both
  paths.
- PowerShell: `(Select-String -Path src/themes.ts -Pattern 'chorusChords').Count` prints 6.
- PowerShell: `Select-String -Path src/song.ts -Pattern 'document|window|localStorage|AudioContext'`
  prints nothing.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- The loudness page still passes, and a browser check of the button states and sections.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change existing theme values, instrument sounds, the mixer, FX, the sampler, or the
  share-link format.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New themes or genres.
- A key or transpose control.
- Showing the current section on screen.
- Jumping to a section by hand.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
