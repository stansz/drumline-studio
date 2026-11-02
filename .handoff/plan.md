# Plan: Master FX panel

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add an **FX** button
beside the theme button. It opens a panel of four sliders that shape the whole mix live, on
top of the theme's own sound:

- **Filter**: left of center sweeps a low-pass down, right of center sweeps a high-pass up,
  and center is off.
- **Delay**: how much of the instruments feeds the tempo-synced delay.
- **Reverb**: how much of the instruments feeds the reverb.
- **Crush**: bit-crush amount, added to the theme's own crush.

The settings are saved between visits. A **Reset** button sets them all back to off.

## Files to touch

- `src/fx.ts` (new)
- `src/audio.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/fx.test.ts` (new)
- `README.md`
- `AGENTS.md`
- `docs/themes.md`
- `.handoff/report.md`

## Steps

### 1. `src/fx.ts` (new, no DOM, no audio)

```ts
export interface FxSettings {
  filter: number; // -1 (low-pass, darkest) to 1 (high-pass, thinnest); 0 is off
  delay: number; // 0 to 1
  reverb: number; // 0 to 1
  crush: number; // 0 to 1
}

export const DEFAULT_FX: Readonly<FxSettings> = { filter: 0, delay: 0, reverb: 0, crush: 0 };

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

// Reads saved settings. Anything missing or unreadable falls back to off.
export function parseFx(stored: string | null): FxSettings {
  let data: unknown = null;
  try {
    data = stored === null ? null : JSON.parse(stored);
  } catch {
    data = null;
  }
  const source = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const read = (key: keyof FxSettings, low: number): number => {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value) ? clamp(value, low, 1) : 0;
  };
  return {
    filter: read('filter', -1),
    delay: read('delay', 0),
    reverb: read('reverb', 0),
    crush: read('crush', 0),
  };
}

// Both filters stay in the chain; each is wide open unless the knob leans its way.
export function filterCutoffs(filter: number): { lowpassHz: number; highpassHz: number } {
  const amount = clamp(filter, -1, 1);
  return {
    lowpassHz: amount < 0 ? 20000 * Math.pow(0.01, -amount) : 20000,
    highpassHz: amount > 0 ? 20 * Math.pow(200, amount) : 20,
  };
}

export function crushMix(themeCrush: number, userCrush: number): number {
  return clamp(themeCrush + userCrush, 0, 1);
}

export const FX_DELAY_SEND = 0.5;
export const FX_REVERB_SEND = 0.8;
```

### 2. `src/audio.ts`

- Import `crushMix, DEFAULT_FX, filterCutoffs, FX_DELAY_SEND, FX_REVERB_SEND, type FxSettings`
  from `./fx`.
- Add private fields: `fxLowpass: BiquadFilterNode`, `fxHighpass: BiquadFilterNode`,
  `fxDelaySend: GainNode`, `fxReverbSend: GainNode`, and `fx: FxSettings = { ...DEFAULT_FX }`.
- In the constructor, put the two filters between `this.filter` and the limiter. Replace
  `this.filter.connect(limiter);` with:

  ```ts
  this.fxLowpass = ctx.createBiquadFilter();
  this.fxLowpass.type = 'lowpass';
  this.fxLowpass.frequency.value = 20000;
  this.fxLowpass.Q.value = 1.2;
  this.fxHighpass = ctx.createBiquadFilter();
  this.fxHighpass.type = 'highpass';
  this.fxHighpass.frequency.value = 20;
  this.fxHighpass.Q.value = 1.2;
  this.filter.connect(this.fxLowpass);
  this.fxLowpass.connect(this.fxHighpass);
  this.fxHighpass.connect(limiter);
  ```

- After `this.delaySend` is created and connected, add:

  ```ts
  this.fxDelaySend = ctx.createGain();
  this.fxDelaySend.gain.value = 0;
  this.towerBus.connect(this.fxDelaySend);
  this.fxDelaySend.connect(this.delay);
  this.fxReverbSend = ctx.createGain();
  this.fxReverbSend.gain.value = 0;
  this.towerBus.connect(this.fxReverbSend);
  this.fxReverbSend.connect(this.reverb);
  ```

- Add a public method:

  ```ts
  setFx(fx: FxSettings): void {
    this.fx = { ...fx };
    const now = this.ctx.currentTime;
    const { lowpassHz, highpassHz } = filterCutoffs(fx.filter);
    this.fxLowpass.frequency.setTargetAtTime(lowpassHz, now, 0.03);
    this.fxHighpass.frequency.setTargetAtTime(highpassHz, now, 0.03);
    this.fxDelaySend.gain.setTargetAtTime(fx.delay * FX_DELAY_SEND, now, 0.03);
    this.fxReverbSend.gain.setTargetAtTime(fx.reverb * FX_REVERB_SEND, now, 0.03);
    this.applyCrush(now);
  }

  private applyCrush(now: number): void {
    const wet = crushMix(this.theme.space.crush, this.fx.crush);
    this.crushDry.gain.setTargetAtTime(1 - wet, now, 0.02);
    this.crushWet.gain.setTargetAtTime(wet, now, 0.02);
  }
  ```

- In `setTheme`, replace the two lines that set `this.crushDry` and `this.crushWet` with
  `this.applyCrush(now);`.

### 3. `index.html`

- In `.sys`, directly after `#theme`, add
  `<button id="fx-toggle" class="hw" type="button" aria-expanded="false" aria-controls="fx">FX</button>`.
- Directly after `<p id="info" class="readout"></p>`, add:

  ```html
  <div id="fx" class="fx-panel" hidden>
    <label class="fx-knob"><small>Filter</small><input id="fx-filter" type="range" min="-100" max="100" step="1" value="0" aria-label="Filter: left is low-pass, right is high-pass" /></label>
    <label class="fx-knob"><small>Delay</small><input id="fx-delay" type="range" min="0" max="100" step="1" value="0" aria-label="Delay amount" /></label>
    <label class="fx-knob"><small>Reverb</small><input id="fx-reverb" type="range" min="0" max="100" step="1" value="0" aria-label="Reverb amount" /></label>
    <label class="fx-knob"><small>Crush</small><input id="fx-crush" type="range" min="0" max="100" step="1" value="0" aria-label="Crush amount" /></label>
    <button id="fx-reset" class="hw" type="button">Reset</button>
  </div>
  ```

### 4. `src/main.ts`

- Import `DEFAULT_FX, parseFx, type FxSettings` from `./fx`.
- Add `const FX_KEY = 'drumline-fx';` and elements `fxToggle`, `fxPanel` (`#fx`),
  `fxFilter`, `fxDelay`, `fxReverb`, `fxCrush` (inputs), and `fxReset`.
- Add `let fx: FxSettings = loadFx();`, where `loadFx` reads `localStorage.getItem(FX_KEY)`
  through `parseFx` inside `try`/`catch` (falling back to `parseFx(null)`), like `loadVolume`.
- Add:

  ```ts
  function showFx(): void {
    fxFilter.value = String(Math.round(fx.filter * 100));
    fxDelay.value = String(Math.round(fx.delay * 100));
    fxReverb.value = String(Math.round(fx.reverb * 100));
    fxCrush.value = String(Math.round(fx.crush * 100));
    const active = fx.filter !== 0 || fx.delay > 0 || fx.reverb > 0 || fx.crush > 0;
    fxToggle.classList.toggle('selected', active);
  }

  function setFx(next: FxSettings): void {
    fx = next;
    audio?.setFx(fx);
    showFx();
    try {
      localStorage.setItem(FX_KEY, JSON.stringify(fx));
    } catch {
      // The settings still apply for this visit.
    }
  }

  function readFxSliders(): FxSettings {
    return parseFx(
      JSON.stringify({
        filter: Number(fxFilter.value) / 100,
        delay: Number(fxDelay.value) / 100,
        reverb: Number(fxReverb.value) / 100,
        crush: Number(fxCrush.value) / 100,
      }),
    );
  }

  function toggleFxPanel(): void {
    fxPanel.hidden = !fxPanel.hidden;
    fxToggle.setAttribute('aria-expanded', String(!fxPanel.hidden));
  }
  ```

- Wire: each of the four sliders on `input` calls `setFx(readFxSliders())`. `fxReset` click
  calls `setFx({ ...DEFAULT_FX })`. `fxToggle` click calls `toggleFxPanel()`. Add key `'x'` to
  the keydown `switch` to call `toggleFxPanel()`.
- In `startAudio`, after `audio.setVolume(volume);`, add `audio.setFx(fx);`.
- At startup, call `showFx()`.
- The keydown handler must ignore events whose target is one of the four FX sliders, the
  same way it ignores `bpmInput`, so arrow keys on a slider don't trigger shortcuts.

### 5. `src/style.css`

- Add:

  ```css
  .fx-panel {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    gap: 10px;
    align-items: center;
    background: #1f1d25;
    box-shadow: inset 0 2px 0 #000, inset 0 -1px 0 #3a3743;
    padding: 6px 10px;
  }

  .fx-panel[hidden] {
    display: none;
  }

  .fx-knob {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .fx-knob small {
    font: 400 0.6rem/1 var(--label);
    color: var(--mute);
  }

  .fx-knob input {
    width: 100%;
    accent-color: var(--amber);
  }
  ```

- Inside `@media (max-width: 760px)`, add
  `.fx-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }` and
  `#fx-reset { grid-column: 1 / -1; }`.
- Inside `@media (max-height: 520px) and (orientation: landscape)`, add:

  ```css
  #fx {
    position: fixed;
    left: 8px;
    right: 206px;
    bottom: 8px;
    z-index: 5;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  }
  ```

### 6. Tests: `tests/fx.test.ts` (new)

- `parseFx(null)`, `parseFx('')`, `parseFx('not json')`, and `parseFx('[1]')` all equal
  `DEFAULT_FX`.
- `parseFx('{"filter":-3,"delay":0.5,"reverb":2,"crush":"x"}')` equals
  `{ filter: -1, delay: 0.5, reverb: 1, crush: 0 }`.
- `parseFx('{"delay":-0.4}').delay` is 0.
- `filterCutoffs(0)` is `{ lowpassHz: 20000, highpassHz: 20 }`.
- `filterCutoffs(-1).lowpassHz` is close to 200 (`toBeCloseTo(200, 6)`), and its `highpassHz`
  is 20.
- `filterCutoffs(1).highpassHz` is close to 4000, and its `lowpassHz` is 20000.
- `filterCutoffs(-0.5).lowpassHz` is close to 2000.
- `crushMix(0.3, 0.5)` is close to 0.8. `crushMix(0.7, 0.6)` is 1. `crushMix(0, 0)` is 0.

### 7. Docs

- `README.md`: describe the **FX** button (key **X**), the four sliders, Reset, and that the
  settings are remembered. The FX apply on top of the theme.
- `AGENTS.md`: add "Keep `src/fx.ts` free of the DOM and audio. FX are applied on top of the
  theme and never change a theme's own values."
- `docs/themes.md`: add one sentence saying the FX panel sits after each theme's sound. The
  FX crush adds to the theme's `space.crush`, and loudness checks are run with FX off.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, and its output lists `tests/fx.test.ts`.
- `git grep -n "id=\"fx-toggle\"" -- index.html` prints one line.
- `git ls-files --others --exclude-standard -- src/fx.ts tests/fx.test.ts` prints both paths.
- `git grep -n -E "document|window|AudioContext|localStorage" -- src/fx.ts` prints nothing
  (exit 1).

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change any theme values in `src/themes.ts`, or the loudness baseline.
- Do not change the live play, loop, 32-step, or tempo behavior.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.

## Out of scope

- Per-instrument sends.
- Performance FX (stutter, tape stop, held filter sweeps).
- Changing the delay time.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
