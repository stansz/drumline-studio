# Plan: Per-instrument and backing volume mixer, replacing the info line

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add a mixer with six
volume sliders: **Kick, Hat, Synth, Snare, Sample, Backing**. The mixer becomes the dock's
default view, replacing the "Click or drag to paint…" info line, which is removed. The dock
then shows:

- the sampler while Sample is selected
- FX or Share while one of them is open
- otherwise the mixer

Mixer settings are saved. Each slider also scales the delay and reverb that its sound feeds,
so turning a part down turns its echo down too.

## Files to touch

- `src/mix.ts` (new)
- `src/audio.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/mix.test.ts` (new)
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/mix.ts` (new; no DOM, no audio, no storage)

```ts
import type { Instrument } from './sequencer';

export type MixChannel = Instrument | 'backing';
export const MIX_CHANNELS: readonly MixChannel[] = ['kick', 'hat', 'synth', 'snare', 'sample', 'backing'];
export type MixSettings = Record<MixChannel, number>; // each 0 to 1

export const DEFAULT_MIX: Readonly<MixSettings> = {
  kick: 1, hat: 1, synth: 1, snare: 1, sample: 1, backing: 1,
};

// Reads saved settings. Missing or unreadable values fall back to full volume.
export function parseMix(stored: string | null): MixSettings {
  let data: unknown = null;
  try {
    data = stored === null ? null : JSON.parse(stored);
  } catch {
    data = null;
  }
  const source = (typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_MIX };
  for (const channel of MIX_CHANNELS) {
    const value = source[channel];
    if (typeof value === 'number' && Number.isFinite(value)) result[channel] = Math.max(0, Math.min(1, value));
  }
  return result;
}

// Slider position to gain. Squared, so the slider feels even to the ear; 1 stays 1.
export function mixGain(level: number): number {
  const clamped = Math.max(0, Math.min(1, level));
  return clamped * clamped;
}
```

### 2. `src/audio.ts`

- Import `mixGain, MIX_CHANNELS, type MixChannel, type MixSettings` from `./mix`, and
  `INSTRUMENTS` from `./sequencer` if needed.
- Add private fields:
  - `instrumentLevels: Record<Instrument, GainNode>`
  - `instrumentDelaySends: Record<Instrument, GainNode>`
  - `backingLevel: GainNode`
  - `backingDelaySend: GainNode`
- Constructor:
  - For each instrument, create a level gain (value 1) connected to `this.towerBus`, and a
    delay-send gain (value 1) connected to `this.delaySend`.
  - Create `backingLevel` (value 1). Change the music wiring from
    `musicTrim → master` and `musicTrim → musicReverbSend` to `musicTrim → backingLevel`,
    `backingLevel → master`, and `backingLevel → musicReverbSend`.
  - Create `backingDelaySend` (value 1), connected to `this.delaySend`.
  - These nodes must exist before anything connects to them, so create them right after
    `towerBus`, `musicBus`, `delaySend`, and `musicTrim` exist.
- Rewire voices. Search `audio.ts` for every `connect(this.towerBus)` and
  `connect(this.delaySend)`:
  - In `playKick` and `playClick` (the kick's click): connect to
    `this.instrumentLevels.kick` instead of `this.towerBus`.
  - In `playHat`, `playSnare`, `playSynth`, and `playSample`: connect to their own level
    gain instead of `this.towerBus`.
  - In `playSynth`: replace `connect(this.delaySend)` with
    `connect(this.instrumentDelaySends.synth)`.
  - In music voices (`playStab`, `playArp`, and any other music voice that connects to
    `this.delaySend`): replace it with `connect(this.backingDelaySend)`.
  - After this, nothing in a voice may connect straight to `this.delaySend`. Only the send
    gains created in the constructor do. Leave the FX delay and reverb sends from
    `towerBus` as they are: they sit after the instrument levels, so they already follow
    the sliders.
- Add a public method:

  ```ts
  setMix(mix: MixSettings): void {
    const now = this.ctx.currentTime;
    for (const channel of MIX_CHANNELS) {
      const gain = mixGain(mix[channel]);
      if (channel === 'backing') {
        this.backingLevel.gain.setTargetAtTime(gain, now, 0.03);
        this.backingDelaySend.gain.setTargetAtTime(gain, now, 0.03);
      } else {
        this.instrumentLevels[channel].gain.setTargetAtTime(gain, now, 0.03);
        this.instrumentDelaySends[channel].gain.setTargetAtTime(gain, now, 0.03);
      }
    }
  }
  ```

- The metronome is not on any slider. Leave its wiring unchanged.

### 3. `index.html`

- Remove `<p id="info" class="readout"></p>` from the dock.
- Add as the **first** child of `#dock`:

  ```html
  <div id="mix" class="fx-panel mix-panel">
    <label class="fx-knob" style="--c: var(--red)"><small>Kick</small><input id="mix-kick" type="range" min="0" max="100" step="1" value="100" aria-label="Kick volume" /></label>
    <label class="fx-knob" style="--c: var(--amber)"><small>Hat</small><input id="mix-hat" type="range" min="0" max="100" step="1" value="100" aria-label="Hat volume" /></label>
    <label class="fx-knob" style="--c: var(--teal)"><small>Synth</small><input id="mix-synth" type="range" min="0" max="100" step="1" value="100" aria-label="Synth volume" /></label>
    <label class="fx-knob" style="--c: #a6d94a"><small>Snare</small><input id="mix-snare" type="range" min="0" max="100" step="1" value="100" aria-label="Snare volume" /></label>
    <label class="fx-knob" style="--c: var(--orange)"><small>Sample</small><input id="mix-sample" type="range" min="0" max="100" step="1" value="100" aria-label="Sample volume" /></label>
    <label class="fx-knob" style="--c: var(--cream)"><small>Backing</small><input id="mix-backing" type="range" min="0" max="100" step="1" value="100" aria-label="Backing volume" /></label>
  </div>
  ```

  Check that `--red`, `--amber`, `--teal`, `--orange`, and `--cream` exist in `:root` in
  `style.css`. If one is missing, use the hex value from the matching `#tool-*` rule.

### 4. `src/main.ts`

- Remove `infoEl`, and every line that sets its text or `hidden`, including the startup text
  and the `LIVE_TOOLS` variants.
- When a shared beat loads, set
  `overlayDetail.textContent = 'Loaded a shared beat.'` instead. The start overlay is
  showing at that point. `showStartOverlay` already clears it later. Check that nothing else
  clears it before the player presses Start. If something does, report it.
- Imports: `DEFAULT_MIX, MIX_CHANNELS, parseMix, type MixSettings` from `./mix`.
- Add `const MIX_KEY = 'drumline-mix';`, elements `mixPanel` (`#mix`), and a map of the six
  sliders (`mix-${channel}`).
- Add `let mix: MixSettings = loadMix();`, where `loadMix` reads `MIX_KEY` through `parseMix`
  inside `try`/`catch`, like `loadFx`.
- Add `showMix()` to set each slider's value to `Math.round(mix[channel] * 100)`.
- Add `setMix(next)` to store `mix`, call `audio?.setMix(mix)`, and save JSON to `MIX_KEY` in
  `try`/`catch`.
- Each slider's `input` event calls `setMix` with that channel updated to `value / 100`.
- In `startAudio`, after `audio.setFx(fx);`, add `audio.setMix(mix);`.
- `updateDock`: the default view is `'mix'` instead of `'info'`:
  `const view = openPanel ?? (selected === 'sample' ? 'sampler' : 'mix');`. Set
  `mixPanel.hidden = view !== 'mix';` instead of the `infoEl` line.
- Keyboard: the `keydown` handler currently skips events from `bpmInput` and the FX sliders.
  Replace that check with `if (event.target instanceof HTMLInputElement) return;`, so every
  slider and the tempo box are covered, including the mixer and volume.
- Call `showMix()` at startup.

### 5. `src/style.css`

- `.mix-panel`: `grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px;`.
- `.mix-panel small { color: var(--c); }`.
- `.mix-panel input { accent-color: var(--c); }`.
- Inside `@media (max-width: 760px)`: `.mix-panel { gap: 6px; }`.
- Remove the `.readout` rule and any `#info` rules (base, small phones, short screens,
  landscape `margin-inline` list). If a selector list contains `#info`, remove just that
  entry.
- Short screens (`@media (max-height: 520px)`): the rule that hides the dock while it shows
  the info view changes to `#dock:has(> #mix:not([hidden]))`. In this layout the dock only
  appears for the sampler, FX, or Share.
- Keep the dock heights as they are.

### 6. Tests: `tests/mix.test.ts` (new)

- `parseMix(null)`, `parseMix('')`, `parseMix('x')`, and `parseMix('[1]')` equal
  `DEFAULT_MIX`.
- `parseMix('{"kick":0.5,"hat":-1,"synth":3,"snare":"x"}')` gives kick 0.5, hat 0, synth 1,
  snare 1, sample 1, and backing 1.
- `MIX_CHANNELS` lists the five instruments in `INSTRUMENTS` order, then `'backing'`.
- `mixGain(1)` is 1, `mixGain(0)` is 0, and `mixGain(0.5)` is 0.25. Values outside 0–1 are
  clamped.

### 7. Docs

- `README.md`:
  - Remove mentions of the info line.
  - Add a `### Mixer` subsection: the slot under the board shows six volume sliders by
    default (Kick, Hat, Synth, Snare, Sample, Backing). Each also scales that part's echo.
    They are remembered.
  - Selecting Sample, or opening FX or Share, uses the same slot.
  - On a phone held sideways, the mixer is hidden.
  - Update the dock sentence to name the mixer instead of the info line.
- `AGENTS.md`:
  - Add `src/mix.ts` to the list of files kept free of the DOM, audio, and `localStorage`.
  - Add: "Voices connect to their instrument's level and send gains in `audio.ts`, never
    straight to `towerBus` or `delaySend`, so the mixer covers everything."
- `docs/references.md`:
  - Add `src/mix.ts` to Files.
  - Add `drumline-mix` to the storage keys.
  - Update the audio chain: per-instrument level gains before the instrument bus, and a
    backing level after the music trim.
  - Update the dock paragraph (default view is the mixer).
  - Remove the info line sentences.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git ls-files --others --exclude-standard -- src/mix.ts tests/mix.test.ts` prints both
  paths.
- PowerShell: `Select-String -Path src/mix.ts -Pattern 'document|window|localStorage|AudioContext'`
  prints nothing.
- PowerShell: `Select-String -Path index.html,src/main.ts -Pattern 'id="info"|infoEl'` prints
  nothing.
- PowerShell: `Select-String -Path src/audio.ts -Pattern 'connect\(this\.delaySend\)'` prints
  only lines inside the constructor (the send gains). List them in the report.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- Browser check that each slider changes only its own part.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change sounds, theme values, FX, the sampler, mic, sharing, or the dock height.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Mute or solo buttons.
- Volume in MIDI export.
- A mixer view on a phone held sideways.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
