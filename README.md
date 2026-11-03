# Drumline Studio

A pixel-art drum machine and synth sequencer in your browser, forked from
[DrumlineTD](https://github.com/stansz/drumline).

https://stansz.github.io/drumline-studio/

## How to use

### Painting a pattern

The grid shows 16 steps at a time: each column is one step, and each cell holds at most one
note. The six instruments are Kick, Hat, Synth, Snare, Sample, and Bass. Click or drag on the grid
to paint the selected instrument. Rows are pitch: higher rows tune a kick up, brighten a hat,
tighten a snare, play higher notes on the synth, pitch the sample up, and play higher bass notes.
Clicking or dragging over a note removes it, and right-click also removes.

**Bass** plays the active synth scale two octaves lower, with the theme's own bass sound: the
bottom row is the lowest note, and each higher row plays higher. The active scale is the theme's
own, unless a preset has set one. It plays one note at a time, so a step with several Bass notes
keeps one. While the pattern holds any Bass notes, the backing's own bass line is muted so the two
bass lines don't clash.

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

### Beats

**Beats** in the tab row above the dock opens a row of preset beats, one tap each: Four on the Floor, Boom
Bap, Breakbeat, Trap, Dembow, Funk Groove, and Korobeiniki (Tetris tune). A preset sets the
pattern (drums, samples, synth, and bass), the pattern length, the tempo, the theme, and the
Backing mode; some also set a synth scale. Playback keeps going, and the new beat takes over on
the next step. Picking an instrument does not close Beats; opening FX, Share, or Mix, or pressing
Beats again, does.

**Random** replaces the pattern with a fresh 16-step groove: kick on the one, snare on 2 and 4,
a hat pattern, a bass line that follows the kick, and a few synth notes in key. The theme, tempo,
length, and scale stay as they are. **Undo** puts back the pattern and the settings changed by
the last preset or Random; there is one level of undo.

Korobeiniki is a 19th-century Russian folk song in the public domain. Its preset sets an A-minor
scale for the synth and the bass on top of the Chiptune theme; **Clear** resets the scale to the
theme's own.

### Length and pages

**Length** switches between 16 and 32 steps. With 32 steps, **Page** flips the board between
steps 1–16 and 17–32. Notes on steps 17–32 are kept but silent while the length is 16.

### Playing

Press **Play** to start the loop and **Pause** to hold it where it is; **Play** then carries on
from the same step. **Stop** halts and goes back to step 1, restarting the song from the top. Set
the tempo from 40 to 300 BPM by typing it into the **BPM** box or with the **−** and **+** buttons
(hold Shift to move by 10). **Backing** cycles through **Song**, **Loop**, and **Off** (key **B**), and the button shows the
current mode under a small **Backing** caption.
Song moves through verse, chorus, verse, chorus, and a break, with a short snare fill before each
change; the chorus uses a second chord progression. Loop plays the theme's steady verse loop. Off
plays only your pattern, plus a metronome click while the grid is empty. **Mute** silences
everything, and **Clear** empties the pattern. **Theme** switches between the Neon, Chiptune,
Lo-fi, Techno, and Funk soundtracks at any time; themes change the sound only, never the pattern
or the tempo.

### The Backing info screen

**ⓘ** in the tab row above the dock (key **I**) opens a panel about the theme's backing music. It shows
the theme's name and a one-line description, the current Backing mode (Song, Loop, or Off) and
what it means, a map of the five song sections, the verse and chorus chord names, whether the
feel is straight or swung, and the tempo. While the song plays, the section and bar being heard are
highlighted on the map. The panel closes with **✕**, **Esc**, **I**, or a click on the backdrop,
and playback keeps going while it is open.

### Mixer

The slot under the board shows the selected instrument's volume slider: Kick, Hat, Synth, Snare,
or Bass. Picking another instrument swaps which slider shows. Each slider also scales the reverb
that its part feeds, and the synth's delay, so turning a part down turns its tail down too, and
the levels are remembered between visits. Selecting Sample, or opening FX or Share, uses the same
slot. Sample's volume is in the sampler panel. The Backing volume sits under the main volume
slider in the header. On a phone held sideways, the per-instrument slider is hidden, but Backing
and the main volume are not. **Mix** in the tab row above the dock shows all seven volumes at once, each labeled in
its color: Kick, Hat, Synth, Snare, Sample, Bass, and Backing. Picking an instrument, or pressing
Mix again, goes back to the single slider. It also works on a phone held sideways. All sliders for
a part stay in sync.

### FX

**FX** (key **X**) opens a panel of four sliders that shape the whole mix live, on top of the
theme's own sound. Opening FX closes the other panels in the dock. **Filter** sweeps a low-pass
down to the left of center and a high-pass up to the right, with center off; **Delay** and
**Reverb** set how much of the instruments feeds the tempo-synced delay and the reverb; **Crush**
adds bit-crush on top of the theme's own. **Reset** sets them all back to off.

### Saving and sharing

The pattern, its length, and any preset scale are saved automatically and come back on your next
visit. **Share** (key **E**) opens a panel with three ways to keep a beat. Opening Share closes
the other dock panels. **Copy link** gives anyone who opens the link the same pattern, length,
tempo, theme, picked sample sound, per-note sample sounds, and preset scale. Links in the older
`v1`, `v2`, `v3`, and `v4` formats still open; they fall back to the default Clap sound where they
carry no per-note sound and to the theme's scale where they carry no scale. **Record**
(key **R**) records everything you hear, starting playback if needed; press it again to download
the audio file, in whatever format the browser records, usually WebM, or M4A on Safari.
Recordings are taken at full level, before the volume slider, so the slider does not change a
recording's loudness; **Mute** does silence the recording. **MIDI** downloads one pass of the
pattern as a `.mid` file: the drums use General MIDI notes (kick 36, snare 38, hat 42), each
sample note uses its own sound's drum note, and the synth and bass use the active scale (a preset
scale, or else the theme's).

### The dock

The tab row directly above the dock holds Mix, Beats, FX, Share, and ⓘ. The header holds the logo,
the Notes and Step readouts, Theme, and the Vol and Backing sliders. The transport holds Play, Stop,
BPM, Backing, Mute, Clear, and Length.

The mixer, sampler, FX, Share, and Beats panels share one slot under the board, and only one of
them shows at a time, so opening one never moves the board. On a phone held sideways, that slot
floats over the bottom of the board.

## Controls

- **1** Kick, **2** Hat, **3** Synth, **4** Snare, **5** Sample, **6** Bass
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
