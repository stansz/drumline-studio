# Drumline Studio

A pixel-art drum machine and synth sequencer that runs in your browser. Paint a beat on the grid,
pick a backing band, and share it with a link. There's nothing to install and no account.

**[▶ Open Drumline Studio](https://stansz.github.io/drumline-studio/)**

![Drumline Studio playing a funk groove](docs/images/hero.png)

## Features

- **Six instruments:** Kick, Hat, Synth, Snare, Bass, and Sample, on a 16-, 32-, 48-, or 64-step grid
  where each row is a pitch.
- **Backing music in nine themes:** Neon, Chiptune, Lo-fi, Techno, Funk, Hip-hop, House,
  Synthwave, and Clean, each with its own chords, bass, arpeggio, and drums. Play it as a full
  song, a loop, or not at all.
- **Grooves and tunes:** ten ready-made grooves, ten public-domain tunes, and nine Christmas carols,
  plus a random groove maker with undo.
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
2. Pick an instrument and click the grid to paint notes, or open **Menu** and pick a preset.
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

## Built with AI

Drumline Studio is a vibe-coded project. The ideas, design calls, and playtesting are human; most
of the code was written by AI coding tools:

- [Claude Code](https://claude.com/claude-code) planned the features, wrote specs, reviewed and
  tested every change in a headless browser, and wrote the docs.
- [DeepSeek](https://www.deepseek.com/), run through the `dsh` command-line agent, wrote much of
  the code from those specs.

Every change still goes through the unit tests and a browser check before it ships.

## License

The code is under the [MIT License](LICENSE). The fonts keep their own license, below.

## Credits

The Silkscreen and VT323 fonts are used under the SIL Open Font License. Their licenses are in
`src/fonts/`. Korobeiniki (1861), In the Hall of the Mountain King (Grieg, 1875), Ode to Joy
(Beethoven, 1824), Für Elise (Beethoven, 1810), the Can-Can (Offenbach, 1858), Canon in D
(Pachelbel, around 1680), Swan Lake (Tchaikovsky, 1876), Eine kleine Nachtmusik (Mozart, 1787),
When the Saints Go Marching In (traditional), and Ride of the Valkyries (Wagner, 1870) are in the
public domain. Jingle Bells (Pierpont, 1857), Joy to the World (Mason, 1839), Deck the Halls, God
Rest Ye Merry Gentlemen, Hark! The Herald Angels Sing (Mendelssohn, 1840), Good King Wenceslas
(traditional melody, words 1853), We Wish You a Merry Christmas and O Christmas Tree (traditional),
and Silent Night (Gruber, 1818) are public-domain carols.
