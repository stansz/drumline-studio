# Plan: One volume slider for the selected instrument; Sample and Backing volumes move

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), the mixer in the dock
shows six sliders at once. Change it so:

1. **The mixer view shows one slider**: the selected instrument's volume (Kick, Hat, Synth,
   or Snare), with a label like "Kick volume" in that instrument's color. Picking another
   instrument swaps which slider shows.
2. **Sample's volume lives in the sampler panel**, as a compact slider after Mic and File,
   colored like the chosen sample sound. Selecting Sample already shows that panel.
3. **Backing's volume moves to the header**, as a second thin slider stacked under the main
   volume slider. Label them "Vol" and "Backing".

The audio side, saved settings (`drumline-mix`), and slider ids (`mix-kick` … `mix-backing`)
don't change. Only where the sliders appear changes.

## Files to touch

- `index.html`
- `src/main.ts`
- `src/style.css`
- `README.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `index.html`

- `#mix`: keep only the four instrument labels (kick, hat, synth, snare). Give each label
  `class="fx-knob mix-channel"` and `data-channel="<instrument>"`. Change each label's
  `<small>` text to `"<Name> volume"` (e.g. `Kick volume`). Remove the Sample and Backing
  labels from `#mix`.
- `#sampler`: after the `#sample-file-input` element, add:

  ```html
  <label class="sampler-volume" title="Sample volume"><small>Vol</small><input id="mix-sample" type="range" min="0" max="100" step="1" value="100" aria-label="Sample volume" /></label>
  ```

- Header `.sys`: replace the `<input id="volume" …>` element with:

  ```html
  <div class="levels">
    <label class="level"><small>Vol</small><input id="volume" type="range" min="0" max="100" step="1" value="100" aria-label="Volume" title="Volume" /></label>
    <label class="level"><small>Backing</small><input id="mix-backing" type="range" min="0" max="100" step="1" value="100" aria-label="Backing volume" title="Backing volume" /></label>
  </div>
  ```

  Keep the `#volume` id and attributes exactly as they are.

### 2. `src/main.ts`

- The mixer slider wiring looks sliders up by id (`mix-${channel}`), so it keeps working.
  Check that it still finds all six.
- Add:

  ```ts
  // The mixer view shows only the selected instrument's slider.
  function updateMixView(): void {
    mixPanel.querySelectorAll<HTMLElement>('.mix-channel').forEach((label) => {
      label.hidden = label.dataset.channel !== selected;
    });
  }
  ```

  Call it from `updateSelection()` (or wherever `updateDock()` is called after a selection
  change) and once at startup.
- In `updateSampleLook()`, also set the sample volume label's color: find
  `.sampler-volume` and set `--c` to `PIXEL_COLORS[sample.color] ?? ''`.
- No other behavior changes.

### 3. `src/style.css`

- **Mixer view (one slider)**:

  ```css
  .mix-panel {
    grid-template-columns: 1fr;
  }

  .mix-panel .mix-channel {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .mix-panel .mix-channel[hidden] {
    display: none;
  }

  .mix-panel .mix-channel small {
    flex: none;
    min-width: 7.5em;
  }
  ```

  Keep the existing `.mix-panel small { color: var(--c); }` and `.mix-panel input { accent-color: var(--c); }`.
  The slider input should fill the remaining width (`flex: 1; width: auto;`). Remove the
  six-column rule and its narrow-screen `gap` override if they no longer apply.
- **Sampler volume**:
  - `.sampler-panel`: `grid-template-columns: minmax(0, 1fr) auto auto auto;`.
  - Add:

    ```css
    .sampler-volume {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 110px;
      --c: var(--orange);
    }

    .sampler-volume small {
      font: 400 0.6rem/1 var(--label);
      color: var(--mute);
    }

    .sampler-volume input {
      flex: 1;
      min-width: 0;
      accent-color: var(--c);
    }
    ```

  - Inside `@media (max-width: 760px)`: `.sampler-volume { width: 72px; }` and
    `.sampler-volume small { display: none; }`.
- **Header levels**:
  - Add:

    ```css
    .levels {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 120px;
      min-width: 0;
    }

    .level {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .level small {
      font: 400 0.55rem/1 var(--label);
      color: var(--mute);
      width: 4.4em;
      flex: none;
    }

    .level input {
      flex: 1;
      min-width: 0;
      accent-color: var(--amber);
    }

    #mix-backing {
      accent-color: var(--cream);
    }
    ```

  - Move each existing `#volume` sizing rule to `.levels`, keeping the same values in each
    media query:
    - Base: change `#volume { width: 84px; … }` to just
      `#volume { min-width: 0; accent-color: var(--amber); }`. `.levels` sets the width.
    - `@media (max-width: 760px)`: `#volume { flex: 1; }` → `.levels { flex: 1; width: auto; }`.
    - `@media (max-height: 520px)`: `#volume { width: 56px; flex: none; }` →
      `.levels { width: 72px; flex: none; }`.
    - Landscape block: `#volume { flex: 1; width: auto; }` → `.levels { flex: 1; width: auto; }`.
  - The header must not grow taller than its buttons on desktop. The `.sys` buttons are 32px
    on desktop and 44px on phones, so two stacked 12px-tall sliders with a 3px gap fit. If a
    range input's default height makes it taller, set `.level input { height: 12px; }`.
- In the short-screen rule that hides the dock while it shows the mixer
  (`#dock:has(> #mix:not([hidden]))`), keep it as it is.

### 4. Docs

- `README.md`, `### Mixer`:
  - The slot under the board shows the selected instrument's volume slider.
  - Sample's volume is in the sampler panel.
  - The Backing volume sits under the main volume slider in the header, which also works on
    a phone held sideways.
  - Update the sentence that says the mixer is hidden sideways: the per-instrument slider is
    hidden there, but Backing and the main volume are not.
- `docs/references.md`: update the dock/mixer paragraph to match.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- PowerShell: `(Select-String -Path index.html -Pattern 'class="fx-knob mix-channel"').Count`
  prints 4.
- `git grep -n -F 'id="mix-sample"' -- index.html` prints one line, and it is inside
  `#sampler`.
- `git grep -n -F 'id="mix-backing"' -- index.html` prints one line, and it is inside
  `.levels`.
- `git grep -n -F 'function updateMixView' -- src/main.ts` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of all four layouts.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change audio, `src/mix.ts`, saved keys, slider ids, the dock height, or other
  panels.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Mute or solo.
- Showing a numeric percentage.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
