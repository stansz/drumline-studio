# Drumline Studio

A pixel-art drum machine and synth sequencer that runs in your browser. Paint a beat on the grid,
pick a backing band, and share it with a link. There's nothing to install and no account.

**[▶ Open Drumline Studio](https://stansz.github.io/drumline-studio/)**

![Drumline Studio playing a funk groove](docs/images/hero.png)

## Features

- **Six instruments:** Kick, Hat, Synth, Snare, Bass, and Sample, on a 16- or 32-step grid where
  each row is a pitch.
- **Backing music in five themes:** Neon, Chiptune, Lo-fi, Techno, and Funk, each with its own
  chords, bass, arpeggio, and drums. Play it as a full song, a loop, or not at all.
- **Presets and Random:** seven ready-made grooves, from Four on the Floor to the Tetris tune, plus
  a random groove maker with undo.
- **Sampler:** six built-in sounds, or record your own from the microphone or a file.
- **Mixer and FX:** a volume for every part, plus filter, delay, reverb, and bit-crush.
- **Share and export:** copy a link, record the audio, or download MIDI for your music app.
- **Works on phones:** turn the phone sideways for a bigger board.
- **Saves itself:** your beat and settings come back next visit.

<p>
  <img src="docs/images/phone.png" alt="Drumline Studio on a phone" width="220">
  <img src="docs/images/phone-sideways.png" alt="Drumline Studio on a phone held sideways" width="476">
</p>

## Quick start

1. [Open the app](https://stansz.github.io/drumline-studio/) and press **Start**.
2. Pick an instrument and click the grid to paint notes, or open **Beats** and pick a preset.
3. Press **Play** (or **Space**).

**[Read the full guide →](docs/guide.md)** It covers every panel, the keyboard shortcuts, and
phone tips.

## For developers

Drumline Studio is TypeScript, Vite, Canvas, and Web Audio, with no framework and no runtime
dependencies. It was forked from [DrumlineTD](https://github.com/stansz/drumline).

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck
npm run build      # type-checks, then writes the static site to dist/
npm run preview    # serves dist/ locally
```

`npm run test:sandbox` runs the same tests inside the Windows `dsh` sandbox, where `npm test` can't
start. Pushing to `main` deploys the site to GitHub Pages through the included workflow, and a
failing test blocks the deploy.

- [docs/references.md](docs/references.md): how the code fits together.
- [docs/themes.md](docs/themes.md): how themes and loudness work.
- [AGENTS.md](AGENTS.md): rules for changing the code.

Live play (the Paint/Live/Rec mode, keys A–K) and the step-light loop are built but turned off with
`LIVE_TOOLS` in `src/config.ts`.

## License

The code is under the [MIT License](LICENSE). The fonts keep their own license, below.

## Credits

The Silkscreen and VT323 fonts are used under the SIL Open Font License. Their licenses are in
`src/fonts/`. Korobeiniki is a 19th-century Russian folk song in the public domain.
