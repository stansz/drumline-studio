# Drumline Studio

A pixel-art drum machine and synth sequencer in your browser, forked from
[DrumlineTD](https://github.com/stansz/drumline).

https://stansz.github.io/drumline-studio/

## How to use

### Painting a pattern

The grid shows 16 steps at a time: each column is one step, and each cell holds at most one
note. The five instruments are Kick, Hat, Synth, Snare, and Sample. Click or drag on the grid to
paint the selected instrument. Rows are pitch: higher rows tune a kick up, brighten a hat, tighten
a snare, play higher notes on the synth, and pitch the sample up. Clicking or dragging over a note
removes it, and right-click also removes.

### Sampler

Select **Sample** to open the sampler panel with six built-in sounds: Clap, Cowbell, Rimshot, Tom,
Shaker, and Zap. Clicking a sound picks it for the Sample instrument and plays it once. Rows set
its pitch: the bottom row plays the sound as recorded, and each higher row plays it higher, up to
an octave at the top row. The chosen sound is remembered, and it travels in share links and MIDI
export.

### Length and pages

**Length** switches between 16 and 32 steps. With 32 steps, **Page** flips the board between
steps 1–16 and 17–32. Notes on steps 17–32 are kept but silent while the length is 16.

### Playing

Press **Play** to start the loop and **Pause** to hold it where it is; **Play** then carries on
from the same step. **Stop** halts and goes back to step 1. Set the tempo from 40 to 300 BPM by
typing it into the **BPM** box or with the **−** and **+** buttons (hold Shift to move by 10).
**Backing** turns the backing music on or off; with it off, only your pattern plays, plus a
metronome click while the grid is empty. **Mute** silences everything, and **Clear** empties
the pattern. **Theme** switches between the Neon, Chiptune, Lo-fi, Techno, and Funk soundtracks
at any time; themes change the sound only, never the pattern or the tempo.

### FX

**FX** (key **X**) opens a panel of four sliders that shape the whole mix live, on top of the
theme's own sound. **Filter** sweeps a low-pass down to the left of center and a high-pass up
to the right, with center off; **Delay** and **Reverb** set how much of the instruments feeds
the tempo-synced delay and the reverb; **Crush** adds bit-crush on top of the theme's own.
**Reset** sets them all back to off.

### Saving and sharing

The pattern and its length are saved automatically and come back on your next visit. **Share**
(key **E**) opens a panel with three ways to keep a beat. **Copy link** gives anyone who opens
the link the same pattern, length, tempo, theme, and sample sound. Links in the older `v1`
format still open, with the default Clap sample. **Record** (key **R**) records everything
you hear, starting playback if needed; press it again to download the audio file, in whatever
format the browser records, usually WebM, or M4A on Safari. Recordings are taken at full level,
before the volume slider, so the slider does not change a recording's loudness; **Mute** does
silence the recording. **MIDI**
downloads one pass of the pattern as a `.mid` file: the drums use General MIDI notes (kick 36,
snare 38, hat 42), and the synth plays the theme's scale.

## Controls

- **1** Kick, **2** Hat, **3** Synth, **4** Snare, **5** Sample
- **Space** play or pause
- **Esc** stop and go back to step 1
- **B** turn backing music on or off
- **C** clear the pattern
- **L** switch the pattern length between 16 and 32 steps
- **P** flip between the two pages while the length is 32
- **-** / **=** slower or faster by 1 BPM; with Shift, by 10
- **M** mute or unmute
- **T** change the music theme
- **X** show or hide the FX panel
- **E** show or hide the Share panel
- **R** start or stop recording audio

On the start screen, **Enter** or **Space** starts, and **T** changes the theme. The
on-screen buttons provide the same actions, and the slider beside the theme button sets
the volume. Your theme, volume, tempo, backing setting, and FX are remembered between visits.

On a phone, tap instead of clicking, and turn the phone sideways for a bigger board. Held
sideways, the FX and Share panels open over the bottom of the board; press the button again to
close them.

## Commands

```sh
npm install
npm run dev
npm test
npm run test:sandbox
npm run typecheck
npm run build
npm run preview
```

`npm run test:sandbox` runs the same tests inside the Windows `dsh` sandbox, where `npm test` can't
start. `npm run build` type-checks the project and writes a static site to `dist/`, which
`npm run preview` serves locally.
Pushing to `main` deploys that site to GitHub Pages through the included workflow.
[docs/references.md](docs/references.md) describes how the code fits together.

## Hidden features

Live play (the Paint/Live/Rec mode, keys A–K) and the step-light loop are built but turned off
with `LIVE_TOOLS` in `src/config.ts`.

## Credits

The Silkscreen and VT323 fonts are used under the SIL Open Font License. Their licenses are in `src/fonts/`.
