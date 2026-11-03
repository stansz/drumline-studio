# Code reference

How Drumline Studio's code fits together. [AGENTS.md](../AGENTS.md) holds the rules.

## Files

`src/`:

- `src/config.ts`: tunable values, including `MAX_STEPS`, `STEPS_PER_BAR`, `MIX`, `LIVE_TOOLS`,
  `VOICE_LIMITS`, `INSTRUMENT_INFO`, the chord progressions, and `parseBpm`.
- `src/sequencer.ts`: the pattern. `step()` returns the notes on the current step and moves on to
  `stepAfter()`.
- `src/scheduler.ts`: step clock that runs on `AudioContext` time, slightly ahead of playback.
- `src/audio.ts`: `Audio_`, which owns the audio chain and every generated sound.
- `src/samples.ts`: the built-in sample presets, the user sample entry, and the row-to-pitch rate.
- `src/sampleEdit.ts`: mixes, trims, fades, and normalizes a recorded or loaded sample.
- `src/sampleStore.ts`: saves the user sample in IndexedDB.
- `src/sampler.ts`: renders each sample preset into an `AudioBuffer` with an
  `OfflineAudioContext`.
- `src/fx.ts`: FX settings, parsing, and filter cutoffs.
- `src/mix.ts`: mixer channels, saving, parsing, and the slider-to-gain curve.
- `src/live.ts`: live-play modes, key rows, and nearest-step quantizing; hidden by `LIVE_TOOLS`.
- `src/music.ts`: chords, arpeggios, and how the backing music builds up.
- `src/song.ts`: the song form's sections, the section a step falls in, how each section changes
  the backing layers, and the pure helpers the backing info screen uses (`songMap`,
  `sectionIndexAt`, `describeSwing`, `SECTION_NAMES`).
- `src/themes.ts`: one entry for each music theme.
- `src/presets.ts`: the named synth scales and the beat presets (`PRESETS`, `presetById`).
- `src/random.ts`: the seeded `Rng` and `randomPattern`, which builds a random 16-step groove.
- `src/pattern.ts`: autosave JSON and the `v1.`/`v2.`/`v3.`/`v4.`/`v5.` share-link formats.
- `src/midi.ts`: MIDI file writer.
- `src/recording.ts`: recording type, file names, and timer text.
- `src/render.ts`: draws the board into a 256×128 buffer, then scales it onto the canvas.
- `src/sprites.ts`: colors, sprites, and bitmap letters, stored as data.
- `src/pixel.ts`: pixel line, circle, and dither helpers with no DOM.
- `src/style.css`: the page layout and the look of the controls, panels, and info screen.
- `src/fonts/`: self-hosted Silkscreen and VT323 fonts and their licenses.
- `src/main.ts`: connects everything, and handles input, the HUD, the dock, the info screen, and
  saved settings.

`tests/`:

- `tests/audio.test.ts`: the soft-clip and crush curves, volume gain, and volume parsing.
- `tests/fx.test.ts`: FX parsing, the filter cutoffs, and the crush mix.
- `tests/live.test.ts`: live modes, live key rows, and nearest-step quantizing.
- `tests/loudness-baseline.ts`: Neon's target average levels for the browser loudness check.
- `tests/loudness.html`: the browser page that runs the loudness check.
- `tests/loudness.ts`: browser-only audio check, rendering boards and backing music faster than
  real time.
- `tests/midi.test.ts`: the MIDI header, tempo, notes, sample notes, and track length.
- `tests/mix.test.ts`: mixer channel order, parsing, and the gain curve.
- `tests/music.test.ts`: MIDI-to-Hz, chords, intensity, layer levels, and arpeggio notes.
- `tests/pattern.test.ts`: autosave round trips and every share-link version.
- `tests/pixel.test.ts`: dithering, line and circle points, and bitmap text.
- `tests/presets.test.ts`: preset ids, themes, tempos, grid and sample checks, and the scales.
- `tests/random.test.ts`: seeded repeatability and the random groove's rules.
- `tests/recording.test.ts`: recording type choice, file extensions, file names, and timers.
- `tests/sampleEdit.test.ts`: the sample mixing, trimming, fading, and normalizing helpers.
- `tests/samples.test.ts`: preset ids and colors, lookup fallbacks, and the row-to-pitch rate.
- `tests/scheduler.test.ts`: the step clock, stalls, and lookahead.
- `tests/sequencer.test.ts`: pattern editing, length, loops, live skips, and per-note samples.
- `tests/song.test.ts`: the song form, sections, fills, section levels, song map, section index,
  and swing text.
- `tests/sprites.test.ts`: sprite rectangles, colors, sizes, and the glyph coverage.
- `tests/tempo.test.ts`: tempo parsing and clamping.
- `tests/themes.test.ts`: each theme's chords, scales, recipes, levels, swing, blurbs, and order.
- `tests/voices.test.ts`: the per-instrument voice limits and chord spreading.

Elsewhere:

- `index.html`: the page markup, the HUD, the tab row, the dock, and the backing info dialog.
- `package.json`: the scripts and the Vite, Vitest, and TypeScript versions.
- `vite.config.ts`: Vite config; `base: './'` keeps the build working from any path.
- `tsconfig.json`: strict TypeScript for `src` and `tests`.
- `vitest.sandbox.config.mjs`: runs the tests inside the Windows `dsh` sandbox, through
  `npm run test:sandbox`.
- `public/`: static files served as-is, such as `favicon.svg`.
- `.handoff/`: `plan.md` is tracked and holds the most recent spec; earlier specs are in git
  history. `report.md` and `last-run.log` are ignored.
- `.github/workflows/deploy.yml`: tests and builds `main`, then deploys the result to GitHub Pages.
  A failing test blocks the deploy.

## How a step works

1. `Scheduler` calls `onStep` in `src/main.ts` slightly before the step is due to play. That lead is
   `LOOKAHEAD_SECONDS`.
2. `onStep` schedules the backing music and the metronome, calls `sequencer.step()`, and schedules
   each voice at the step's audio time. It passes `musicStep` and the current section to
   `playMusicStep`, so the backing follows the song form in `src/song.ts` when sections are on, or
   the steady verse loop when they are off. `sequencer.step()` returns only notes on steps inside
   the pattern length (and inside the loop when one is set), then moves the playhead to
   `stepAfter()`. Each note carries its own `sample` id on Sample cells, so it plays the sound it
   was painted with.
3. Notes wait in `queued`, and `frame()` flashes them on the board once audio time reaches them.
   `onStep` also pushes `{ at, step, musicStep }` onto `stepMarks`; `frame()` consumes the marks
   against the audio time being heard, which moves the playhead and, while the info screen is
   open, the highlighted section.

Pause stops the scheduler and keeps the step. Stop also rewinds and resets `musicStep`. Notes
already scheduled within `LOOKAHEAD_SECONDS` still sound after a pause.

**Start** and the start screen's **Enter**/**Space** only call `startAudio()`, which opens the audio
clock and hides the overlay; they do not start the scheduler, so playback waits for **Play**. The
Play button shows **Play** until then; pressing it starts the audio first if it is not on yet.

The sequencer always runs slightly ahead of what the player sees and hears, so read visuals against
audio time, not against the sequencer's current state.

## Audio chain

```text
instrument level gains → towerBus (instrument bus) → master
instrument level gains → towerBus → towerReverbSend → reverb → fxBus → master
synth → instrumentDelaySends.synth → delaySend → delay → fxBus → master
towerBus → fxDelaySend → delay → delayFeedback → delay
towerBus → fxReverbSend → reverb
musicBus → musicTrim → backingLevel → master
backingLevel → musicReverbSend → reverb
stab / arp → backingDelaySend → delaySend → delay
crackleGain → master
master → trim → crusher (dry/wet crossfade) → theme filter (toneHz) → FX low-pass → FX high-pass
       → limiter → soft clip → analyser → volume → output
analyser → recording stream
```

- Each instrument's level gain feeds `towerBus`; the mixer scales those gains and the backing
  level. The delay send is per instrument (`instrumentDelaySends`), and only the synth connects to
  it, so the mixer covers every voice.
- The playable Bass uses the theme's backing-bass wave, decay, and filter, with `MIX.bassNote`
  scaled by the theme's bass level, and connects to `instrumentLevels.bass`. When the pattern holds
  a Bass note, `onStep` passes `{ backingBass: false }` to `playMusicStep`, which skips the backing
  bass part so the two bass lines don't clash.
- `Audio_.setScale` sets a `scaleOverride`, and `playSynth` and `playBassNote` read
  `scaleOverride ?? theme.synth.scale`. A preset scale (such as A minor) therefore replaces the
  theme's synth scale for both the synth and the playable Bass; `setScale(null)` goes back to the
  theme's own scale.
- `musicTrim` is set to `musicTrim / trim`, because the master `trim` scales the backing too. The
  backing therefore ends up at `space.musicTrim` whatever the instruments' trim is.
- The FX panel's sends are taken from `towerBus`, so they shape the instruments and not the backing
  music, which has its own reverb and delay sends driven by the theme.
- A kick ducks `musicBus` by `MIX.duckAmount` for `MIX.duckRelease` seconds.
- A `WaveShaper` curve can only be set once, so themes crossfade the crusher in and out instead of
  replacing its curve.
- The limiter lets through only about 0.4 dB for each 1 dB of `space.trim`, so loudness has to be
  measured, not worked out. [themes.md](themes.md) has the steps.
- The player's volume slider sits after the analyser and the limiter, so it never changes the mix.
  It only turns the sound down from full level, and the loudness page renders at full level.
- Mute zeroes the master gain before the analyser, so it silences recordings as well as output.
- Changing Neon or the shared chain means refreshing `tests/loudness-baseline.ts`.

## Visuals

`Renderer` draws into a 256×128 buffer, one 16px tile per board cell. `present()` scales that up by a
whole number to at least the canvas's displayed size, then CSS scales it to fit. This keeps every art
pixel the same size at any width, which `image-rendering: pixelated` can't promise at fractional
scales.

The step strip above the board is DOM. `main.ts` lights the playhead's step, and outlines the step
of the hovered cell.

With 32 steps, the board shows one page at a time. The page offset is `page * 16`: cells from the
other page are skipped, and the playhead only draws while it is on the shown page. Follow, when on,
flips the shown page to the playhead's page in `frame()`; flipping the page by hand turns it off.

When the pointer is over a note, the renderer draws a red outline around that cell instead of the
sprite preview, to show that a click removes the note.

Sample notes use the color of their own sound: `SamplePreset.color` keys into `PIXEL_COLORS`, and
the renderer bakes one Sample sprite variant per color for the board, the preview, and the pad
icon.

On phones held upright, the board's size is limited by the screen width, so it runs edge to edge.
On phones held sideways, the controls sit in a column beside the board, which gives it most of the
screen. `#rotate-hint` on the start screen points players to that layout. These layouts were
measured in headless Edge at phone sizes, not on a real phone.

The tab row directly above the dock holds the Mix, Beats, FX, Backing, and ⓘ buttons. The header
holds the logo, the Notes and Step readouts, the Share button, the Vol slider, and the Length and
Follow buttons; the transport holds Play, Stop, BPM, Theme, Mute, and Clear.

The mixer, sampler, FX, Share, and Beats panels share one dock slot under the board and show one
view at a time. `updateDock()` in `main.ts` picks the view: an open panel (FX, Share, Beats, or the
`mixall` view of all seven volume sliders), else the sampler while Sample is selected, else the
mixer. The mixer shows one slider, for the selected instrument, and `updateMixView()` swaps which
one is visible. Sample's volume slider lives in the sampler panel, and the Backing volume slider is
in the `mixall` view of the dock.
The dock's height comes from the `--dock-h` custom property, so swapping views never moves the
board or the controls.

The backing info screen is a separate fixed overlay, `#backing-info`, outside the dock. `ⓘ` in the
tab row above the dock (key **I**) opens it; `main.ts` builds the song map once from `songMap()` at startup, and
`renderInfo()` fills the title, blurb, backing mode, chord names, feel, and tempo. While it is
open, each `frame()` compares the heard `musicStep` against the last rendered section index and bar
and only then touches the DOM: the map's `current` class and the `Now:` line follow the song, and
the map dims with a short message when the backing is a loop or off. Opening moves focus to the
close button, closing returns it to `ⓘ`, and the keyboard closes the screen on **Esc** or **I**
while ignoring other keys.

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
- `drumline-sections`: `1` when the backing plays the song's sections, `0` when it plays the steady
  loop. Only used while the backing is on.
- `drumline-volume`: the volume percent, from 0 to 100.
- `drumline-bpm`: the tempo.
- `drumline-fx`: the FX settings as JSON.
- `drumline-mix`: the mixer levels as JSON, including `bass`.
- `drumline-sample`: the chosen sample id.
- `drumline-follow`: `1` while the board follows the playhead across pages, `0` when it does not.
  Absent means `1`.
- `drumline-pattern`: JSON `{ v: 1, length, cells }`, where each cell is
  `[instrument, col, row]` plus an optional fourth element, the `sample` id, on sample cells. An
  optional top-level `scale` holds a preset scale id; it is read only when it matches
  `/^[a-z0-9-]{1,24}$/`, and unknown ids fall back to the theme's scale.

The Beats panel keeps one level of undo. A preset or Random first copies the cells, length, tempo,
theme, backing and sections, and scale into a snapshot; Undo restores that snapshot through
`loadCells`, `setLength`, `setBpm`, `applyTheme`, and `setScale`, then saves it.

Mute, the shown page, whether the panels are open, and whether the info screen is open are not
saved. Mute zeroes the master gain, before the recording tap, so it also silences recordings.

The recorded or loaded user sample lives in IndexedDB: database `drumline`, store `samples`, key
`mine`, holding `{ sampleRate, data: Float32Array }`. It is not in a share link, and a share link
never selects `mine`: decoding falls back to the default Clap sound.

Share links put the beat in the URL hash: `v1.<length>.<bpm>.<theme id>.<cells>`,
`v2.<length>.<bpm>.<theme id>.<sample id>.<cells>`,
`v3.<length>.<bpm>.<theme id>.<picked sample id>.<sample table>.<cells>`,
`v4.<length>.<bpm>.<theme id>.<picked sample id>.<sample table>.<cells>`, or
`v5.<length>.<bpm>.<theme id>.<picked sample id>.<scale id>.<sample table>.<cells>`. In v1 and v2
each cell is two bytes, the step and then the row and instrument index, in base64url:
`row × 4 + index` in v1 and `row × 5 + index` in v2. v2 adds the chosen sample id and gives every
sample cell that sound. v3 adds a sample table: the distinct sample ids used by the pattern's sample
cells, in first-use order, joined with `_`. Each v3 cell is three bytes: the step,
`row × 5 + index`, and the sample-table index (0 for non-sample cells and for sample cells with no
`sample`). v4 is the same as v3, except there are six instruments, so the second byte is
`row × 6 + index`. v5 is the same as v4, plus a scale id after the picked sample id: empty for the
theme's own scale, or a known id from `SCALES`. Old links still load: v1 and v2 links still load,
v1 uses the default Clap sound, v3 keeps its five-instrument encoding, and v4 has no scale so it
falls back to the theme's. A link loads over the autosave, is then autosaved, and is removed from
the address bar. Invalid links are ignored.

Recording uses `MediaRecorder` on a stream from `Audio_.createRecordingStream()`. The format is the
first supported in `pickRecordingType`'s list. The Record button is disabled until audio starts, and
hidden where `MediaRecorder` is missing.

MIDI files are type 0, with 96 ticks per quarter and one step at 24 ticks. Drums and the sample are
on channel 10 (kick 36, snare 38, hat 42, and each sample cell's own preset note), the synth uses
the active scale on channel 1, and Bass uses the active scale two octaves down on channel 2. The
track ends at the pattern length.

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
- Press **I** during playback to check that the info screen's highlighted section and bar advance,
  and check that **Esc**, **I**, **✕**, and a backdrop click each close it.
