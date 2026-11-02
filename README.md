# Drumline Studio

A pixel-art drum machine and synth sequencer in your browser, forked from
[DrumlineTD](https://github.com/stansz/drumline).

## How to use

The grid is a 16-step pattern: each column is one step, and each cell holds at most one
note. Click or drag on the grid to paint the selected instrument. Rows are pitch: higher
rows tune a kick up, brighten a hat, and play higher notes on the synth. Click a note
again to remove it, or select **Erase** to clear notes.

Press **Play** to start the loop and **Stop** to end it. **Backing** turns the backing
music on or off; with it off, only your pattern plays, plus a metronome click while the
grid is empty. Set the tempo from 40 to 300 BPM by typing it into the **BPM** box or with
the **−** and **+** buttons (hold Shift to move by 10). **Mute** silences everything, and
**Clear** empties the pattern.
**Theme** switches between the Neon, Chiptune, Lo-fi, Techno, and Funk soundtracks at any
time; themes change the sound only, never the pattern or the tempo.

## Controls

- **1** Kick, **2** Hat, **3** Synth, **4** Erase
- **Space** play or stop
- **B** turn backing music on or off
- **C** clear the pattern
- **-** / **=** slower or faster by 1 BPM; with Shift, by 10
- **M** mute or unmute
- **T** change the music theme

On the start screen, **Enter** or **Space** starts, and **T** changes the theme. The
on-screen buttons provide the same actions, and the slider beside the theme button sets
the volume. Your theme, volume, tempo, and backing setting are remembered between visits.

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
