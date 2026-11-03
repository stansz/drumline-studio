# Plan: Record your own sample (mic or file), and a color per sample sound

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), the sampler panel gets
three changes:

1. **Mic**: records up to 2 seconds from the microphone into a user sample called **Mine**.
   Silence at the start and end is trimmed, and the level is normalized. **Mine** then plays
   on the Sample instrument like a built-in sound, pitched by row.
2. **File**: loads a short audio file the same way. Only the first 2 seconds are kept after
   trimming.
3. **Saving**: the user sample is saved in IndexedDB and comes back next visit.

Separately, each sample sound gets its own **color**. The Sample pad's icon and LED, and every
Sample note on the board, take the color of the chosen sound, so the six built-ins and
**Mine** look different.

## Files to touch

- `src/samples.ts`
- `src/sampleEdit.ts` (new)
- `src/sampleStore.ts` (new)
- `src/audio.ts`
- `src/render.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/samples.test.ts`
- `tests/sampleEdit.test.ts` (new)
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/samples.ts`

- Add `color: string; // PIXEL_COLORS key for the Sample icon and notes` to `SamplePreset`.
- Colors: clap `'9'`, cowbell `'a'`, rim `'7'`, tom `'c'`, shaker `'g'`, zap `'e'`.
- Add:

  ```ts
  // The sound the player records or loads. It is not one of SAMPLE_PRESETS and is never
  // chosen by a share link.
  export const USER_SAMPLE: SamplePreset = { id: 'mine', name: 'Mine', midiNote: 39, color: '5' };
  ```

- Change `sampleById` to take an optional second argument:

  ```ts
  export function sampleById(id: string | null, hasUserSample = false): SamplePreset {
    if (hasUserSample && id === USER_SAMPLE.id) return USER_SAMPLE;
    return SAMPLE_PRESETS.find((preset) => preset.id === id) ?? (SAMPLE_PRESETS[0] as SamplePreset);
  }
  ```

### 2. `src/sampleEdit.ts` (new; no DOM, no audio, no storage)

```ts
export const MAX_SAMPLE_SECONDS = 2;
const SILENCE = 0.02;
const FADE_SECONDS = 0.01;
const PEAK = 0.9;

// Averages channels into one.
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const length = Math.max(0, ...channels.map((channel) => channel.length));
  const mono = new Float32Array(length);
  if (channels.length === 0) return mono;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
  }
  return mono;
}

// The first and last sample louder than the silence threshold, or null if it's all silence.
export function soundBounds(data: Float32Array, threshold = SILENCE): { start: number; end: number } | null {
  let start = -1;
  let end = -1;
  for (let i = 0; i < data.length; i += 1) {
    if (Math.abs(data[i] ?? 0) >= threshold) {
      if (start === -1) start = i;
      end = i;
    }
  }
  return start === -1 ? null : { start, end: end + 1 };
}

// Trims silence, keeps at most MAX_SAMPLE_SECONDS, fades the end out, and normalizes the
// peak. Returns null when there is no sound.
export function prepareSample(channels: readonly Float32Array[], sampleRate: number): Float32Array | null {
  const mono = mixToMono(channels);
  const bounds = soundBounds(mono);
  if (!bounds) return null;
  const length = Math.min(bounds.end - bounds.start, Math.floor(MAX_SAMPLE_SECONDS * sampleRate));
  const result = mono.slice(bounds.start, bounds.start + length);
  const fade = Math.min(result.length, Math.floor(FADE_SECONDS * sampleRate));
  for (let i = 0; i < fade; i += 1) {
    const index = result.length - 1 - i;
    result[index] = (result[index] ?? 0) * (i / fade);
  }
  let max = 0;
  for (const value of result) max = Math.max(max, Math.abs(value));
  if (max > 0) for (let i = 0; i < result.length; i += 1) result[i] = (result[i] ?? 0) * (PEAK / max);
  return result;
}
```

### 3. `src/sampleStore.ts` (new; IndexedDB only)

```ts
export interface StoredSample {
  sampleRate: number;
  data: Float32Array;
}

const DB_NAME = 'drumline';
const STORE = 'samples';
const KEY = 'mine';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Every call is safe without IndexedDB: saving silently fails and loading returns null.
export async function saveUserSample(sample: StoredSample): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ sampleRate: sample.sampleRate, data: sample.data }, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // The sample still works for this visit.
  }
}

export async function loadUserSample(): Promise<StoredSample | null> {
  try {
    const db = await open();
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const record = value as Partial<StoredSample> | undefined;
    if (!record || typeof record.sampleRate !== 'number' || !(record.data instanceof Float32Array)) return null;
    return { sampleRate: record.sampleRate, data: record.data };
  } catch {
    return null;
  }
}
```

### 4. `src/audio.ts`

Add:

```ts
// Puts the player's own sample in the sample map under its id, or removes it.
setUserSample(id: string, data: Float32Array | null, sampleRate: number): void {
  if (!data) {
    this.samples.delete(id);
    return;
  }
  const buffer = this.ctx.createBuffer(1, data.length, sampleRate);
  buffer.copyToChannel(data, 0);
  this.samples.set(id, buffer);
}

decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  return this.ctx.decodeAudioData(bytes);
}

get sampleRate(): number {
  return this.ctx.sampleRate;
}
```

`loadSamples()` currently replaces the whole map. Change it so it keeps a user sample that is
already present: render the presets into a new map, copy any existing `'mine'` entry into it,
then assign the new map. If `copyToChannel` needs a type-only fix such as
`Float32Array<ArrayBuffer>`, apply it.

### 5. `src/render.ts`

- Sample notes and the Sample preview use the chosen sound's color in place of `'9'` (the
  sprite's body color). Everything else stays the same.
- Add `sampleColor: string;` (a `PIXEL_COLORS` key) to `RenderState`.
- Bake the variants once at module load, next to `BAKED`:

  ```ts
  // The Sample sprite in each sound's color: only its body color ('9') changes.
  const SAMPLE_VARIANTS = new Map<string, BakedSprites>();
  function sampleFrames(color: string): BakedSprites | undefined {
    const cached = SAMPLE_VARIANTS.get(color);
    if (cached) return cached;
    const body = PIXEL_COLORS[color];
    if (!body) return BAKED.get('sample');
    const map = (character: string): string =>
      character === '9' ? body : (PIXEL_COLORS[character] ?? body);
    const [first, second] = SPRITES.sample;
    const baked: BakedSprites = {
      normal: [bake(first, map), bake(second, map)],
      hit: [bake(first, hitColor), bake(second, hitColor)],
    };
    SAMPLE_VARIANTS.set(color, baked);
    return baked;
  }
  ```

- `drawNotes`: for cells with `instrument === 'sample'`, use `sampleFrames(state.sampleColor)`
  instead of `BAKED.get(cell.instrument)`.
- `NOTE_OUTLINE.sample`: use `PIXEL_COLORS[state.sampleColor]` for sample cells when drawing
  the flash outline. Fall back to the existing value if that color is missing.
- `drawPreview`: when `selected === 'sample'`, swap `'9'` for `state.sampleColor` while
  plotting.
- `drawIcon(canvas, name, color?)`: when `name === 'sample'` and a `color` is given, draw
  `sampleFrames(color)`'s first frame. Clear the canvas first (`clearRect`) so redraws don't
  stack.

### 6. `index.html`

In `#sampler`, after `#sample-list`, add:

```html
<button id="sample-mic" class="hw" type="button" title="Record up to 2 seconds from the microphone">● Mic</button>
<button id="sample-file" class="hw" type="button" title="Load a short sound file">File</button>
<input id="sample-file-input" type="file" accept="audio/*" hidden />
```

### 7. `src/main.ts`

- Imports:
  - `USER_SAMPLE` from `./samples` (with the existing ones)
  - `prepareSample, MAX_SAMPLE_SECONDS` from `./sampleEdit`
  - `saveUserSample, loadUserSample` from `./sampleStore`
  - `PIXEL_COLORS` from `./sprites`
- Elements: `micButton` (`#sample-mic`), `fileButton` (`#sample-file`), `fileInput`
  (`#sample-file-input`).
- State:
  - `let hasUserSample = false;`
  - `const storedSampleId = (() => { try { return localStorage.getItem(SAMPLE_KEY); } catch { return null; } })();`.
    The existing `loadSample()` keeps returning a preset at startup, because the user sample
    loads later.
- **Sample buttons**: move the creation of the preset buttons into `renderSampleButtons()`.
  It clears `sampleList` and adds one button per preset, plus a **Mine** button
  (`data-sample="mine"`) when `hasUserSample`. Each button keeps the same click handler, and
  the function ends by calling `updateSampler()`. Call it at startup instead of the current
  loop.
- `pickSample(id)` uses `sampleById(id, hasUserSample)`. Add a second parameter
  `audition = true`, and only call `audio?.auditionSample()` when it is true.
- Add `updateSampleLook()`, called from `pickSample`, from the shared-link branch after it
  sets `sample`, and once at startup:
  - Set the Sample pad's LED color:
    `sampleButton.style.setProperty('--c', PIXEL_COLORS[sample.color] ?? '')`.
  - Redraw the pad icon with
    `drawIcon(sampleButton.querySelector('canvas')!, 'sample', sample.color)` (import
    `drawIcon` as already done). Use a null check instead of `!` if lint rules require it.
- `frame()`: pass `sampleColor: sample.color` in the `renderer.draw` state.
- Shared-link branch: keep `sampleById(shared.sampleId)` **without** `hasUserSample`, so a
  shared beat never selects **Mine**.
- **Using a recorded or loaded sound**, shared by mic and file:

  ```ts
  async function useUserSample(channels: Float32Array[], sampleRate: number): Promise<boolean> {
    if (!audio) return false;
    const data = prepareSample(channels, sampleRate);
    if (!data) return false;
    audio.setUserSample(USER_SAMPLE.id, data, sampleRate);
    hasUserSample = true;
    renderSampleButtons();
    pickSample(USER_SAMPLE.id);
    await saveUserSample({ sampleRate, data });
    return true;
  }

  function channelsOf(buffer: AudioBuffer): Float32Array[] {
    return Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  }
  ```

- **Mic**:

  ```ts
  let micRecorder: MediaRecorder | null = null;
  let micStopTimer: ReturnType<typeof setTimeout> | null = null;

  async function toggleMic(): Promise<void> {
    if (!audio || !recordingType) return;
    if (micRecorder) {
      micRecorder.stop();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      micButton.textContent = 'Mic blocked';
      return;
    }
    const chunks: Blob[] = [];
    const type = recordingType;
    const next = new MediaRecorder(stream, { mimeType: type });
    next.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    next.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      if (micStopTimer !== null) clearTimeout(micStopTimer);
      micStopTimer = null;
      micRecorder = null;
      micButton.classList.remove('rec');
      micButton.textContent = '● Mic';
      void (async () => {
        try {
          const decoded = await audio!.decode(await new Blob(chunks, { type }).arrayBuffer());
          if (!(await useUserSample(channelsOf(decoded), decoded.sampleRate))) {
            micButton.textContent = 'No sound';
          }
        } catch {
          micButton.textContent = 'Mic failed';
        }
      })();
    });
    micRecorder = next;
    next.start();
    micButton.classList.add('rec');
    micButton.textContent = '■ Stop';
    // A little longer than the kept length, so trimming has room at the start.
    micStopTimer = setTimeout(() => next.stop(), (MAX_SAMPLE_SECONDS + 0.5) * 1000);
  }
  ```

  Replace `audio!` with a captured local `const current = audio;`, checked before use, so
  there is no non-null assertion.
- **File**:
  - `fileButton` click → `fileInput.click()`.
  - `fileInput` `change`: take the first file. If there is one, decode
    `await file.arrayBuffer()` with `audio.decode`, call
    `useUserSample(channelsOf(decoded), decoded.sampleRate)`, and set `fileInput.value = ''`
    afterwards so the same file can be chosen again. On a decode error or no sound, set
    `fileButton.textContent = 'Not audio'` and reset it to `'File'` after 2 seconds.
- Disable `micButton` and `fileButton` until audio starts: set `disabled = true` at startup
  and `false` in `startAudio`'s success path, where `recordButton` is enabled. Hide
  `micButton` when `recordingType` is null or `navigator.mediaDevices?.getUserMedia` is
  missing.
- **Restoring the user sample**: in `startAudio`'s success path, after `void audio.loadSamples();`,
  add:

  ```ts
  void loadUserSample().then((stored) => {
    if (!stored || !audio) return;
    audio.setUserSample(USER_SAMPLE.id, stored.data, stored.sampleRate);
    hasUserSample = true;
    renderSampleButtons();
    if (storedSampleId === USER_SAMPLE.id && sample.id === DEFAULT_SAMPLE_ID_FALLBACK) {
      pickSample(USER_SAMPLE.id, false);
    }
  });
  ```

  Replace `DEFAULT_SAMPLE_ID_FALLBACK` with the logic: switch to Mine only if the player
  hasn't picked another sound since the page loaded. Track that with
  `let sampleChosenThisVisit = false;`, set to true inside `pickSample` when called from a
  sample button, and also set by the shared-link branch. Keep it simple and describe the
  rule in a one-line comment.

### 8. `src/style.css`

- `.sampler-panel`: `grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px;`.
- `.sample-list`: change to
  `display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;`, with
  `.sample-list .hw { flex: 1 0 auto; min-width: 64px; }`. On narrow screens the list scrolls
  sideways while **Mic** and **File** stay visible.
- `#sample-mic.rec { color: var(--red); }`.
- `#sample-mic, #sample-file`: same height rules as the sample buttons (`min-height: 0;
  height: 34px; padding-block: 0;`). On narrow screens, use the same small font as the
  other dock buttons.
- `#tool-sample`'s `--c` is now set from code. Keep the CSS default (`var(--orange)`) as a
  fallback.

### 9. Tests

- `tests/samples.test.ts`:
  - Every preset and `USER_SAMPLE` has a `color` that is a key of `PIXEL_COLORS` (import from
    `../src/sprites`).
  - Preset colors are all different.
  - `sampleById('mine')` is Clap. `sampleById('mine', true)` is `USER_SAMPLE`.
    `sampleById('cowbell', true)` is Cowbell.
- `tests/sampleEdit.test.ts` (new):
  - `mixToMono` averages two channels, and returns an empty array for no channels.
  - `soundBounds` returns null for all zeros. For `[0, 0, 0.5, 0, -0.3, 0, 0]` it returns
    `{ start: 2, end: 5 }`.
  - `prepareSample` returns null for silence.
  - For a 1 kHz-rate signal of 100 zeros, then 500 samples of 0.25, then 100 zeros: the length
    is 500, and the peak is 0.9 (within 1e-6). The last sample is 0, from the fade.
  - With sample rate 100 and 1000 samples of 0.5, the output is capped at
    `MAX_SAMPLE_SECONDS * 100` = 200 samples.
  - Stereo input is mixed before trimming.

### 10. Docs

- `README.md`, the Sampler subsection:
  - **Mic** records up to 2 seconds. Press again to stop early. The browser asks for
    microphone permission.
  - **File** loads a short sound file.
  - Silence is trimmed and the level evened out. The result appears as **Mine**, is saved on
    this device, and comes back next visit.
  - Share links can't carry it: people opening the link hear Clap instead.
  - Each sound has its own color on the pad and the board.
- `AGENTS.md`:
  - Add `src/sampleEdit.ts` to the list of files kept free of the DOM, audio, and
    `localStorage`.
  - Add: "The user sample lives in IndexedDB (`src/sampleStore.ts`). Every call there must
    work without IndexedDB."
- `docs/references.md`:
  - Add the three new files to Files.
  - Under "Saving and sharing", add the IndexedDB database `drumline`, store `samples`, key
    `mine` (`{ sampleRate, data: Float32Array }`), and that share links never select `mine`.
  - Under Visuals, add that Sample notes are recolored per sound, from `SamplePreset.color`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/sampleEdit.ts src/sampleStore.ts tests/sampleEdit.test.ts`
  prints all three paths.
- PowerShell: `Select-String -Path src/sampleEdit.ts,src/samples.ts -Pattern 'document|window|localStorage|indexedDB|AudioContext'`
  prints nothing.
- `git grep -n -F 'sample-mic' -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- Browser check of the mic, file loading, saving, and colors.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change the built-in sample sounds, other instruments, themes, FX, share-link
  formats, or the dock behavior.
- Do not add dependencies.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- In `src/render.ts`, keep to whole art pixels. Don't use `arc`, `shadowBlur`, `globalAlpha`,
  `setLineDash`, `fillText`, or `ctx.scale`.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Uploading samples to a server, or carrying them in share links.
- More than one user sample.
- Editing the trim by hand.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
