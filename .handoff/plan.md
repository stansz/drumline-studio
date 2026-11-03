# Plan: Mix button that shows every volume at once

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add a **Mix** button to
the header, after **Share**. It opens a dock view with all six volume sliders in one row:
Kick, Hat, Synth, Snare, Sample, and Backing, each labeled in its color.

It works like FX and Share:

- Pressing the button again closes it.
- Opening it closes FX or Share, and opening FX or Share closes it.
- Selecting any instrument also closes it, which brings back that instrument's single
  slider (or the sampler for Sample).

The existing single sliders stay where they are: the dock mixer, the sampler panel's Vol, and
the header's Backing. Every slider for a channel controls the same value and stays in sync.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- In `.sys`, after `#share-toggle`, add
  `<button id="mix-toggle" class="hw" type="button" aria-expanded="false" aria-controls="mix-all">Mix</button>`.
- In `#dock`, after `#mix`, add:

  ```html
  <div id="mix-all" class="fx-panel mix-all-panel" hidden>
    <label class="fx-knob" style="--c: var(--red)"><small>Kick</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="kick" aria-label="Kick volume" /></label>
    <label class="fx-knob" style="--c: var(--amber)"><small>Hat</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="hat" aria-label="Hat volume" /></label>
    <label class="fx-knob" style="--c: var(--teal)"><small>Synth</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="synth" aria-label="Synth volume" /></label>
    <label class="fx-knob" style="--c: #a6d94a"><small>Snare</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="snare" aria-label="Snare volume" /></label>
    <label class="fx-knob mix-all-sample" style="--c: var(--orange)"><small>Sample</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="sample" aria-label="Sample volume" /></label>
    <label class="fx-knob" style="--c: var(--cream)"><small>Backing</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="backing" aria-label="Backing volume" /></label>
  </div>
  ```

- Also add `data-mix-channel="<channel>"` to the six existing mixer inputs: `#mix-kick`,
  `#mix-hat`, `#mix-synth`, `#mix-snare`, `#mix-sample` (in the sampler), and `#mix-backing`
  (in the header). Keep their ids.

### 2. `src/main.ts`

- Elements: `mixToggle` (`#mix-toggle`), `mixAllPanel` (`#mix-all`).
- `openPanel`'s type becomes `'fx' | 'share' | 'mixall' | null`.
- `updateDock()`:
  - Add `mixAllPanel.hidden = view !== 'mixall';` and
    `mixToggle.setAttribute('aria-expanded', String(view === 'mixall'));`.
  - Mark the Mix button as open while its view shows:
    `mixToggle.classList.toggle('selected', view === 'mixall');`.
- Add:

  ```ts
  function toggleMixAll(): void {
    openPanel = openPanel === 'mixall' ? null : 'mixall';
    updateDock();
  }
  ```

  Wire `mixToggle` click to it.
- `selectTool`: close the Mix view on any instrument pick:
  `if (openPanel === 'mixall') openPanel = null;`. Keep the existing
  `if (tool === 'sample') openPanel = null;`.
- **Sync every slider per channel**:
  - Replace the `mixSliders` id map and its listeners with one query over all
    `input[data-mix-channel]`.
  - Each input's `input` event calls `setMix` with its channel updated to `value / 100`.
  - `showMix()` sets every input's value from `mix[channel]`.
  - `setMix` must call `showMix()` after storing, so the other slider for that channel
    follows. Moving a slider sets it to the value it already shows, which is harmless.
  - Skip invalid `data-mix-channel` values: check them against `MIX_CHANNELS`.
- `updateSampleLook()`: also set `--c` on `.mix-all-sample` to the chosen sound's color.
- Keyboard: no new shortcut.

### 3. `src/style.css`

- `.mix-all-panel`: `grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px;`, plus
  `.mix-all-panel small { color: var(--c); }` and
  `.mix-all-panel input { accent-color: var(--c); width: 100%; }`.
- Inside `@media (max-width: 760px)`: `.mix-all-panel { gap: 6px; }`.
- The short-screen rule `#dock:has(> #mix:not([hidden]))` stays. Because `#mix-all` is a
  different element, the dock shows it on a phone held sideways, floating like FX and
  Share. Check that nothing else hides it there.

### 4. Docs

- `README.md`, `### Mixer`: the **Mix** button in the header shows all six volumes at once.
  Picking an instrument, or pressing Mix again, goes back. It also works on a phone held
  sideways. All sliders for a part stay in sync.
- `docs/references.md`: add the `mixall` dock view to the `updateDock()` description.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- PowerShell: `(Select-String -Path index.html -Pattern 'data-mix-channel=').Count` prints 12.
- `git grep -n -F 'id="mix-toggle"' -- index.html` prints one line.
- `git grep -n -F 'function toggleMixAll' -- src/main.ts` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of sync and of every layout.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change audio, `src/mix.ts`, saved keys, existing slider ids, or the dock height.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Mute or solo.
- A keyboard shortcut for Mix.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
