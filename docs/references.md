# Code reference

How Drumline Studio's code fits together. [AGENTS.md](../AGENTS.md) holds the rules.

## Files

- `src/config.ts`: tunable values, including `SPEED_BPMS`, `VOICE_LIMITS`, and
  `INSTRUMENT_INFO`.
- `src/sequencer.ts`: the pattern. `step()` advances one sixteenth note and returns
  `NoteEvent`s.
- `src/scheduler.ts`: step clock that runs on `AudioContext` time, slightly ahead of playback.
- `src/audio.ts`: `Audio_`, which owns the audio chain and every generated sound.
- `src/music.ts`: chords, arpeggios, and how the backing music builds up.
- `src/themes.ts`: one entry for each music theme.
- `src/render.ts`: draws the board into a 256×128 buffer, then scales it onto the canvas.
- `src/sprites.ts`: colors, sprites, and bitmap letters, stored as data.
- `src/pixel.ts`: pixel line, circle, and dither helpers with no DOM.
- `src/fonts/`: self-hosted fonts and their licenses.
- `src/main.ts`: connects everything, and handles input, the HUD, and saved settings.
- `vitest.sandbox.config.mjs`: runs the tests inside the Windows `dsh` sandbox, through
  `npm run test:sandbox`.
- `tests/loudness.ts`: browser-only audio check, with Neon's target levels stored in
  `tests/loudness-baseline.ts`.
- `.handoff/`: specs for work handed to another agent. The `plan*.md` files are tracked, while
  `report.md` and `last-run.log` are ignored. Specs record past work, so don't treat their values or
  instructions as current.
- `.github/workflows/deploy.yml`: tests and builds `main`, then deploys the result to GitHub Pages.
  A failing test blocks the deploy.

## How a step works

1. `Scheduler` calls `onStep` in `src/main.ts` slightly before the step is due to play. That lead is
   `LOOKAHEAD_SECONDS`.
2. `onStep` schedules the backing music and the metronome, calls `sequencer.step()`, and schedules
   each voice at the step's audio time. `sequencer.step()` returns every note on the current column,
   then moves the playhead to the next column.
3. Notes wait in `queued`, and `frame()` flashes them on the board once audio time reaches them.

The sequencer always runs slightly ahead of what the player sees and hears, so read visuals against
audio time, not against the sequencer's current state.

## Audio chain

```text
tower, music, and fx buses → master → trim → crusher → filter → limiter → soft clip → analyser → volume → output
```

- A `WaveShaper` curve can only be set once, so themes crossfade the crusher in and out instead of
  replacing its curve.
- The limiter lets through only about 0.4 dB for each 1 dB of `space.trim`, so loudness has to be
  measured, not worked out. [themes.md](themes.md) has the steps.
- The player's volume slider sits after the limiter, so it never changes the mix. It only turns the
  sound down from full level, and the loudness page renders at full level.
- Changing Neon or the shared chain means refreshing `tests/loudness-baseline.ts`.

## Visuals

`Renderer` draws into a 256×128 buffer, one 16px tile per board cell. `present()` scales that up by a
whole number to at least the canvas's displayed size, then CSS scales it to fit. This keeps every art
pixel the same size at any width, which `image-rendering: pixelated` can't promise at fractional
scales.

The step strip above the board is DOM. `main.ts` lights the playhead's step, and outlines the step
of the hovered cell.

On phones held upright, the board's size is limited by the screen width, so it runs edge to edge.
On phones held sideways, the controls sit in a column beside the board, which gives it most of the
screen. `#rotate-hint` on the start screen points players to that layout. These layouts were
measured in headless Edge at phone sizes, not on a real phone. On 360px-wide phones, selecting Synth
still moves the board by 5px, because its description wraps to an extra line.

## Audio load

Each sound costs audio CPU, and phones run out long before desktops. On one desktop core, a 75-note
board took about 70% before voice limits and 28% after, and Techno went from 102% to 42%.

- `pickVoices` caps each instrument per step with `VOICE_LIMITS`. Notes past the limit are skipped.
  `playNote` gets the number of voices played, not the number of notes, so a capped chord stays
  about as loud.
- Don't add automation to long-lived `AudioParam`s on every step. Those events add up over a run.
- The game uses `latencyHint: 'playback'`, because nothing depends on tapping in time. `frame()`
  subtracts the output latency, so the board matches what's heard.

## Saved settings

`localStorage` keys are `drumline-theme`, `drumline-backing`, and `drumline-volume`. Speed and
Mute aren't saved.

## Browser testing

- Audio won't start until a real click on **Start** or **Play**, because browsers require one.
- `window.__drumline` exposes `sequencer`, `scheduler`, and `audio` for debugging.
- `requestAnimationFrame` stops in a hidden tab, so the canvas stops updating. A hidden browser
  pane can also report a 0×0 viewport, which makes layout measurements meaningless. Set a real size
  first.
- With `npm run dev` running, `/tests/loudness.html` reports audio levels. Add `?theme=<id>` to
  check one theme.
