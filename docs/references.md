# Code reference

How Drumline Studio's code fits together. [AGENTS.md](../AGENTS.md) holds the rules.

## Files

- `src/config.ts`: tunable values, including `MAX_STEPS`, `MIX`, `LIVE_TOOLS`, `VOICE_LIMITS`,
  and `INSTRUMENT_INFO`.
- `src/sequencer.ts`: the pattern. `step()` returns the notes on the current step and moves on to
  `stepAfter()`.
- `src/scheduler.ts`: step clock that runs on `AudioContext` time, slightly ahead of playback.
- `src/audio.ts`: `Audio_`, which owns the audio chain and every generated sound.
- `src/samples.ts`: the built-in sample presets and the row-to-pitch rate.
- `src/sampler.ts`: renders each sample preset into an `AudioBuffer` with an
  `OfflineAudioContext`.
- `src/fx.ts`: FX settings, parsing, and filter cutoffs.
- `src/live.ts`: live-play modes, key rows, and nearest-step quantizing; hidden by `LIVE_TOOLS`.
- `src/music.ts`: chords, arpeggios, and how the backing music builds up.
- `src/themes.ts`: one entry for each music theme.
- `src/pattern.ts`: autosave JSON and the `v1.`/`v2.` share-link formats.
- `src/midi.ts`: MIDI file writer.
- `src/recording.ts`: recording type, file names, and timer text.
- `src/render.ts`: draws the board into a 256×128 buffer, then scales it onto the canvas.
- `src/sprites.ts`: colors, sprites, and bitmap letters, stored as data.
- `src/pixel.ts`: pixel line, circle, and dither helpers with no DOM.
- `src/style.css`: the page layout and the look of the controls and panels.
- `src/fonts/`: self-hosted fonts and their licenses.
- `src/main.ts`: connects everything, and handles input, the HUD, and saved settings.
- `index.html`: the page markup, the HUD, and the panel buttons.
- `public/`: static files served as-is, such as `favicon.svg`.
- `vitest.sandbox.config.mjs`: runs the tests inside the Windows `dsh` sandbox, through
  `npm run test:sandbox`.
- `tests/loudness.ts`: browser-only audio check, with Neon's target levels stored in
  `tests/loudness-baseline.ts`.
- `.handoff/`: `plan.md` is tracked and holds the most recent spec; earlier specs are in git
  history. `report.md` and `last-run.log` are ignored.
- `.github/workflows/deploy.yml`: tests and builds `main`, then deploys the result to GitHub Pages.
  A failing test blocks the deploy.

## How a step works

1. `Scheduler` calls `onStep` in `src/main.ts` slightly before the step is due to play. That lead is
   `LOOKAHEAD_SECONDS`.
2. `onStep` schedules the backing music and the metronome, calls `sequencer.step()`, and schedules
   each voice at the step's audio time. `sequencer.step()` returns only notes on steps inside the
   pattern length (and inside the loop when one is set), then moves the playhead to `stepAfter()`.
3. Notes wait in `queued`, and `frame()` flashes them on the board once audio time reaches them.

Pause stops the scheduler and keeps the step. Stop also rewinds. Notes already scheduled within
`LOOKAHEAD_SECONDS` still sound after a pause.

The sequencer always runs slightly ahead of what the player sees and hears, so read visuals against
audio time, not against the sequencer's current state.

## Audio chain

```text
instrument, music, and fx buses → master → trim → crusher → theme filter → FX low-pass → FX high-pass → limiter → soft clip → analyser → volume → output
```

The recording stream is tapped from the analyser. The FX delay and reverb sends are taken from the
instrument bus, which is still named `towerBus` in code.

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

With 32 steps, the board shows one page at a time. The page offset is `page * 16`: cells from the
other page are skipped, and the playhead only draws while it is on the shown page.

When the pointer is over a note, the renderer draws a red outline around that cell instead of the
sprite preview, to show that a click removes the note.

On phones held upright, the board's size is limited by the screen width, so it runs edge to edge.
On phones held sideways, the controls sit in a column beside the board, which gives it most of the
screen. `#rotate-hint` on the start screen points players to that layout. These layouts were
measured in headless Edge at phone sizes, not on a real phone. The info line under the board is one
fixed line and truncates when its text is too long.

## Audio load

Each sound costs audio CPU, and phones run out long before desktops. On one desktop core, a 75-note
board took about 70% before voice limits and 28% after, and Techno went from 102% to 42%.

- `pickVoices` caps each instrument per step with `VOICE_LIMITS`. Notes past the limit are skipped.
  `playNote` gets the number of voices played, not the number of notes, so a capped chord stays
  about as loud.
- Don't add automation to long-lived `AudioParam`s on every step. Those events add up over a run.
- The app uses `latencyHint: 'playback'`, because nothing depends on tapping in time. `frame()`
  subtracts the output latency, so the board matches what's heard.

## Saving and sharing

These values are saved to `localStorage` when they change, and come back on the next visit.

- `drumline-theme`: the theme id.
- `drumline-backing`: `1` or `0`.
- `drumline-volume`: the volume percent, from 0 to 100.
- `drumline-bpm`: the tempo.
- `drumline-fx`: the FX settings as JSON.
- `drumline-sample`: the chosen sample id.
- `drumline-pattern`: JSON `{ v: 1, length, cells }`.

Mute, the shown page, and whether the panels are open are not saved. Mute zeroes the master
gain, before the recording tap, so it also silences recordings.

Share links put the beat in the URL hash: `v1.<length>.<bpm>.<theme id>.<cells>` or
`v2.<length>.<bpm>.<theme id>.<sample id>.<cells>`. Each cell is two bytes, the step and then the
row and instrument index, in base64url: `row × 4 + index` in v1 and `row × 5 + index` in v2. v2
adds the chosen sample id; v1 links still load and use the default Clap sound. A link loads over
the autosave, is then autosaved, and is removed from the address bar. Invalid links are ignored.

Recording uses `MediaRecorder` on a stream from `Audio_.createRecordingStream()`. The format is the
first supported in `pickRecordingType`'s list. The Record button is disabled until audio starts, and
hidden where `MediaRecorder` is missing.

MIDI files are type 0, with 96 ticks per quarter and one step at 24 ticks. Drums and the sample are
on channel 10 (kick 36, snare 38, hat 42, and the chosen sample preset's note), and the synth uses
the theme's scale on channel 1. The track ends at the pattern length.

## Browser testing

- Audio won't start until a real click on **Start** or **Play**, because browsers require one.
- `window.__drumline` exposes `sequencer`, `scheduler`, and `audio` for debugging.
- `requestAnimationFrame` stops in a hidden tab, so the canvas stops updating. A hidden browser
  pane can also report a 0×0 viewport, which makes layout measurements meaningless. Set a real size
  first.
- With `npm run dev` running, `/tests/loudness.html` reports audio levels. Add `?theme=<id>` to
  check one theme.
- Navigating to the same URL with only a new `#hash` doesn't reload the page. Load `about:blank`
  first when testing share links.
- Downloads in headless Edge need `Page.setDownloadBehavior`.
