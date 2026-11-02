# Drumline Studio

A pixel-art drum machine and synth sequencer in your browser, forked from
[DrumlineTD](https://github.com/stansz/drumline).

## How to use

The grid shows 16 steps at a time: each column is one step, and each cell holds at most one
note. Click or drag on the grid to paint the selected instrument. Rows are pitch: higher
rows tune a kick up, brighten a hat, tighten a snare, and play higher notes on the synth.
Clicking or dragging over a note removes it, and right-click also removes.

The **Paint / Live / Rec** button (key **V**) cycles the mode. The keys **A S D F G H J K**
always play the selected instrument instantly, from the bottom row (**A**) to the top row
(**K**). In **Live** and **Rec**, tapping the board plays the selected instrument at the
tapped row instead of painting. In **Rec**, while the pattern is playing, every live hit is
also added to the pattern at the nearest step.

Drag across the step lights above the board to loop a section, and tap the lights to clear
the loop. The loop repeats the chosen range of steps while the pattern plays.

**Length** switches between 16 and 32 steps. With 32 steps, **Page** flips the board between
steps 1–16 and 17–32. Notes on steps 17–32 are kept but silent while the length is 16.

Press **Play** to start the loop and **Stop** to end it. **Backing** turns the backing
music on or off; with it off, only your pattern plays, plus a metronome click while the
grid is empty. Set the tempo from 40 to 300 BPM by typing it into the **BPM** box or with
the **−** and **+** buttons (hold Shift to move by 10). **Mute** silences everything, and
**Clear** empties the pattern.
**Theme** switches between the Neon, Chiptune, Lo-fi, Techno, and Funk soundtracks at any
time; themes change the sound only, never the pattern or the tempo.
**FX** (key **X**) opens a panel of four sliders that shape the whole mix live, on top of the
theme's own sound. **Filter** sweeps a low-pass down to the left of center and a high-pass up
to the right, with center off; **Delay** and **Reverb** set how much of the instruments feeds
the tempo-synced delay and the reverb; **Crush** adds bit-crush on top of the theme's own.
**Reset** sets them all back to off.

## Controls

- **1** Kick, **2** Hat, **3** Synth, **4** Snare
- **Space** play or stop
- **B** turn backing music on or off
- **C** clear the pattern
- **L** switch the pattern length between 16 and 32 steps
- **P** flip between the two pages while the length is 32
- **-** / **=** slower or faster by 1 BPM; with Shift, by 10
- **M** mute or unmute
- **T** change the music theme
- **X** show or hide the FX panel
- **V** cycle the Paint, Live, and Rec modes
- **A S D F G H J K** play the selected instrument live, bottom row to top row

On the start screen, **Enter** or **Space** starts, and **T** changes the theme. The
on-screen buttons provide the same actions, and the slider beside the theme button sets
the volume. Your theme, volume, tempo, backing setting, and FX are remembered between visits.

On a phone, tap instead of clicking, and turn the phone sideways for a bigger board.

## Commands

```sh
npm install
npm run dev
npm test
npm run test:sandbox
npm run typecheck
npm run build
```

`npm run test:sandbox` runs the same tests inside the Windows `dsh` sandbox, where `npm test` can't
start. `npm run build` type-checks the project and writes a static site to `dist/`.
Pushing to `main` deploys that site to GitHub Pages through the included workflow.
[docs/references.md](docs/references.md) describes how the code fits together.

## Credits

The Silkscreen and VT323 fonts are used under the SIL Open Font License. Their licenses are in `src/fonts/`.
