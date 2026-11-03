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

Select **Sample** to show the sampler panel with six built-in sounds: Clap, Cowbell, Rimshot, Tom,
Shaker, and Zap, each with its own color. The sampler takes the slot under the board while Sample
is selected; picking any other instrument brings the mixer back. Clicking a sound picks it for the
Sample instrument and plays it once. Rows set its pitch: the bottom row plays the sound as
recorded, and each higher row plays it higher, up to an octave at the top row. The chosen sound is
remembered, and it is the sound new Sample notes are painted with.

Each Sample note keeps the sound it was painted with, so picking a new sound only changes the
notes you paint next. Each note plays and shows its own sound's color, and its sound travels in
share links and MIDI export. Picking a sound changes the Sample pad's icon and light, which show
what will be painted.

**Mic** records up to 2 seconds from the microphone; press it again to stop early. The browser
asks for microphone permission the first time. **File** loads a short sound file instead. Either
way, silence at the start and end is trimmed and the level is evened out. The result appears as
**Mine**, plays like the built-in sounds, is saved on this device, and comes back next visit.
Mine is a single slot: recording a new one replaces it and changes every Mine note. Share links
can't carry it: people who open the link hear Clap instead.

### Length and pages

**Length** switches between 16 and 32 steps. With 32 steps, **Page** flips the board between
steps 1–16 and 17–32. Notes on steps 17–32 are kept but silent while the length is 16.

### Playing

Press **Play** to start the loop and **Pause** to hold it where it is; **Play** then carries on
from the same step. **Stop** halts and goes back to step 1, restarting the song from the top. Set
the tempo from 40 to 300 BPM by typing it into the **BPM** box or with the **−** and **+** buttons
(hold Shift to move by 10). **Backing** cycles through **Song**, **Loop**, and **Off** (key **B**).
Song moves through verse, chorus, verse, chorus, and a break, with a short snare fill before each
change; the chorus uses a second chord progression. Loop plays the theme's steady verse loop. Off
plays only your pattern, plus a metronome click while the grid is empty. **Mute** silences
everything, and **Clear** empties the pattern. **Theme** switches between the Neon, Chiptune,
Lo-fi, Techno, and Funk soundtracks at any time; themes change the sound only, never the pattern
or the tempo.

### The Backing info screen

**ⓘ** next to the theme button (key **I**) opens a panel about the theme's backing music. It shows
the theme's name and a one-line description, the current Backing mode (Song, Loop, or Off) and
what it means, a map of the five song sections, the verse and chorus chord names, whether the
feel is straight or swung, and the tempo. While the song plays, the section and bar being heard are
highlighted on the map. The panel closes with **✕**, **Esc**, **I**, or a click on the backdrop,
and playback keeps going while it is open.

### Mixer

The slot under the board shows the selected instrument's volume slider: Kick, Hat, Synth, or
Snare. Picking another instrument swaps which slider shows. Each slider also scales the reverb
that its part feeds, and the synth's delay, so turning a part down turns its tail down too, and
the levels are remembered between visits. Selecting Sample, or opening FX or Share, uses the same
slot. Sample's volume is in the sampler panel. The Backing volume sits under the main volume
slider in the header. On a phone held sideways, the per-instrument slider is hidden, but Backing
and the main volume are not. **Mix** in the header shows all six volumes at once, each labeled in
its color: Kick, Hat, Synth, Snare, Sample, and Backing. Picking an instrument, or pressing Mix
again, goes back to the single slider. It also works on a phone held sideways. All sliders for a
part stay in sync.

### FX

**FX** (key **X**) opens a panel of four sliders that shape the whole mix live, on top of the
theme's own sound. Opening FX closes the other panels in the dock. **Filter** sweeps a low-pass
down to the left of center and a high-pass up to the right, with center off; **Delay** and
**Reverb** set how much of the instruments feeds the tempo-synced delay and the reverb; **Crush**
adds bit-crush on top of the theme's own. **Reset** sets them all back to off.

### Saving and sharing

The pattern and its length are saved automatically and come back on your next visit. **Share**
(key **E**) opens a panel with three ways to keep a beat. Opening Share closes the other dock
panels. **Copy link** gives anyone who opens the link the same pattern, length, tempo, theme,
picked sample sound, and per-note sample sounds. Links in the older `v1` and `v2` formats still
open; they fall back to the default Clap sound where they carry no per-note sound. **Record**
(key **R**) records everything you hear, starting playback if needed; press it again to download
the audio file, in whatever format the browser records, usually WebM, or M4A on Safari.
Recordings are taken at full level, before the volume slider, so the slider does not change a
recording's loudness; **Mute** does silence the recording. **MIDI** downloads one pass of the
pattern as a `.mid` file: the drums use General MIDI notes (kick 36, snare 38, hat 42), each
sample note uses its own sound's drum note, and the synth plays the theme's scale.

### The dock

The mixer, sampler, FX, and Share panels share one slot under the board, and only one of them
shows at a time, so opening one never moves the board. On a phone held sideways, that slot floats
over the bottom of the board.

## Controls

- **1** Kick, **2** Hat, **3** Synth, **4** Snare, **5** Sample
- **Space** play or pause
- **Esc** stop and go back to step 1
- **I** show or hide the backing info screen
- **B** cycle backing music between Song, Loop, and Off
- **C** clear the pattern
- **L** switch the pattern length between 16 and 32 steps
- **P** flip between the two pages while the length is 32
- **-** / **=** slower or faster by 1 BPM; with Shift, by 10
- **M** mute or unmute
- **T** change the music theme
- **X** show or hide the FX panel
- **E** show or hide the Share panel
- **R** start or stop recording audio

While the backing info screen is open, **Esc** or **I** closes it, and every other key is ignored.
On the start screen, **Enter** or **Space** starts, and **T** changes the theme. The on-screen
buttons provide the same actions, and the sliders beside the theme button set the volume and the
Backing level. Your theme, volume, tempo, backing setting, FX, mixer levels, and picked sample are
remembered between visits.

On a phone, tap instead of clicking, and turn the phone sideways for a bigger board.

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
