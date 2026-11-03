# Plan: Sample instrument with a sampler panel of built-in sounds

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add a fifth instrument,
**Sample** (key **5**). While Sample is the selected instrument, a **sampler panel** shows six
built-in sounds: Clap, Cowbell, Rimshot, Tom, Shaker, and Zap.

- Clicking a sound picks it for the Sample instrument and plays it once.
- Rows set the pitch: the bottom row plays the sound as recorded, and each higher row plays
  it higher in pitch, up to an octave at the top row.
- The sounds are generated in code into audio buffers. There are no audio files.
- The chosen sound is saved and carried in share links (a new `v2` link format; `v1` links
  still load) and in MIDI export.

Microphone recording and loading sound files are a later round. They are not part of this
plan.

## Files to touch

- `src/samples.ts` (new)
- `src/sampler.ts` (new)
- `src/config.ts`
- `src/sequencer.ts`
- `src/audio.ts`
- `src/sprites.ts`
- `src/render.ts`
- `src/pattern.ts`
- `src/midi.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/samples.test.ts` (new)
- `tests/pattern.test.ts`
- `tests/midi.test.ts`
- `tests/voices.test.ts`
- `tests/sprites.test.ts`
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/samples.ts` (new; no DOM, no audio, no `localStorage`)

```ts
export interface SamplePreset {
  id: string;
  name: string;
  midiNote: number; // General MIDI drum note used for MIDI export
}

export const SAMPLE_PRESETS: readonly SamplePreset[] = [
  { id: 'clap', name: 'Clap', midiNote: 39 },
  { id: 'cowbell', name: 'Cowbell', midiNote: 56 },
  { id: 'rim', name: 'Rimshot', midiNote: 37 },
  { id: 'tom', name: 'Tom', midiNote: 45 },
  { id: 'shaker', name: 'Shaker', midiNote: 70 },
  { id: 'zap', name: 'Zap', midiNote: 81 },
];

export const DEFAULT_SAMPLE = 'clap';

export function sampleById(id: string | null): SamplePreset {
  return SAMPLE_PRESETS.find((preset) => preset.id === id) ?? (SAMPLE_PRESETS[0] as SamplePreset);
}

// Semitones above the recorded pitch, indexed by board row (row 7 is the bottom).
const ROW_SEMITONES = [12, 11, 9, 7, 5, 4, 2, 0];

export function rateForRow(row: number): number {
  const semitones = ROW_SEMITONES[Math.max(0, Math.min(7, Math.round(row)))] ?? 0;
  return Math.pow(2, semitones / 12);
}
```

### 2. `src/sampler.ts` (new; audio rendering only, no DOM)

Renders each preset once into an `AudioBuffer` with an `OfflineAudioContext`.

```ts
import { SAMPLE_PRESETS } from './samples';

const SAMPLE_SECONDS = 0.6;

type Recipe = (ctx: OfflineAudioContext, noise: AudioBuffer) => void;

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * SAMPLE_SECONDS), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function burst(
  ctx: OfflineAudioContext,
  noise: AudioBuffer,
  start: number,
  decay: number,
  type: BiquadFilterType,
  hz: number,
  q: number,
  level: number,
): void {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, 0);
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + decay + 0.01);
}

function tone(
  ctx: OfflineAudioContext,
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  sweep: number,
  decay: number,
  level: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, 0);
  osc.frequency.exponentialRampToValueAtTime(toHz, sweep);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, 0);
  gain.gain.exponentialRampToValueAtTime(0.0001, decay);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(decay + 0.01);
}

const RECIPES: Record<string, Recipe> = {
  clap: (ctx, noise) => {
    for (const start of [0, 0.011, 0.022]) burst(ctx, noise, start, 0.012, 'bandpass', 1500, 1.5, 0.9);
    burst(ctx, noise, 0.03, 0.18, 'bandpass', 1300, 1.2, 0.6);
  },
  cowbell: (ctx) => {
    for (const hz of [540, 800]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = hz;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, 0);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.35);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.36);
    }
  },
  rim: (ctx, noise) => {
    tone(ctx, 'triangle', 1700, 1600, 0.02, 0.04, 0.9);
    burst(ctx, noise, 0, 0.012, 'highpass', 3000, 0.7, 0.5);
  },
  tom: (ctx) => {
    tone(ctx, 'sine', 170, 105, 0.25, 0.4, 1);
  },
  shaker: (ctx, noise) => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.1);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    source.stop(0.11);
  },
  zap: (ctx) => {
    tone(ctx, 'sine', 1200, 60, 0.15, 0.18, 0.9);
  },
};

// Scales a buffer so its loudest sample is at `peak`.
function normalize(buffer: AudioBuffer, peak = 0.9): AudioBuffer {
  const data = buffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i] ?? 0));
  if (max > 0) {
    const scale = peak / max;
    for (let i = 0; i < data.length; i += 1) data[i] = (data[i] ?? 0) * scale;
  }
  return buffer;
}

export async function renderSamples(sampleRate: number): Promise<Map<string, AudioBuffer>> {
  const result = new Map<string, AudioBuffer>();
  for (const preset of SAMPLE_PRESETS) {
    const recipe = RECIPES[preset.id];
    if (!recipe) continue;
    const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * SAMPLE_SECONDS), sampleRate);
    recipe(ctx, noiseBuffer(ctx));
    result.set(preset.id, normalize(await ctx.startRendering()));
  }
  return result;
}
```

### 3. `src/config.ts`

- `MIX`: add `sample: 0.5,` after `snare`.
- `VOICE_LIMITS`: add `sample: 2`.
- `INSTRUMENT_INFO`: add
  `sample: { name: 'Sample', description: 'Plays the sound picked in the sampler panel. Higher rows play it higher.' },`.

### 4. `src/sequencer.ts`

- `Instrument` adds `'sample'`. `INSTRUMENTS` becomes
  `['kick', 'hat', 'synth', 'snare', 'sample']`.
  The order matters: the share-link instrument index depends on it.

### 5. `src/audio.ts`

- Import `renderSamples` from `./sampler` and `DEFAULT_SAMPLE, rateForRow` from `./samples`.
- Add private fields `samples = new Map<string, AudioBuffer>()` and
  `sampleId: string = DEFAULT_SAMPLE`.
- Add public methods:

  ```ts
  async loadSamples(): Promise<void> {
    this.samples = await renderSamples(this.ctx.sampleRate);
  }

  setSample(id: string): void {
    this.sampleId = id;
  }

  // Plays the current sample at its recorded pitch right away, for the sampler panel.
  auditionSample(): void {
    this.playSample(7, this.ctx.currentTime, 1);
  }
  ```

- In `playNote`, add `} else if (instrument === 'sample') { this.playSample(row, time, level); }`
  before the final `else`.
- Add:

  ```ts
  private playSample(row: number, time: number, level: number): void {
    const buffer = this.samples.get(this.sampleId);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rateForRow(row);
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(MIX.sample * level, 0.0001);
    source.connect(gain);
    gain.connect(this.towerBus);
    source.start(time);
  }
  ```

### 6. `src/sprites.ts`

Add `sample` to `SpriteName` and this entry to `SPRITES` after `snare`:

```ts
sample: [
  [
    '................',
    '.00000000000000.',
    '.09999999999990.',
    '.09bbbbbbbbbb90.',
    '.09b00000000b90.',
    '.09b0000a000b90.',
    '.09b0a00a0a0b90.',
    '.09b0aa0aaa0b90.',
    '.09b0aaaaaa0b90.',
    '.09b00000000b90.',
    '.09bbbbbbbbbb90.',
    '.09999999999990.',
    '.09a9a999999990.',
    '.00000000000000.',
    '................',
    '................',
  ],
  [
    '................',
    '.00000000000000.',
    '.09999999999990.',
    '.09bbbbbbbbbb90.',
    '.09b00006000b90.',
    '.09b06006060b90.',
    '.09b06606660b90.',
    '.09b06666660b90.',
    '.09b06666660b90.',
    '.09b00000000b90.',
    '.09bbbbbbbbbb90.',
    '.09999999999990.',
    '.09696999999990.',
    '.00000000000000.',
    '................',
    '................',
  ],
],
```

Every row must be exactly 16 characters; the sprite test checks this.

### 7. `src/render.ts`

- Add `sample: PIXEL_COLORS['9'],` to `NOTE_OUTLINE`.

### 8. `src/pattern.ts`

- `SharedBeat` gains `sampleId: string`.
- `encodeShare` now writes version 2:
  `['v2', length, bpm, themeId, sampleId, cells].join('.')`, packing each cell's second byte as
  `row * 5 + instrumentIndex`.
- `decodeShare` accepts both versions:
  - `v1`: 5 parts, second byte = `row * 4 + index`, `sampleId` set to `DEFAULT_SAMPLE`
    (import it from `./samples`).
  - `v2`: 6 parts, second byte = `row * 5 + index`. `sampleId` must match
    `/^[a-z0-9-]{1,24}$/`, otherwise return null. An unknown but well-formed id is returned
    as is. `main.ts` passes it through `sampleById`, which falls back to Clap.
  - Anything else returns null.
- Update the format comment above `encodeShare` to describe both versions.

### 9. `src/midi.ts`

- `patternToMidi` gains a fifth parameter `sampleNote: number`. Sample cells go on the drum
  channel with that note.
- Update the doc comment.

### 10. `index.html`

- After the `#tool-snare` pad, add:
  `<button id="tool-sample" class="pad" type="button"><span class="led"></span><canvas data-sprite="sample" width="16" height="16"></canvas><b>Sample</b><kbd>5</kbd></button>`
- After the `#share` panel, add:
  `<div id="sampler" class="fx-panel sampler-panel" hidden><small class="sampler-cap">Sample</small><div id="sample-list" class="sample-list"></div></div>`

### 11. `src/main.ts`

- Imports: `SAMPLE_PRESETS, sampleById, type SamplePreset` from `./samples`.
- Elements: `sampleButton` (`#tool-sample`), `samplerPanel` (`#sampler`), `sampleList`
  (`#sample-list`). Constant `SAMPLE_KEY = 'drumline-sample'`.
- `let sample: SamplePreset = loadSample();`. `loadSample` reads `SAMPLE_KEY` through
  `sampleById` inside `try`/`catch`, like `loadTheme`.
- At startup, for each preset, create
  `<button class="hw" type="button" data-sample="<id>">` with the preset's name as its text,
  and append it to `sampleList`.
- Add:

  ```ts
  function updateSampler(): void {
    samplerPanel.hidden = selected !== 'sample';
    sampleList.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.classList.toggle('selected', button.dataset.sample === sample.id);
    });
  }

  function pickSample(id: string): void {
    sample = sampleById(id);
    audio?.setSample(sample.id);
    try {
      localStorage.setItem(SAMPLE_KEY, sample.id);
    } catch {
      // The choice still applies for this visit.
    }
    updateSampler();
    audio?.auditionSample();
  }
  ```

  - Clicking a preset button calls `pickSample(button.dataset.sample)`.
  - `updateSelection` toggles `selected` on `sampleButton` and calls `updateSampler()`.
- Keys: `case '5': selectTool('sample'); break;`.
- `startAudio`: after `audio.setFx(fx);`, add `audio.setSample(sample.id);` and
  `void audio.loadSamples();`.
- Share link:
  - `encodeShare` gets `sampleId: sample.id`.
  - When a shared beat loads, call `pickSample`'s storage logic without auditioning: set
    `sample = sampleById(shared.sampleId)`, save it to `SAMPLE_KEY` in `try`/`catch`, and
    call `updateSampler()`.
- MIDI: pass `sample.midiNote` as the new last argument of `patternToMidi`.

### 12. `src/style.css`

- `.pads`: `grid-template-columns: repeat(5, 1fr);`. Also change any other `.pads` rule with
  4 columns to 5.
- Add `#tool-sample { --c: var(--orange); }` next to the other `#tool-*` rules.
- Add:

  ```css
  .sampler-panel {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .sampler-cap {
    font: 400 0.6rem/1 var(--label);
    color: var(--mute);
  }

  .sample-list {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
  }
  ```

- Inside `@media (max-width: 760px)`, after the `.fx-panel` rule, add
  `.sampler-panel { grid-template-columns: 1fr; }` and
  `.sample-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }`.
- Inside `@media (max-height: 520px) and (orientation: landscape)`, add `#sampler` to the
  `#fx, #share` fixed-position selector.

### 13. Tests

- `tests/samples.test.ts` (new):
  - Preset ids are unique and match `/^[a-z0-9-]{1,24}$/`.
  - `sampleById('cowbell').name` is `'Cowbell'`. `sampleById('nope')` and `sampleById(null)`
    return the Clap preset.
  - `DEFAULT_SAMPLE` is a preset id.
  - `rateForRow(7)` is 1. `rateForRow(0)` is close to 2. `rateForRow(4)` is close to
    `2 ** (5 / 12)`. Rows rise monotonically from 7 to 0. Out-of-range rows clamp:
    `rateForRow(-3)` equals `rateForRow(0)`, and `rateForRow(12)` equals `rateForRow(7)`.
- `tests/pattern.test.ts`:
  - Update the existing share tests for `v2` and `sampleId`, including a `sample` cell at
    column 31, row 7.
  - Keep the format regex test, updated to
    `/^v2\.(16|32)\.\d+\.[a-z0-9-]+\.[a-z0-9-]+\.[A-Za-z0-9_-]*$/`.
  - Add: the v1 link `'v1.32.120.chiptune.ABwEHAgcDBwCAh8P'` still decodes, to length 32, bpm
    120, theme `'chiptune'`, sampleId `'clap'`, and these six cells in any order: kick at
    0,7, 4,7, 8,7, 12,7; snare at 2,0 and 31,3.
  - Add: a v2 link with sampleId `'BAD!'` returns null.
  - `parsePattern` accepts a `sample` cell.
- `tests/midi.test.ts`: pass a sample note (e.g. 56) everywhere. Add: a sample cell produces
  note-on bytes `0x99 56 100`.
- `tests/voices.test.ts`: include `sample` with a limit of 2.
- `tests/sprites.test.ts`: the size test and the key-list test include `sample`.

### 14. Docs

- `README.md`:
  - Five instruments; key **5** is Sample.
  - New `### Sampler` subsection after "Painting a pattern": selecting Sample opens the
    sampler panel with the six built-in sounds. Clicking one picks it and plays it. Rows set
    its pitch, from as recorded at the bottom to an octave up at the top. The chosen sound is
    remembered and included in share links and MIDI export.
  - Add **5** to the Controls list.
  - Note that older share links still open.
- `AGENTS.md`:
  - Add `src/samples.ts` to the list of files kept free of the DOM, audio, and
    `localStorage`.
  - Change the share-link rule to: "Share links are versioned (`v1.`, `v2.`) in
    `src/pattern.ts`. Add a new version instead of changing an old one, and keep decoding
    every old version."
  - Add: "The order of `INSTRUMENTS` is part of the share-link format; append new
    instruments, never reorder."
- `docs/references.md`:
  - Add `src/samples.ts` and `src/sampler.ts` to Files.
  - Add `drumline-sample` to the storage keys.
  - Update the share-link paragraph for `v2` (sample id, `row × 5 + index`) and v1 decoding.
  - Update the MIDI paragraph to include the sample's note.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/samples.ts src/sampler.ts tests/samples.test.ts`
  prints all three paths.
- PowerShell: `Select-String -Path src/samples.ts -Pattern 'document|window|localStorage|AudioContext'`
  prints nothing.
- `git grep -n -F 'tool-sample' -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change existing instrument sounds, themes, FX, tempo, recording, or `LIVE_TOOLS`.
- Do not add audio files or dependencies.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- In `src/render.ts`, keep to whole art pixels. Don't use `arc`, `shadowBlur`, `globalAlpha`,
  `setLineDash`, `fillText`, or `ctx.scale`.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior (for example, adding a generic like
  `Uint8Array<ArrayBuffer>`), apply it and list it in the report instead of stopping.

## Out of scope

- Microphone recording and loading sound files.
- Storing samples in IndexedDB.
- A beat file format.
- Refreshing the loudness baseline.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
