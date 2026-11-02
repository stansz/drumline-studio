# Plan: Live play with overdub recording, and a loop region

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add two features:

1. **Live play.** A mode button cycles through **Paint**, **Live**, and **Rec**.
   - Keys A S D F G H J K always play the selected instrument instantly, from the bottom row
     (A) to the top row (K).
   - In Live and Rec modes, tapping the board plays the selected instrument at the tapped row
     instead of painting.
   - In Rec mode, while the pattern is playing, every live hit is also written into the
     pattern at the nearest step (overdub).
2. **Loop region.** Dragging across the step lights above the board sets a section that
   repeats. Tapping the lights clears it.

## Files to touch

- `src/live.ts` (new)
- `src/sequencer.ts`
- `src/main.ts`
- `src/render.ts`
- `src/style.css`
- `index.html`
- `tests/live.test.ts` (new)
- `tests/sequencer.test.ts`
- `README.md`
- `AGENTS.md`
- `.handoff/report.md`

## Steps

### 1. `src/live.ts` (new, no DOM, no audio)

```ts
import { GRID_ROWS } from './config';

export type LiveMode = 'paint' | 'live' | 'rec';

const MODES: readonly LiveMode[] = ['paint', 'live', 'rec'];

export function nextLiveMode(mode: LiveMode): LiveMode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? 'paint';
}

// A plays the bottom row and K the top row.
export const LIVE_KEY_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'] as const;

export function liveRowForCode(code: string): number | null {
  const index = (LIVE_KEY_CODES as readonly string[]).indexOf(code);
  return index === -1 ? null : GRID_ROWS - 1 - index;
}

// Picks the step a live hit belongs to: the step being heard, or the next one when the hit
// lands in the second half of the step.
export function nearestStep(
  hitTime: number,
  markTime: number,
  markStep: number,
  nextStep: number,
  stepDuration: number,
): number {
  return hitTime - markTime >= stepDuration / 2 ? nextStep : markStep;
}
```

### 2. `src/sequencer.ts`

- Add the public field `loop: { start: number; end: number } | null = null;` (inclusive step
  indexes).
- Add a private field `private skips = new Set<string>();`.
- Add these methods:

  ```ts
  // The loop needs at least two steps inside the pattern length.
  setLoop(start: number, end: number): boolean {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    if (!Number.isInteger(low) || !Number.isInteger(high)) return false;
    if (low < 0 || high >= this.length || low === high) return false;
    this.loop = { start: low, end: high };
    return true;
  }

  clearLoop(): void {
    this.loop = null;
  }

  stepAfter(step: number): number {
    if (this.loop) {
      return step >= this.loop.start && step < this.loop.end ? step + 1 : this.loop.start;
    }
    return (step + 1) % this.length;
  }

  // A note recorded live has already sounded, so it skips the next time its step plays.
  skipOnce(col: number, row: number): void {
    this.skips.add(`${col},${row}`);
  }
  ```

- `rewind()`: `this.stepIndex = this.loop?.start ?? 0; this.skips.clear();`
- `clear()`: also calls `this.skips.clear()`.
- `setLength(length)`: first set `this.length = length`. Then, if `this.loop` exists and
  `this.loop.end >= length`, set `this.loop = null`. Then, if `this.stepIndex >= length`, set
  `this.stepIndex = this.loop?.start ?? 0`.
- `step()`:
  - Collect cells with `cell.col === this.stepIndex` as now. Skip any whose
    `` `${cell.col},${cell.row}` `` is in `skips`, deleting each skipped key from `skips`.
  - Then advance with `this.stepIndex = this.stepAfter(this.stepIndex);`.

### 3. `index.html`

- In `.keys`, between `</div>` of `.tempo` and `#backing`, add
  `<button id="live" class="hw" type="button" title="Paint, Live, or Rec (V)">Paint</button>`.
- Remove `aria-hidden="true"` from `#steps` and add `title="Drag to loop a section. Tap to clear the loop."`.

### 4. `src/main.ts`

- Import `nearestStep, nextLiveMode, liveRowForCode, type LiveMode` from `./live`.
- Add `const liveButton = byId<HTMLButtonElement>('live');`, `let liveMode: LiveMode = 'paint';`,
  and `let playheadAt = 0;`.
- Add a helper, and use it in `frame()` in place of its inline calculation:

  ```ts
  // The audio clock time being heard right now, after output latency.
  function heardTime(): number {
    if (!audioContext) return 0;
    const latency = audioContext.outputLatency || audioContext.baseLatency || 0;
    return Math.max(0, audioContext.currentTime - latency);
  }
  ```

- In `frame()`, where a step mark is consumed (`playhead = mark.step`), also set
  `playheadAt = mark.at`.
- In `stop()` and `hideOverlay()`, also set `playhead = sequencer.stepIndex` after
  `sequencer.rewind()`, so a set loop shows its start step. Then set `playheadAt = 0`.
- Add:

  ```ts
  function setLiveMode(mode: LiveMode): void {
    liveMode = mode;
    liveButton.textContent = mode === 'paint' ? 'Paint' : mode === 'live' ? 'Live' : 'Rec';
    liveButton.classList.toggle('selected', mode === 'live');
    liveButton.classList.toggle('rec', mode === 'rec');
    paint = null;
    hover = null;
  }

  function playLive(row: number): void {
    if (!audio || !audioContext) return;
    audio.playNote(selected, row, audioContext.currentTime, 1);
    if (liveMode !== 'rec' || !playing || !scheduler) return;
    const step = nearestStep(
      heardTime(),
      playheadAt,
      playhead,
      sequencer.stepAfter(playhead),
      scheduler.stepDuration,
    );
    if (!sequencer.set(selected, step, row)) return;
    if (step === sequencer.stepIndex) sequencer.skipOnce(step, row);
    renderer.flash({ instrument: selected, col: step, row });
    updateHud();
  }
  ```

- `liveButton` click: `setLiveMode(nextLiveMode(liveMode))`. Call `setLiveMode('paint')` at
  startup.
- Canvas `pointerdown`: when `liveMode !== 'paint'`, call `playLive(cell.row)` and return,
  before any paint logic. Do not capture the pointer in that case.
- Canvas `pointermove`: when `liveMode !== 'paint'`, set `hover = null` and return.
- Keydown handler, after the `if (event.repeat) return;` line and before the `switch`:

  ```ts
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const liveRow = liveRowForCode(event.code);
    if (liveRow !== null) {
      playLive(liveRow);
      return;
    }
  }
  ```

  Add `case 'v': setLiveMode(nextLiveMode(liveMode)); break;` to the `switch`.
- Loop region on the step strip:

  ```ts
  let loopDrag: number | null = null;

  function stripStep(event: PointerEvent): number {
    const rect = stepsEl.getBoundingClientRect();
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_COLS);
    return page * GRID_COLS + Math.max(0, Math.min(GRID_COLS - 1, index));
  }

  function updateLoopLeds(preview: { start: number; end: number } | null = null): void {
    const range = preview ?? sequencer.loop;
    stepLeds.forEach((led, i) => {
      const step = page * GRID_COLS + i;
      led.classList.toggle('looped', range !== null && step >= range.start && step <= range.end);
    });
  }
  ```

  - `stepsEl` `pointerdown`: if `stripStep(event) >= sequencer.length`, return. Otherwise set
    `loopDrag` to it, call `stepsEl.setPointerCapture(event.pointerId)`, and call
    `updateLoopLeds({ start: loopDrag, end: loopDrag })`.
  - `stepsEl` `pointermove`: if `loopDrag !== null`, let
    `end = Math.min(stripStep(event), sequencer.length - 1)` and call
    `updateLoopLeds({ start: Math.min(loopDrag, end), end: Math.max(loopDrag, end) })`.
  - `stepsEl` `pointerup`: if `loopDrag === null`, return. Let `end` be computed as in
    `pointermove`. If `end === loopDrag`, call `sequencer.clearLoop()`. Otherwise call
    `sequencer.setLoop(loopDrag, end)`. Then set `loopDrag = null` and call
    `updateLoopLeds()`.
  - `stepsEl` `pointercancel`: set `loopDrag = null` and call `updateLoopLeds()`.
  - Call `updateLoopLeds()` at the end of `setPage` and of `setLength`.
- Change the startup info text to
  `'Click or drag to paint. Click a note to remove it. Drag the step lights to loop.'`.
- In `frame()`, pass `hover: liveMode === 'paint' ? hover : null` to `renderer.draw`.

### 5. `src/render.ts`

- No change is needed beyond what `main.ts` passes. Leave this file unchanged unless
  `npm run typecheck` requires a change.

### 6. `src/style.css`

- `.steps`: add `cursor: pointer; touch-action: none; padding-block: 4px;`.
- Add:

  ```css
  .steps span.looped {
    background: rgba(239, 230, 208, 0.14);
  }

  .hw.rec {
    color: var(--red);
  }
  ```

- `.keys` base rule: `grid-template-columns: repeat(9, 1fr);`.
- Inside `@media (max-width: 760px)`:
  - Change `.keys` to `grid-template-columns: repeat(10, 1fr);`.
  - Change `.hw.go, .tempo` to `grid-column: span 5;`.
  - Add `.keys > .hw:not(.go) { grid-column: span 2; }`.
- Inside the `@media (max-height: 520px) and (orientation: landscape)` block:
  - Keep `.keys` at 2 columns and `.hw.go, .tempo` at `grid-column: span 2;`.
  - Add `.keys > .hw:not(.go) { grid-column: auto; }`.

### 7. Tests

- `tests/live.test.ts` (new):
  - `nextLiveMode` cycles paint → live → rec → paint.
  - `liveRowForCode('KeyA')` is 7, `liveRowForCode('KeyK')` is 0, and
    `liveRowForCode('KeyQ')` is `null`.
  - `nearestStep(10.0, 10.0, 3, 4, 0.125)` is 3.
  - `nearestStep(10.07, 10.0, 3, 4, 0.125)` is 4.
  - `nearestStep(10.05, 10.0, 15, 0, 0.125)` is 15.
- `tests/sequencer.test.ts`, new tests:
  - With `setLoop(4, 7)` and `stepIndex = 4`, eight `step()` calls visit 4,5,6,7,4,5,6,7.
    Check `stepIndex` before each call.
  - With `setLoop(4, 7)` and `stepIndex = 10`, one `step()` call leaves `stepIndex` at 4.
  - `setLoop(5, 5)`, `setLoop(-1, 3)`, and `setLoop(3, 16)` (length 16) return false and
    leave `loop` null. `setLoop(9, 2)` returns true and stores `{ start: 2, end: 9 }`.
  - `rewind()` with a loop at 4–7 sets `stepIndex` to 4. `clearLoop()` then `rewind()` sets it
    to 0.
  - After `setLength(32)` and `setLoop(20, 23)`, calling `setLength(16)` clears the loop.
  - `skipOnce`: with a kick at column 2, `stepIndex = 2`, and `skipOnce(2, row)`, the first
    `step()` returns no notes. After 15 more `step()` calls, the next `step()` returns the
    kick.

### 8. Docs

- `README.md`:
  - Describe the **Paint / Live / Rec** button (key **V**). Keys **A S D F G H J K** play the
    selected instrument live from the bottom row to the top. In Live and Rec, tapping the
    board plays instead of painting. In Rec, while playing, live hits are added to the
    pattern at the nearest step.
  - Describe the loop: drag across the step lights above the board to loop a section, and
    tap them to clear it.
- `AGENTS.md`: change the rule "Each note plays only on its own step, and only while that
  step is within the pattern length." to "Each note plays only on its own step, and only while
  that step is within the pattern length and the loop. A note recorded live skips its next
  pass because it already sounded." Also add: "Keep `src/live.ts` free of the DOM and audio."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, and its output lists `tests/live.test.ts`.
- `git grep -n "id=\"live\"" -- index.html` prints one line.
- `git ls-files --others --exclude-standard -- src/live.ts tests/live.test.ts` prints both
  paths.
- `git grep -n -E "document|window|AudioContext" -- src/live.ts` prints nothing (exit 1).

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change themes, audio voices, tempo, backing music, or the 16/32-step behavior.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- In `src/render.ts`, keep to whole art pixels. Don't use `arc`, `shadowBlur`, `globalAlpha`,
  `setLineDash`, `fillText`, or `ctx.scale`.

## Out of scope

- FX controls.
- Recording audio from a microphone.
- Undo for recorded notes.
- Saving the loop or mode to `localStorage`.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
