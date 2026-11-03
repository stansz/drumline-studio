# AGENTS.md

Drumline Studio is a browser step sequencer with a 16- or 32-step pattern; each step is one
sixteenth note. It uses TypeScript, Vite, Canvas, and Web Audio, with no framework or runtime
dependencies.

Commands: `npm run dev`, `npm test`, `npm run test:sandbox`, `npm run typecheck`,
`npm run build`. Pushing to `main` deploys to GitHub Pages, and a failing test blocks the deploy.
`CLAUDE.md` only imports this file.

## Read before changing

- Audio, step timing, or browser testing: [docs/references.md](docs/references.md)
- Saving, share links, recording, or MIDI: the "Saving and sharing" section of
  [docs/references.md](docs/references.md)
- Themes or loudness: [docs/themes.md](docs/themes.md)

## Rules

- Keep `src/sequencer.ts`, `src/live.ts`, `src/fx.ts`, `src/pattern.ts`, `src/midi.ts`, and
  `src/recording.ts` free of the DOM, audio, and `localStorage`. `src/sequencer.ts` also stays
  free of randomness.
- Each note plays only on its own step, and only while that step is within the pattern
  length and the loop. A note recorded live skips its next pass because it already sounded.
- Live play and the loop are hidden behind `LIVE_TOOLS` in `src/config.ts`; when turning them
  on, restore their README sections from git history.
- FX are applied on top of the theme and never change a theme's own values.
- Share links use the `v1.` format in `src/pattern.ts`. Add a new version instead of changing
  `v1`, so old links keep working.
- Themes change the sound only, never the pattern or the tempo.
- Wrap every `localStorage` call in `try`/`catch`, and make the app work without it.
- Keep Neon's `space.trim` at 1. It is the loudness reference.
- Draw the board in whole art pixels. In `src/render.ts`, don't use `arc`, `shadowBlur`,
  `globalAlpha`, `setLineDash`, `fillText`, or `ctx.scale`.
- Keep sprites as data in `src/sprites.ts`, and keep `src/pixel.ts` free of the DOM.
- Keep the `drumline-*` `localStorage` keys and `window.__drumline` names if the app is
  renamed, so saved settings survive.
- Vitest has no Web Audio or DOM, so unit test audio logic through exported pure functions. Check
  UI and audio changes in a browser.
- On Windows, `npm test` and `npm run build` fail with `spawn EPERM` inside the
  `dsh --profile headless` sandbox. Use `npm run test:sandbox` there, and still run `npm test`
  outside the sandbox before committing. Don't widen the sandbox, set `NODE_OPTIONS`, or stub
  modules.
- Docs describe only what the code does now. When a change makes a doc statement false, fix the
  doc in the same change.
- Update the matching doc in the same change: `README.md` for controls, modes, or commands, the
  docs above for their topics, and this file for rules.
