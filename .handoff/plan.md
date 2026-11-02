# Plan: Drumline Studio milestone 1, from tower defense to step sequencer

## Goal

This repo is a fresh copy of the DrumlineTD tower defense game. Turn it into **Drumline Studio**, a
browser step sequencer. Remove every game system: enemies, waves, money, lives, path, balance, and
the playtest harness. Keep the audio engine, themes, scheduler, pixel renderer, step strip, phone
layout, and saved settings. The 16×8 grid becomes a pattern: each column is one of 16 steps, and
each cell holds at most one note (Kick, Hat, or Synth). Every note plays only on its own column's
step, hats included. Click or drag to paint notes, Play/Stop the loop, clear the pattern, and switch
the backing music on or off.

## Files to touch

Delete:

- `src/sim.ts`
- `src/waves.ts`
- `tools/` (the whole directory)
- `docs/balance.md`
- `.github/workflows/upgrades.yml`
- `.handoff/plan-attacks.md`, `.handoff/plan-phone-layout.md`, `.handoff/plan-retheme-fixes.md`,
  `.handoff/plan-retheme.md`, `.handoff/plan-tower-balance.md`
- `tests/attacks.test.ts`, `tests/auto-wave.test.ts`, `tests/balance-docs.test.ts`,
  `tests/balance.test.ts`, `tests/boss-bound.test.ts`, `tests/bots.ts`, `tests/plans.test.ts`,
  `tests/playtest.test.ts`, `tests/propose.test.ts`, `tests/report.test.ts`, `tests/rules.test.ts`,
  `tests/search.test.ts`, `tests/sim.test.ts`, `tests/tiers.test.ts`, `tests/waves.test.ts`
- `tests/fixtures/` (the whole directory)

Create:

- `src/sequencer.ts`
- `tests/sequencer.test.ts`

Modify:

- `src/config.ts`, `src/music.ts`, `src/audio.ts`, `src/render.ts`, `src/main.ts`, `src/style.css`
- `index.html`
- `tests/voices.test.ts`, `tests/loudness.ts`
- `package.json`, `package-lock.json` (only the two top-level `"name"` fields), `.gitignore`
- `tsconfig.json`
- `.github/workflows/deploy.yml`
- `README.md`, `AGENTS.md`, `docs/references.md`, `docs/themes.md`

## Steps

### 1. Delete the game-only files

Delete every path in the Delete list above.

### 2. Create `src/sequencer.ts`

It must not use the DOM, audio, or randomness. Exact API:

```ts
import { GRID_COLS, GRID_ROWS, STEPS_PER_BAR } from './config';

export type Instrument = 'kick' | 'hat' | 'synth';
export const INSTRUMENTS: readonly Instrument[] = ['kick', 'hat', 'synth'];

export interface Cell {
  instrument: Instrument;
  col: number;
  row: number;
}

export interface NoteEvent {
  instrument: Instrument;
  col: number;
  row: number;
}

export class Sequencer {
  cells: Cell[] = [];
  stepIndex = 0;

  inGrid(col: number, row: number): boolean;
  cellAt(col: number, row: number): Cell | null;
  set(instrument: Instrument, col: number, row: number): boolean;
  erase(col: number, row: number): boolean;
  clear(): void;
  rewind(): void;
  step(): NoteEvent[];
}
```

- `inGrid` is true only for integers with `0 <= col < GRID_COLS` and `0 <= row < GRID_ROWS`.
- `set` returns false and changes nothing when the cell is outside the grid. When the cell already
  holds the same instrument, it returns false and changes nothing. When the cell holds a different
  instrument, it replaces that instrument in place and returns true. When the cell is empty, it
  appends a new `Cell` and returns true.
- `erase` removes the cell's note and returns true. It returns false when the cell has no note.
- `clear` empties `cells`. `rewind` sets `stepIndex` to 0.
- `step` returns a `NoteEvent` for every cell whose `col === stepIndex`, in `cells` order. It then
  sets `stepIndex = (stepIndex + 1) % STEPS_PER_BAR`.

### 3. `src/config.ts`

- Change the type import to `import type { Instrument } from './sequencer';`.
- Delete these: `AUTO_WAVE_STEPS`, `PATH_WAYPOINTS`, `SELL_REFUND`, `BOSS_LEAKS`,
  `CHORD_BONUS_PER_TOWER`, `CHORD_MAX_TOWERS`, `KILL_VOICE_LIMIT`, `TowerStats`, `TOWERS`,
  `EnemyStats`, `ENEMIES`, `Rules`, `DEFAULT_RULES`, `WaveGroup`, `WaveCurve`, `WAVE_CURVE`,
  `DifficultyId`, `Difficulty`, `DIFFICULTIES`.
- Rename `TOWER_VOICE_LIMITS` to `VOICE_LIMITS`, typed `Record<Instrument, number>`, with the same
  values. Update its comment to say that notes past the limit are skipped.
- Replace `TOWER_INFO` with:

```ts
export const INSTRUMENT_INFO: Record<Instrument, { name: string; description: string }> = {
  kick: { name: 'Kick', description: 'Low drum. Higher rows tune it up.' },
  hat: { name: 'Hat', description: 'Noise tick. Higher rows sound brighter.' },
  synth: { name: 'Synth', description: "Plays the theme's scale. Higher rows play higher notes." },
};
```

- Keep everything else exactly as it is: `GRID_COLS`, `GRID_ROWS`, `STEPS_PER_BAR`, `BPM`,
  `stepSeconds`, `SPEED_BPMS`, `MUSIC_CHORDS`, `BASS_STEPS`, `ARP_STEPS`, and `MIX`.

### 4. `src/music.ts`

- Import `VOICE_LIMITS` instead of `TOWER_VOICE_LIMITS`, and `type Instrument` from `./sequencer`.
- Change `pickVoices` to `pickVoices<T extends { instrument: Instrument }>(notes: readonly T[]): T[]`.
  For each instrument in the order kick, hat, synth, take that instrument's notes as `group`. Set
  `count = Math.min(VOICE_LIMITS[type], group.length)`, and push
  `group[Math.floor((i * group.length) / count)]` for `i` from 0 to `count - 1`. The hit-priority
  logic goes away. Update the comment above the function to match.
- Leave the rest of the file unchanged.

### 5. `src/audio.ts`

- Import `type Instrument` from `./sequencer` instead of `TowerType` from `./sim`.
- Change `playNote` to `playNote(instrument: Instrument, row: number, time: number, voiceCount: number)`,
  with `const baseLevel = 1 / Math.sqrt(Math.max(1, voiceCount));`. Keep the random level jitter,
  the kick ducking, and the three branches.
- Delete `playKill` and `playLeak`, and any private helper used only by them. If nothing else reads
  `MIX.kill`, delete it from `MIX` in `src/config.ts` too.
- Leave the rest of the file unchanged.

### 6. `src/render.ts`

- Imports: take `type Instrument`, `type NoteEvent`, and `type Sequencer` from `./sequencer`. Stop
  importing from `./sim`, as well as `CHORD_BONUS_PER_TOWER`, `CHORD_MAX_TOWERS`, `ENEMIES`, and
  `TOWERS`.
- Change `RenderState` to:

```ts
export interface RenderState {
  sequencer: Sequencer;
  now: number;
  playhead: number;
  selected: Instrument | 'erase';
  hover: { col: number; row: number } | null;
}
```

- Rename `TOWER_OUTLINE` to `NOTE_OUTLINE`, typed `Record<Instrument, string>`, with the same colors.
- Delete these: `Particle`, `KickEffect`, `HatEffect`, `BoltEffect`, `AttackEffect`, `ChordLabel`,
  `boltPoints`, `SHADOW`, `PARTICLE_GRAVITY`, `PARTICLE_SPEED`, the `pathCellList`, `laneKeys`,
  `hitFlashes`, `effects`, `particles`, `label`, and `leakAt` fields, and the `drawRanges`,
  `drawEnemies`, `drawEffects`, `drawParticles`, `drawLabel`, and `drawLeak` methods. Also delete
  any helper (`circP`, `lineP`, and so on) and import (`circlePoints`, `linePoints`, `INK`, and so
  on) that nothing uses afterwards. Keep the `BAKED` map and `bake`/`hitColor` as they are.
- Replace `spawnEffect(event)` with `flash(note: NoteEvent): void`, which only does
  `this.flashes.set(`${note.col},${note.row}`, this.lastNow)`.
- `bakeBoard`: delete everything that draws the path. That means the dithered path cells, the lane
  edge loop, the chevron loop, the `IN` label, and the exit hole. Keep the background, the cells,
  and the group dividers.
- `drawPlayhead`: remove the `laneKeys` check, so the tick draws on every row.
- `drawPreview`: return when `hover` is null or `selected === 'erase'`. Also return when
  `state.sequencer.cellAt(hover.col, hover.row)?.instrument === selected`. Otherwise draw the
  existing dithered sprite of `selected`, with no range circle.
- Rename `drawSellOutline` to `drawEraseOutline`. It runs only when `selected === 'erase'` and the
  hovered cell holds a note, and it strokes that tile with `PIXEL_COLORS.r`.
- Rename `drawTowers` to `drawNotes`. It iterates `state.sequencer.cells`, sorted by row, using
  `cell.instrument` and the same flash logic.
- `draw` calls, in order: board, `drawPlayhead`, `drawPreview`, `drawEraseOutline`, `drawNotes`,
  `present`.
- `drawLogo`: delete the red "TD" pad block at the end, and set `canvas.width = width + 2`.
- Keep the AGENTS.md drawing rules: no `arc`, `shadowBlur`, `globalAlpha`, `setLineDash`,
  `fillText`, or `ctx.scale`.

### 7. `index.html`

- `<title>Drumline Studio</title>`, and the meta description `Drumline Studio is a pixel-art drum
  machine and synth sequencer in your browser.`. Set the canvas `aria-label` values to
  `Drumline Studio` and `Pattern grid`.
- Replace the three `.lcd` blocks with exactly two:
  `<div class="lcd"><small>Notes</small><span id="notes">0</span></div>` and
  `<div class="lcd"><small>Step</small><span id="step">01/16</span></div>`.
- Instruments bank: keep the Kick, Hat, and Synth pads, but delete each pad's
  `<small class="cost"></small>`. Change the fourth pad to
  `<button id="tool-erase" class="pad" type="button"><span class="led"></span><canvas data-sprite="sell" width="16" height="16"></canvas><b>Erase</b><kbd>4</kbd></button>`.
- Transport bank, in this order:
  `<button id="play" class="hw go" type="button">Play</button>`,
  `<button id="backing" class="hw" type="button">Backing</button>`, the existing `#speed`, the
  existing `#mute`, and `<button id="clear" class="hw" type="button">Clear</button>`. Delete
  `#start-wave`, `#auto-wave`, and `#restart`.
- Overlay: set `#overlay-text` to `Paint a beat. Each column is one step.`. Replace
  `#mode-buttons` and its contents with
  `<div id="mode-buttons"><button id="start" class="hw mode" type="button"><span>Start</span></button></div>`.
  Delete `#channel-label`, and keep `#rotate-hint`.

### 8. `src/style.css`

Delete the `.lcd.lives`, `.lcd.wave`, `#mode-hard span`, `#mode-easy span`, `#channel-label`, and
`#channel-label[hidden]` rules, and any `.cost` rules. Change nothing else.

### 9. `src/main.ts`

Rewrite it around `Sequencer`. Keep the existing helpers as they are: `byId`, theme load/cycle,
volume load/change, `cycleSpeed`, `toggleMute`, `cellAt`, the step strip LEDs, the logo and icon
drawing, and the `frame()` latency handling.

- State: `const sequencer = new Sequencer()`, `scheduler`, `audio`, `audioContext`,
  `started = false`, `playing = false`, `speedIndex`, `muted`,
  `selected: Instrument | 'erase' = 'kick'`, `hover`, `queued: Array<{ at: number; note: NoteEvent }>`,
  `musicStep`, `stepMarks`, `playhead`, `theme`, `volume`, `backing = loadBacking()`, `stepLeds`,
  `litStep`, and `paint: 'add' | 'erase' | null = null`.
- `window.__drumline` type and value: `{ sequencer: Sequencer; scheduler: Scheduler | null; audio: Audio_ | null }`.
- `BACKING_KEY = 'drumline-backing'`. `loadBacking()` returns `localStorage.getItem(BACKING_KEY) !== '0'`
  in `try`/`catch`, and `true` on error. `toggleBacking()` flips it, updates the button
  (`selected` class and `aria-pressed`), and saves `'1'`/`'0'` in `try`/`catch`.
- `onStep(time, duration)`:
  - If `backing` is on, call
    `audio.playMusicStep(musicStep, time, duration, layerLevels(intensity(sequencer.cells.length, 5)))`.
  - If `sequencer.cells.length === 0` and `sequencer.stepIndex % 4 === 0`, call
    `audio.playMetronome(time, sequencer.stepIndex === 0)`.
  - Call `audio.setTempo(duration)`, then push `{ at: time, step: sequencer.stepIndex }` to `stepMarks`.
  - Set `notes = sequencer.step()` and `voices = pickVoices(notes)`. Call
    `audio.playNote(v.instrument, v.row, time, voices.length)` for each voice, and push every note
    in `notes` to `queued` with `at: time`.
  - Increment `musicStep`.
- `startAudio()`: the existing `startGame` body, minus the difficulty code. It creates the context,
  `Audio_`, and `Scheduler`, and sets theme, mute, volume, and bpm. It sets `started = true`, hides
  the overlay, then calls `play()`. On error it resets `started` and shows the overlay, as now.
- `play()`: when not started, call `startAudio()` and return. Otherwise run `scheduler.start()`, set
  `playing = true`, and set the Play button text to `Stop` and add its `selected` class.
- `stop()`: run `scheduler.stop()` and set `playing = false`. Call `sequencer.rewind()`, then set
  `musicStep = 0`, `playhead = 0`, `queued = []`, and `stepMarks = []`. Set the button text to
  `Play` and remove its `selected` class.
- `togglePlay()`: `playing ? stop() : play()`.
- Painting, using pointer events on the canvas. Delete the old `click` handler.
  - On `pointerdown`, find the cell; ignore the event when there is none. When `selected` is an
    instrument and the cell already holds that instrument, set `paint = 'erase'`. Otherwise set
    `paint = 'add'`, or `'erase'` when `selected === 'erase'`. Apply the mode to the cell, then call
    `canvas.setPointerCapture(event.pointerId)`.
  - On `pointermove`, update `hover`. When `paint` is set and the cell isn't null, apply the mode
    to it.
  - On `pointerup`, `pointercancel`, and `lostpointercapture`, set `paint = null`.
  - On `pointerleave`, set `hover = null`.
  - "Apply" means `sequencer.set(selected, col, row)` for `'add'` (only when `selected` is an
    instrument), and `sequencer.erase(col, row)` for `'erase'`. After each change, call
    `updateHud()` and `updateInfo()`.
- `clearPattern()`: `sequencer.clear()`, `updateHud()`, `updateInfo()`.
- `updateHud()`: `#notes` shows `sequencer.cells.length`. `#step` shows
  `${String(playhead + 1).padStart(2, '0')}/16`. Call it from `frame()` whenever `playhead` changes.
- `updateStepHints()`: light the `fires` class only on the step LED whose index equals the hovered
  cell's `col`, when `hover` isn't null.
- `updateInfo()`:
  - When the hovered cell holds a note:
    `${INSTRUMENT_INFO[i].name} on step ${col + 1}, row ${GRID_ROWS - row} of ${GRID_ROWS}. ${INSTRUMENT_INFO[i].description}`.
  - Otherwise, when `selected === 'erase'`: `Click or drag over notes to erase them.`.
  - Otherwise: `${INSTRUMENT_INFO[selected].name}: ${INSTRUMENT_INFO[selected].description} Click or drag on the grid to add notes, and click a note again to remove it.`.
- `frame()`: same as now, except `queued` items call `renderer.flash(item.note)`, the end-overlay
  logic is gone, and `renderer.draw({ sequencer, now, playhead, selected, hover })`.
- Buttons: `#tool-kick`, `#tool-hat`, `#tool-synth`, and `#tool-erase` select tools. Then `#play`
  runs `togglePlay`, `#backing` runs `toggleBacking`, `#speed` runs `cycleSpeed`, `#mute` runs
  `toggleMute`, `#clear` runs `clearPattern`, `#theme` runs `cycleTheme`, `#volume` input runs
  `changeVolume`, and `#start` runs `play`.
- Keys: on the overlay, while it is visible, Enter or Space runs `play` and T runs `cycleTheme`.
  Otherwise Space (with `preventDefault`) runs `togglePlay`, and the rest are:
  - `1`/`2`/`3`/`4` for kick, hat, synth, and erase
  - `b` for `toggleBacking`, `c` for `clearPattern`, `f` for `cycleSpeed`
  - `m` for `toggleMute`, `t` for `cycleTheme`

  Ignore `event.repeat`. Delete the old `escape`, `a`, `r`, `e`, and `h` handling.
- Delete these: difficulty, auto-wave (`AUTO_WAVE_KEY` and its functions), sell, cost labels, the
  mode-button details, the `VITE_CHANNEL` block, `showEndOverlay`, and `resetRun`/`restart`.
  `showStartOverlay` sets the text to `Paint a beat. Each column is one step.`.

### 10. Tests

- `tests/sequencer.test.ts` covers:
  - `set` adds a note, returns false for the same instrument, replaces a different instrument
    (still one cell), and returns false outside the grid (`-1,0`, `16,0`, `0,8`, `0.5,0`).
  - `erase` returns true then false.
  - `clear` empties the pattern.
  - A hat at column 4 plays only on step 4 across 32 steps, and so does a kick.
  - Two notes in one column come back together in `cells` order.
  - `stepIndex` wraps from 15 to 0.
  - `rewind` resets `stepIndex`.
- `tests/voices.test.ts`:
  - Use `instrument` in place of `towerType`, `Instrument` from `../src/sequencer`, and
    `VOICE_LIMITS` in place of `TOWER_VOICE_LIMITS`.
  - Drop the `hit` field and the `prefers notes that hit` test. Keep the other five tests.
  - `spreads a big chord across its pitches` still expects `[0, 3, 6]`.
- `tests/loudness.ts`:
  - Replace `Sim` with `Sequencer`, and `TowerType` with `Instrument`.
  - `fullBoard` fills every grid cell, with no `canPlace` probe.
  - Rendering places the board with `sequencer.set` and throws if it returns false. Levels use
    `intensity(sequencer.cells.length, 5)`, and each step calls
    `audio.playNote(voice.instrument, voice.row, time, voices.length)`.
  - Delete the kill loop, `KILLS_PER_STEP`, and the `TOWERS` and `KILL_VOICE_LIMIT` imports.
  - Keep everything else.

### 11. Project files

- `package.json`: set `"name": "drumline-studio"` and delete the five `playtest*` scripts.
  `package-lock.json`: change only the top-level `"name"` and the `packages[""].name` from
  `drumline` to `drumline-studio`.
- `.gitignore`: delete the `playtest-out/` line.
- `tsconfig.json`: change `"include"` to `["src","tests","vite.config.ts"]`.
- `.github/workflows/deploy.yml`: replace it with a single build. On push to `main` and
  `workflow_dispatch` with no inputs, the `build` job runs `actions/checkout@v7`,
  `actions/setup-node@v7` (Node 22, npm cache), `npm ci`, `npm test`, `npm run build`, and
  `actions/upload-pages-artifact@v5` with `path: dist`. The `deploy` job is the existing one, minus
  its `if:`. Keep the same `permissions` and `concurrency`, and no `VITE_CHANNEL`.

### 12. Docs

- `README.md`: rewrite it for Drumline Studio. Cover:
  - one line saying what it is, and that it was forked from DrumlineTD (https://github.com/stansz/drumline)
  - **How to use**: grid, steps, rows as pitch, painting, Play/Stop, Backing, themes
  - **Controls**: the keys from step 9
  - **Commands**: `npm install`, `npm run dev`, `npm test`, `npm run test:sandbox`,
    `npm run typecheck`, `npm run build`
  - **Credits**: the existing fonts paragraph

  Don't include a live link yet.
- `AGENTS.md`: rewrite the intro and commands for Drumline Studio. Delete the waves/difficulty and
  playtest read-before lines, and the rules about `src/sim.ts`, `this.rules`, `tools/playtest/`,
  playtest output, `new Sim()`, `tests/balance.test.ts`, `docs/balance.md`, and "count game time
  in steps". Add these rules:
  - Keep `src/sequencer.ts` free of the DOM, audio, and randomness.
  - Each note plays only on its own column's step.

  Change the themes rule to: "Themes change the sound only, never the pattern or the tempo." Keep
  the `drumline-*` keys and `window.__drumline` rule. The deploy paragraph says pushing to `main`
  deploys to GitHub Pages and a failing test blocks the deploy, with no mention of `upgrades`.
- `docs/references.md`:
  - Update the Files list to the current files (`src/sequencer.ts` replaces `src/sim.ts`; no
    `waves.ts`, `tools/playtest/`, `tests/bots.ts`, or `tests/fixtures/`).
  - Rewrite "How a step works" around `sequencer.step()`.
  - Remove the deploy-workflow upgrades details, the whole "Playtest harness" section, and every
    link to `balance.md`.
  - Add `drumline-backing` to saved settings, and drop `drumline-auto-wave`.
  - In "Browser testing", say audio starts on the first click of **Start** or **Play**.
- `docs/themes.md`: add one sentence under "Keeping volume consistent" saying the loudness baseline
  in `tests/loudness-baseline.ts` was measured on DrumlineTD boards and must be refreshed for the
  full 128-cell grid.

## Acceptance

- `test ! -e tools && test ! -e src/sim.ts && test ! -e src/waves.ts && test ! -e docs/balance.md && test ! -e .github/workflows/upgrades.yml && test ! -e tests/fixtures`
  exits 0.
- `grep -rnE "Sim\b|TowerType|towerType|DIFFICULTIES|ENEMIES|TOWERS\b|pathCells|playKill|playLeak|VITE_CHANNEL|AUTO_WAVE" src tests index.html`
  prints nothing.
- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, and its output lists `tests/sequencer.test.ts`.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None. Do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change `src/themes.ts`, `src/scheduler.ts`, `src/pixel.ts`, `src/sprites.ts`, `src/fonts/`,
  `public/`, or `tests/loudness-baseline.ts`.
- Do not add dependencies.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- New instruments (snare, clap, bass), drum lanes, tempo or swing sliders, saving or sharing
  patterns, multiple patterns, mute/solo, and export.
- Refreshing the loudness baseline.
- Renaming `localStorage` keys or `window.__drumline`.
- Any git remote or GitHub setup.

## If blocked

Stop, and write in `.handoff/report.md` the step, the exact command, and the error output. Do not
improvise a different design.
