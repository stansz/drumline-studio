# Plan: Autosave, share links, audio recording, MIDI export

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add four ways to keep a beat:

1. **Autosave.** The pattern and its length are saved in `localStorage` on every edit and
   restored on load. Tempo and theme are already saved.
2. **Share link.** A link that carries the pattern, length, tempo, and theme in the URL
   hash. Opening it loads that beat.
3. **Record audio.** Record what plays and download it as an audio file.
4. **MIDI export.** Download the pattern as a `.mid` file.

Share, Record, and MIDI live in a new **Share** panel. It opens from a header button and
works like the existing FX panel.

## Files to touch

- `src/pattern.ts` (new)
- `src/midi.ts` (new)
- `src/recording.ts` (new)
- `src/audio.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/pattern.test.ts` (new)
- `tests/midi.test.ts` (new)
- `tests/recording.test.ts` (new)
- `README.md`
- `AGENTS.md`
- `.handoff/report.md`

## Steps

### 1. `src/pattern.ts` (new; no DOM, no `localStorage`, no audio)

```ts
import { GRID_ROWS, MAX_STEPS, parseBpm } from './config';
import { INSTRUMENTS, type Cell, type Instrument, type PatternLength } from './sequencer';

export interface SavedPattern {
  length: PatternLength;
  cells: Cell[];
}

export interface SharedBeat extends SavedPattern {
  bpm: number;
  themeId: string;
}

function validCell(instrument: unknown, col: unknown, row: unknown): Cell | null {
  if (typeof instrument !== 'string' || !(INSTRUMENTS as readonly string[]).includes(instrument)) {
    return null;
  }
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  const c = col as number;
  const r = row as number;
  if (c < 0 || c >= MAX_STEPS || r < 0 || r >= GRID_ROWS) return null;
  return { instrument: instrument as Instrument, col: c, row: r };
}

// Keeps the first note on each cell and drops anything invalid.
function cleanCells(cells: Array<Cell | null>): Cell[] {
  const seen = new Set<string>();
  const result: Cell[] = [];
  for (const cell of cells) {
    if (!cell) continue;
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cell);
  }
  return result;
}

export function serializePattern(pattern: SavedPattern): string {
  return JSON.stringify({
    v: 1,
    length: pattern.length,
    cells: pattern.cells.map((cell) => [cell.instrument, cell.col, cell.row]),
  });
}

export function parsePattern(text: string | null): SavedPattern | null {
  if (text === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.v !== 1 || !Array.isArray(record.cells)) return null;
  const length: PatternLength = record.length === 32 ? 32 : 16;
  const cells = cleanCells(
    record.cells.map((entry) =>
      Array.isArray(entry) ? validCell(entry[0], entry[1], entry[2]) : null,
    ),
  );
  return { length, cells };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

// Link format: v1.<length>.<bpm>.<theme id>.<cells>, where each cell is two bytes:
// the step, then row * 4 + instrument index.
export function encodeShare(beat: SharedBeat): string {
  const bytes = new Uint8Array(beat.cells.length * 2);
  beat.cells.forEach((cell, i) => {
    bytes[i * 2] = cell.col;
    bytes[i * 2 + 1] = cell.row * 4 + INSTRUMENTS.indexOf(cell.instrument);
  });
  return ['v1', beat.length, parseBpm(String(beat.bpm)), beat.themeId, toBase64Url(bytes)].join('.');
}

export function decodeShare(text: string): SharedBeat | null {
  const parts = text.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1') return null;
  const [, lengthText, bpmText, themeId, cellText] = parts as [string, string, string, string, string];
  if (lengthText !== '16' && lengthText !== '32') return null;
  if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
  const bytes = fromBase64Url(cellText);
  if (!bytes || bytes.length % 2 !== 0) return null;
  const cells: Array<Cell | null> = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const packed = bytes[i + 1] ?? 0;
    cells.push(validCell(INSTRUMENTS[packed % 4], bytes[i], Math.floor(packed / 4)));
  }
  return {
    length: lengthText === '32' ? 32 : 16,
    bpm: parseBpm(bpmText),
    themeId,
    cells: cleanCells(cells),
  };
}
```

### 2. `src/midi.ts` (new; no DOM, no audio)

```ts
import type { Cell } from './sequencer';

export const MIDI_PPQ = 96;
export const TICKS_PER_STEP = MIDI_PPQ / 4;
const DRUM_NOTES = { kick: 36, snare: 38, hat: 42 } as const;
const DRUM_CHANNEL = 9;
const SYNTH_CHANNEL = 0;
const VELOCITY = 100;

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

// One pass of the pattern as a type-0 MIDI file. Drums use General MIDI channel 10, and the
// synth plays the theme's scale on channel 1. The track ends exactly at the pattern length,
// so it loops cleanly in a DAW.
export function patternToMidi(
  cells: readonly Cell[],
  length: number,
  bpm: number,
  synthScale: readonly number[],
): Uint8Array {
  type Event = { tick: number; order: number; data: number[] };
  const events: Event[] = [];
  for (const cell of cells) {
    if (cell.col >= length) continue;
    const start = cell.col * TICKS_PER_STEP;
    const end = start + TICKS_PER_STEP;
    const channel = cell.instrument === 'synth' ? SYNTH_CHANNEL : DRUM_CHANNEL;
    const note =
      cell.instrument === 'synth'
        ? (synthScale[7 - cell.row] ?? 60)
        : DRUM_NOTES[cell.instrument];
    events.push({ tick: start, order: 1, data: [0x90 | channel, note, VELOCITY] });
    events.push({ tick: end, order: 0, data: [0x80 | channel, note, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const microseconds = Math.round(60000000 / bpm);
  const track: number[] = [
    0x00, 0xff, 0x51, 0x03, (microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff,
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
  ];
  let tick = 0;
  for (const event of events) {
    track.push(...variableLength(event.tick - tick), ...event.data);
    tick = event.tick;
  }
  track.push(...variableLength(length * TICKS_PER_STEP - tick), 0xff, 0x2f, 0x00);

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (MIDI_PPQ >> 8) & 0xff, MIDI_PPQ & 0xff];
  const size = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff];
  return Uint8Array.from([...header, ...trackHeader, ...track]);
}
```

### 3. `src/recording.ts` (new; no DOM, no audio)

```ts
const RECORDING_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

export function pickRecordingType(isSupported: (type: string) => boolean): string | null {
  return RECORDING_TYPES.find((type) => isSupported(type)) ?? null;
}

export function extensionFor(type: string): string {
  if (type.startsWith('audio/mp4')) return 'm4a';
  if (type.startsWith('audio/ogg')) return 'ogg';
  return 'webm';
}

// e.g. drumline-2026-11-02-1430
export function fileStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `drumline-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function formatElapsed(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
```

### 4. `src/audio.ts`

Add a public method. It taps the mix after the limiter and before the volume slider, so the
recording level doesn't depend on the slider:

```ts
// Records the full mix at a fixed level, before the volume slider.
createRecordingStream(): MediaStream {
  const destination = this.ctx.createMediaStreamDestination();
  this.analyser.connect(destination);
  return destination.stream;
}
```

Make no other change to `audio.ts`.

### 5. `index.html`

- In `.sys`, directly after `#fx-toggle`, add
  `<button id="share-toggle" class="hw" type="button" aria-expanded="false" aria-controls="share">Share</button>`.
- Directly after the `#fx` panel, add:

  ```html
  <div id="share" class="fx-panel share-panel" hidden>
    <button id="share-link" class="hw" type="button">Copy link</button>
    <button id="record" class="hw" type="button">Record</button>
    <button id="midi" class="hw" type="button">MIDI</button>
    <span id="share-status" class="share-status" aria-live="polite"></span>
  </div>
  ```

### 6. `src/main.ts`

- Imports:
  - `serializePattern, parsePattern, encodeShare, decodeShare` from `./pattern`.
  - `patternToMidi` from `./midi`.
  - `pickRecordingType, extensionFor, fileStamp, formatElapsed` from `./recording`.
- Constant `PATTERN_KEY = 'drumline-pattern'`. Elements: `shareToggle`, `sharePanel`
  (`#share`), `shareLinkButton`, `recordButton`, `midiButton`, `shareStatus`.
- **Autosave**:

  ```ts
  function savePattern(): void {
    try {
      localStorage.setItem(
        PATTERN_KEY,
        serializePattern({ length: sequencer.length, cells: sequencer.cells }),
      );
    } catch {
      // The pattern still lasts for this visit.
    }
  }

  function loadCells(cells: readonly Cell[]): void {
    sequencer.clear();
    for (const cell of cells) sequencer.set(cell.instrument, cell.col, cell.row);
  }
  ```

  (Import `type Cell` from `./sequencer`.)
  - Call `savePattern()` after every pattern change:
    - at the end of `applyPaint` when a paint or erase happened
    - in `clearPattern`
    - in `setLength`
    - in `playLive` after a successful `sequencer.set`
- **Startup restore**, after the step LEDs are created and before `setLength(16)` is
  currently called. Replace that `setLength(16)` call with:

  ```ts
  const shared = (() => {
    try {
      return decodeShare(decodeURIComponent(location.hash.replace(/^#/, '')));
    } catch {
      return null;
    }
  })();
  if (shared) {
    loadCells(shared.cells);
    setLength(shared.length);
    setBpm(shared.bpm);
    theme = themeById(shared.themeId);
    try {
      localStorage.setItem(THEME_KEY, theme.id);
    } catch {
      // The theme still applies for this visit.
    }
    history.replaceState(null, '', location.pathname + location.search);
    infoEl.textContent = 'Loaded a shared beat.';
  } else {
    const saved = (() => {
      try {
        return parsePattern(localStorage.getItem(PATTERN_KEY));
      } catch {
        return null;
      }
    })();
    if (saved) loadCells(saved.cells);
    setLength(saved?.length ?? 16);
  }
  ```

  - The info text set later at startup must not overwrite `'Loaded a shared beat.'`. Set the
    default info text only when `shared` is null.
  - Make sure `updateThemeButton()` runs after this block, so the button shows the loaded
    theme. `setLength` already calls `savePattern()`, so a shared beat is autosaved too.
- **Share panel**:

  ```ts
  function toggleSharePanel(): void {
    sharePanel.hidden = !sharePanel.hidden;
    shareToggle.setAttribute('aria-expanded', String(!sharePanel.hidden));
  }

  function shareUrl(): string {
    const code = encodeShare({
      length: sequencer.length,
      cells: sequencer.cells,
      bpm,
      themeId: theme.id,
    });
    return `${location.origin}${location.pathname}#${code}`;
  }

  async function copyShareLink(): Promise<void> {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = 'Link copied.';
    } catch {
      window.prompt('Copy this link:', url);
      shareStatus.textContent = '';
    }
  }

  function download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportMidi(): void {
    const bytes = patternToMidi(sequencer.cells, sequencer.length, bpm, theme.synth.scale);
    download(new Blob([bytes], { type: 'audio/midi' }), `${fileStamp(new Date())}.mid`);
    shareStatus.textContent = 'MIDI saved.';
  }
  ```

- **Recording**:

  ```ts
  let recorder: MediaRecorder | null = null;
  let recordStream: MediaStream | null = null;
  let recordChunks: Blob[] = [];
  let recordStartedAt = 0;
  let recordTimer: ReturnType<typeof setInterval> | null = null;
  const recordingType =
    typeof MediaRecorder === 'undefined'
      ? null
      : pickRecordingType((type) => MediaRecorder.isTypeSupported(type));

  function updateRecordLabel(): void {
    const label = recorder ? `● ${formatElapsed((Date.now() - recordStartedAt) / 1000)}` : 'Record';
    recordButton.textContent = recorder ? `Stop ${label}` : label;
    recordButton.classList.toggle('rec', recorder !== null);
    shareToggle.classList.toggle('rec', recorder !== null);
    shareToggle.textContent = recorder ? label : 'Share';
  }

  function toggleRecording(): void {
    if (!audio || !recordingType) return;
    if (recorder) {
      recorder.stop();
      return;
    }
    recordStream ??= audio.createRecordingStream();
    recordChunks = [];
    const type = recordingType;
    const next = new MediaRecorder(recordStream, { mimeType: type });
    next.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) recordChunks.push(event.data);
    });
    next.addEventListener('stop', () => {
      download(new Blob(recordChunks, { type }), `${fileStamp(new Date())}.${extensionFor(type)}`);
      recorder = null;
      if (recordTimer !== null) clearInterval(recordTimer);
      recordTimer = null;
      shareStatus.textContent = 'Recording saved.';
      updateRecordLabel();
    });
    recorder = next;
    recordStartedAt = Date.now();
    next.start(1000);
    recordTimer = setInterval(updateRecordLabel, 500);
    shareStatus.textContent = 'Recording. Everything you hear is captured.';
    if (!playing) play();
    updateRecordLabel();
  }
  ```

  - If `recordingType` is null, set `recordButton.hidden = true` at startup.
  - `recordButton` stays disabled (`recordButton.disabled = true`) until audio starts.
    Enable it at the end of `startAudio`'s success path.
- Wire:
  - `shareToggle` click → `toggleSharePanel()`.
  - `shareLinkButton` click → `void copyShareLink()`.
  - `recordButton` click → `toggleRecording()`.
  - `midiButton` click → `exportMidi()`.
  - Add `case 'e': toggleSharePanel(); break;` and `case 'r': toggleRecording(); break;` to
    the keydown `switch`.
- Call `updateRecordLabel()` at startup.

### 7. `src/style.css`

- Add:

  ```css
  .share-panel {
    grid-template-columns: auto auto auto minmax(0, 1fr);
  }

  .share-panel .hw {
    padding-inline: 14px;
  }

  .share-status {
    font: 400 1.1rem/1.1 var(--lcd);
    color: #cfe8c8;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ```

- Inside `@media (max-width: 760px)`, add
  `.share-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }` and
  `.share-status { grid-column: 1 / -1; }`. The `.fx-panel` two-column rule must not apply to
  `.share-panel`: place the new rule after it in the same block, so it wins.
- Inside `@media (max-height: 520px) and (orientation: landscape)`, change the selector of
  the existing `#fx { position: fixed; ... }` rule to `#fx, #share`. Add
  `#share { grid-template-columns: auto auto auto minmax(0, 1fr); }` after it.

### 8. Tests

- `tests/pattern.test.ts`:
  - `serializePattern` then `parsePattern` round-trips a pattern with length 32 and cells of
    all four instruments, including a cell at column 31.
  - `parsePattern` returns null for `null`, `'nope'`, `'{"v":2,"cells":[]}'`, and
    `'{"v":1}'`.
  - `parsePattern` drops invalid cells: an unknown instrument, `col` 32, `row` 8, `col` 1.5,
    and a duplicate position (the first one is kept).
  - `parsePattern('{"v":1,"length":99,"cells":[]}')` gives length 16.
  - `encodeShare` then `decodeShare` round-trips length, bpm, theme id, and cells, for a
    pattern with all four instruments and a cell at column 31, row 7.
  - `encodeShare` output matches `/^v1\.(16|32)\.\d+\.[a-z0-9-]+\.[A-Za-z0-9_-]*$/`.
  - An empty pattern round-trips to `cells: []`.
  - `decodeShare` clamps the tempo: a link with bpm `999` decodes to 300.
  - `decodeShare` returns null for `''`, `'v2.16.120.neon.'`, `'v1.20.120.neon.'`,
    `'v1.16.120.NEON!.'`, `'v1.16.120.neon.@@'`, and an odd number of cell bytes
    (`'v1.16.120.neon.AA'`).
- `tests/midi.test.ts`:
  - The output starts with `MThd` and contains `MTrk` at byte offset 14.
  - The header division bytes (offsets 12–13) encode 96.
  - For one kick at step 0 and one synth at step 4, row 7, with scale `[60, 62, ...]` and
    bpm 120:
    - the tempo meta event `FF 51 03` carries 500000 (bytes `07 A1 20`)
    - there is a note-on `0x99 36 100` (channel 10, note 36)
    - there is a note-on `0x90 60 100`
  - The track length field (bytes 18–21) equals the number of bytes after byte 22.
  - Sum the delta times of the track (parse the variable-length quantities after the two
    meta events) and check that they add up to `length * 24`, for length 16 and for 32.
    A simpler check is also fine: the end-of-track event `FF 2F 00` is the last three bytes.
  - Cells at or past `length` are left out: a kick at column 20 with length 16 produces no
    `0x99` byte.
- `tests/recording.test.ts`:
  - `pickRecordingType` returns the first supported type in order, and null when nothing is
    supported.
  - `extensionFor`: `'audio/mp4'` → `'m4a'`, `'audio/ogg;codecs=opus'` → `'ogg'`,
    `'audio/webm;codecs=opus'` → `'webm'`.
  - `fileStamp(new Date(2026, 10, 2, 14, 5))` is `'drumline-2026-11-02-1405'`.
  - `formatElapsed(0)` is `'0:00'`, `formatElapsed(65.9)` is `'1:05'`, and
    `formatElapsed(-3)` is `'0:00'`.

### 9. Docs

- `README.md`:
  - The pattern and its length are saved automatically and come back on your next visit.
  - Describe the **Share** button (key **E**) and its three actions:
    - **Copy link**: anyone who opens the link gets the same pattern, length, tempo, and theme.
    - **Record** (key **R**): records everything you hear, starting playback if needed. Press
      it again to download the audio file. The format depends on the browser, usually WebM,
      or M4A on Safari.
    - **MIDI**: downloads one pass of the pattern as a `.mid` file. Drums use General MIDI
      notes (kick 36, snare 38, hat 42), and the synth plays the theme's scale.
- `AGENTS.md`:
  - Add the rule: "Keep `src/pattern.ts`, `src/midi.ts`, and `src/recording.ts` free of the
    DOM, audio, and `localStorage`."
  - Add the rule: "Share links use the `v1.` format in `src/pattern.ts`. Add a new version
    instead of changing `v1`, so old links keep working."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/pattern.ts src/midi.ts src/recording.ts tests/pattern.test.ts tests/midi.test.ts tests/recording.test.ts`
  prints all six paths.
- PowerShell:
  `Select-String -Path src/pattern.ts,src/midi.ts,src/recording.ts -Pattern 'document|window|localStorage|AudioContext|MediaRecorder'`
  prints nothing.
- `git grep -n "id=\"share-toggle\"" -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change the sound, themes, FX, tempo, pause/stop, or the hidden live tools
  (`LIVE_TOOLS` stays `false`).
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- Do not add dependencies.

## Out of scope

- WAV rendering.
- Several saved pattern slots.
- Importing MIDI or audio.
- A sampler.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
