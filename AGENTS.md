# AGENTS.md

Drumline Studio is a browser step sequencer where each column plays the pattern on its own
sixteenth note. It uses TypeScript, Vite, Canvas, and Web Audio, with no framework or runtime
dependencies.

Commands: `npm run dev`, `npm test`, `npm run test:sandbox`, `npm run typecheck`,
`npm run build`. Pushing to `main` deploys to GitHub Pages, and a failing test blocks the deploy.

## Read before changing

- Audio, step timing, or browser testing: [docs/references.md](docs/references.md)
- Themes or loudness: [docs/themes.md](docs/themes.md)

## Rules

- Keep `src/sequencer.ts` free of the DOM, audio, and randomness.
- Each note plays only on its own step, and only while that step is within the pattern
  length and the loop. A note recorded live skips its next pass because it already sounded.
- Keep `src/live.ts` free of the DOM and audio. Live play and the loop are hidden behind
  `LIVE_TOOLS` in `src/config.ts`; when turning them on, restore their README sections from
  git history.
- Keep `src/fx.ts` free of the DOM and audio. FX are applied on top of the theme and never change
  a theme's own values.
- Keep `src/pattern.ts`, `src/midi.ts`, and `src/recording.ts` free of the DOM, audio, and
  `localStorage`.
- Share links use the `v1.` format in `src/pattern.ts`. Add a new version instead of changing
  `v1`, so old links keep working.
- Themes change the sound only, never the pattern or the tempo.
- Wrap every `localStorage` call in `try`/`catch`, and make the game work without it.
- Keep Neon's `space.trim` at 1. It is the loudness reference.
- Draw the board in whole art pixels. In `src/render.ts`, don't use `arc`, `shadowBlur`,
  `globalAlpha`, `setLineDash`, `fillText`, or `ctx.scale`.
- Keep sprites as data in `src/sprites.ts`, and keep `src/pixel.ts` free of the DOM.
- Keep the `drumline-*` `localStorage` keys and `window.__drumline` names when the game's name
  changes, so saved settings survive.
- Vitest has no Web Audio or DOM, so unit test audio logic through exported pure functions. Check
  UI and audio changes in a browser.
- On Windows, `npm test` and `npm run build` fail with `spawn EPERM` inside the
  `dsh --profile headless` sandbox. Use `npm run test:sandbox` there, and still run `npm test`
  outside the sandbox before committing. Don't widen the sandbox, set `NODE_OPTIONS`, or stub
  modules.
- Update the matching doc in the same change: `README.md` for controls, modes, or commands, the
  docs above for their topics, and this file for rules.
