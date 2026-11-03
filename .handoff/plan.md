# Plan: Separate backing-music level per theme, and loudness checks for it

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), each theme's
`space.trim` boosts the whole mix. It was tuned for the instruments, so themes with big
trims (Chiptune 2.7, Funk 2.4) have backing music far louder than the others. Measured on
the live site with an empty grid: Neon −25.7 dB, Chiptune −18.8, Lo-fi −23.4, Techno −27.2,
Funk −21.8.

Make two changes:

1. **Audio:**
   - Add `space.musicTrim` to each theme. It sets the backing music's level on its own:
     the backing ends up scaled by `musicTrim` no matter what `trim` is.
   - `trim` keeps scaling the instruments.
2. **Loudness harness (`tests/loudness.ts`):** measure the two separately.
   - **Instrument boards** render with no backing music, and are checked against `trim`.
   - **Backing boards** render backing music only, with no notes, and are checked against
     `musicTrim`, by comparing each theme with Neon rendered in the same run.

The final `musicTrim` and `trim` numbers are tuned afterwards by the verifier in a browser.
This plan sets the starting values below.

## Files to touch

- `src/themes.ts`
- `src/audio.ts`
- `tests/loudness.ts`
- `tests/loudness-baseline.ts`
- `tests/themes.test.ts`
- `docs/themes.md`
- `docs/references.md`
- `AGENTS.md`
- `.handoff/report.md`

## Steps

### 1. `src/themes.ts`

- In the `Theme` type's `space`, add `musicTrim: number;` directly after `trim: number;`,
  with this comment on the line above it:
  `// Backing-music level, independent of trim. Neon stays at 1.`
- Add `musicTrim` to every theme's `space`, directly after `trim`:
  - Neon 1
  - Chiptune 1.22
  - Lo-fi 0.77
  - Techno 1.19
  - Funk 1.53
- Change no other theme values.

### 2. `src/audio.ts`

- Add a private field `musicTrim: GainNode`.
- In the constructor:
  - Create `this.musicTrim = ctx.createGain()` with `gain.value = 1`.
  - Change the wiring so the music bus goes through it:
    - Replace `this.musicBus.connect(this.master);` with
      `this.musicBus.connect(this.musicTrim); this.musicTrim.connect(this.master);`.
    - Replace `this.musicBus.connect(this.musicReverbSend);` with
      `this.musicTrim.connect(this.musicReverbSend);`.
  - Leave every other connection as it is. Kick ducking keeps automating `musicBus.gain`.
- In `setTheme`, next to the line that sets `this.trim.gain`, add:

  ```ts
  // The master trim also scales the backing, so divide it back out: the backing ends up at
  // musicTrim whatever the instruments' trim is.
  this.musicTrim.gain.setTargetAtTime(space.musicTrim / space.trim, now, 0.02);
  ```

- Add a public method for the harness only:

  ```ts
  // Silences the backing music, for loudness checks of the instruments alone.
  setMusicEnabled(enabled: boolean): void {
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.value = enabled ? 1 : 0;
  }
  ```

  Not used by `main.ts`. Rendering in the harness without calling `playMusicStep` is the main
  way to skip music. This method exists so that the kick ducking can't bring music back. It
  is not strictly needed. If it complicates anything, skip it and say so in the report.

### 3. `tests/loudness.ts`

- `renderBoard` gains a fourth-position options parameter, before `theme`:
  `mode: 'notes' | 'backing'`, plus an optional `intensityLevel?: number`.
  - `'notes'`: render the board's notes only. Do not call `audio.playMusicStep`.
  - `'backing'`: render only `audio.playMusicStep` with
    `layerLevels(intensityLevel ?? intensity(0, 5))`, and no notes. The board is ignored.

  Use this signature:
  `renderBoard(name, board, bpm, mode, theme, intensityLevel?)`.
- Add backing boards:

  ```ts
  // Backing music alone, at the level an empty grid gets and at the fullest it gets.
  const BACKING_BOARDS: Record<string, number> = {
    'backing quiet': intensity(0, 5),
    'backing full': 1,
  };
  ```

- `runLoudness`:
  - Neon's non-theme pass (all `BOARDS`, both BPMs) uses mode `'notes'`.
  - For every theme in the run (the `?theme=` filter as now), render `THEME_BOARDS` with
    mode `'notes'`.
  - For every theme in the run **and always for Neon**, render each `BACKING_BOARDS` entry
    at both BPMs with mode `'backing'`.
  - Neon must be included in the backing pass even when `?theme=` names another theme, so
    each run has its own Neon backing reference.
- `themeOffsets`: unchanged in logic. It only uses results whose board is in
  `NEON_BASELINE`, so backing results are excluded automatically.
- Add `musicOffsets(results)`:
  - For each theme other than Neon, take the mean of
    `result.rmsDb − neonBacking[board][bpm]` over its backing results, where `neonBacking`
    comes from Neon's backing results in the same run.
  - Return `{ [theme name]: offset }`, rounded to 0.1.
- Add `suggestedMusicTrims(offsets)`: like `suggestedTrims`, but
  `theme.space.musicTrim * 10 ** (-offset / LIMITER_RESPONSE / 20)`.
- Report object: add `musicOffsets` and `suggestedMusicTrims` after `suggestedTrims`.
- Title: `PASS` requires nothing clipped, every `offsets` value within
  `LOUDNESS_TOLERANCE_DB`, **and** every `musicOffsets` value within it.
- Rename the result field `towers` to `notes`.
- Update the header comment to describe both checks.

### 4. `tests/loudness-baseline.ts`

Keep the existing numbers. Change the comment to:

```ts
// Neon's average level in dB for the instrument boards, rendered without backing music. Refresh
// from the loudness page's `baseline` output whenever Neon, the shared audio chain, or the way
// boards are rendered changes. Backing levels need no baseline: each run renders Neon's backing.
```

The verifier will refresh the numbers in a browser after this change.

### 5. `tests/themes.test.ts`

Add these assertions:

- `DEFAULT_THEME.space.musicTrim` is 1.
- Every theme's `space.musicTrim` is a finite number between 0.25 and 4.

### 6. Docs

- `docs/themes.md`: rewrite "Keeping volume consistent" and "Adding or changing a theme" so
  they describe two levels:
  - `space.trim` sets the instruments' level. It is checked on instrument boards rendered
    without backing, against `NEON_BASELINE`.
  - `space.musicTrim` sets the backing's level on its own. It is checked on the "backing
    quiet" and "backing full" boards, against Neon rendered in the same run. Read
    `musicOffsets` and `suggestedMusicTrims` on the loudness page.
  - Both targets are within 1 dB of Neon.
  - Keep Neon at 1 for both.
  - Keep the existing notes about the limiter and the volume slider.
- `docs/references.md`, **Audio chain**:
  - Add `musicTrim` to the diagram: the music bus goes through its own trim before the
    master.
  - Add one sentence: the master `trim` scales everything, so `setTheme` sets the music trim
    to `musicTrim / trim`.
- `AGENTS.md`: change "Keep Neon's `space.trim` at 1. It is the loudness reference." to "Keep
  Neon's `space.trim` and `space.musicTrim` at 1. Neon is the loudness reference."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- PowerShell: `(Select-String -Path src/themes.ts -Pattern 'musicTrim:').Count` prints 6 (the
  type plus five themes).
- `git grep -n -F 'musicTrim' -- src/audio.ts` prints at least three lines.
- `git grep -n -F 'musicOffsets' -- tests/loudness.ts` prints at least two lines.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- The loudness page check in a browser (the verifier tunes the values).

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change any theme value other than adding `musicTrim`.
- Do not change instrument sounds, FX, the sampler, or the UI.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Tuning the final numbers (the verifier does this in a browser).
- Refreshing `NEON_BASELINE` values.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
