# Plan: Bring all docs up to date

## Goal

Rewrite the project docs so every statement matches the current code in
`C:\Users\sz\Documents\Code\drumline-studio`. The docs still carry tower-defense wording and
miss the features added since the fork. This is a docs-only change: no source or test file
changes.

## Files to touch

- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `docs/themes.md`
- `.handoff/report.md`

## Steps

Before writing, read these source files so every claim can be checked against them:
`src/config.ts`, `src/sequencer.ts`, `src/scheduler.ts`, `src/audio.ts`, `src/fx.ts`,
`src/live.ts`, `src/pattern.ts`, `src/midi.ts`, `src/recording.ts`, `src/main.ts`,
`src/render.ts`, `index.html`, `package.json`, and `.github/workflows/deploy.yml`.

Writing style for all four files:
- Plain, direct English with short sentences.
- No marketing words.
- Present tense.
- Use the on-screen button names in **bold** and the key names in **bold**, matching the
  current README style.
- If code and an instruction below disagree, follow the code and list the disagreement in
  `.handoff/report.md`.

### 1. `README.md`

Keep the existing sections and order: intro, How to use, Controls, Commands, Credits. Make
these changes:

- **Intro**:
  - Add the live site link, `https://stansz.github.io/drumline-studio/`, on its own line
    after the first sentence.
  - Keep the "forked from DrumlineTD" link.
- **How to use**: split the long paragraphs into short subsections, each with a `###`
  heading and the same facts as now:
  - `### Painting a pattern`: grid, rows as pitch, removing notes. Add one sentence: the four
    instruments are Kick, Hat, Synth, and Snare.
  - `### Length and pages`
  - `### Playing`: covers these controls:
    - Play/Pause and Stop
    - tempo 40–300 with the BPM box and the **−**/**+** buttons
    - **Backing**, including the metronome only while the grid is empty
    - **Mute**, **Clear**, and **Theme**
  - `### FX`: the four sliders and Reset, as now.
  - `### Saving and sharing`: covers autosave, then the Share panel's three actions, as now.
    Add one sentence: recordings are taken at full level, before the volume slider, so the
    slider does not change a recording's loudness.
- **Controls**:
  - Keep the key list as it is.
  - Check each key against the `keydown` handler in `src/main.ts`, and fix any that differ.
- **Phones**:
  - Keep the phone sentence.
  - Add: "Held sideways, the FX and Share panels open over the bottom of the board; press the
    button again to close them."
- **Commands**: keep as is. Add `npm run preview` with the note "serves the built `dist/`
  locally".
- Add a short section before **Credits**, titled `## Hidden features`: Live play (the
  Paint/Live/Rec mode, keys A–K) and the step-light loop are built but turned off with
  `LIVE_TOOLS` in `src/config.ts`.

### 2. `AGENTS.md`

- Intro: keep it. Replace "on its own sixteenth note" wording so it reads: Drumline Studio is
  a browser step sequencer with a 16- or 32-step pattern; each step is one sixteenth note.
- Add one line under Commands: "`CLAUDE.md` only imports this file."
- **Read before changing**: keep both entries. Add: "Saving, share links, recording, or MIDI:
  the "Saving and sharing" section of [docs/references.md](docs/references.md)".
- **Rules**: keep every existing rule, with these edits:
  - "make the game work without it" → "make the app work without it".
  - "when the game's name changes" → "if the app is renamed".
  - Merge the two rules about pure modules into one: "Keep `src/sequencer.ts`, `src/live.ts`,
    `src/fx.ts`, `src/pattern.ts`, `src/midi.ts`, and `src/recording.ts` free of the DOM,
    audio, and `localStorage`. `src/sequencer.ts` also stays free of randomness." Keep the
    separate `LIVE_TOOLS` sentence and the FX "on top of the theme" sentence as their own
    rules.
  - Add: "Docs describe only what the code does now. When a change makes a doc statement
    false, fix the doc in the same change."
- Keep the dsh / `spawn EPERM` rule and the "Update the matching doc" rule unchanged.

### 3. `docs/references.md`

Rewrite so it matches the code. Keep the existing heading structure, with these changes:

- **Files**: list every file in `src/`, with one line each. Add entries for:
  - `src/fx.ts`: FX settings, parsing, and filter cutoffs
  - `src/live.ts`: live-play modes, key rows, and nearest-step quantizing; hidden by
    `LIVE_TOOLS`
  - `src/pattern.ts`: autosave JSON and the `v1.` share-link format
  - `src/midi.ts`: MIDI file writer
  - `src/recording.ts`: recording type, file names, and timer text
  - `src/style.css`
  - `index.html`
  - `public/`

  Also fix the `src/config.ts` line to mention `MAX_STEPS`, `MIX`, and `LIVE_TOOLS`.
- `.handoff/` entry: say that `plan.md` is tracked and holds the most recent spec, earlier
  specs are in git history, and `report.md` and `last-run.log` are ignored.
- **How a step works**: keep the three steps, and add:
  - `sequencer.step()` returns only notes on steps inside the pattern length (and inside the
    loop when one is set), then moves to `stepAfter()`.
  - Pause stops the scheduler and keeps the step. Stop also rewinds. Notes already scheduled
    within `LOOKAHEAD_SECONDS` still sound after a pause.
- **Audio chain**:
  - Update the diagram to match the constructor in `src/audio.ts`, including the two FX
    filters and the recording tap. Read the real connections from the code. The expected
    shape is:
    `instrument, music, and fx buses → master → trim → crusher → theme filter → FX low-pass → FX high-pass → limiter → soft clip → analyser → volume → output`,
    with the recording stream tapped from the analyser, and the FX delay and reverb sends
    taken from the instrument bus.
  - Note that the instrument bus is still named `towerBus` in code.
  - Keep the existing bullets.
- **Visuals**:
  - Describe the page offset for 32 steps.
  - Describe the red outline over a hovered note, which shows that clicking removes it.
  - Delete the sentence about Synth's description moving the board by 5px. The info line is
    now one fixed line that truncates.
- **Audio load**: keep, but change "The game uses" to "The app uses".
- Replace **Saved settings** with `## Saving and sharing`. It covers:
  - Every `localStorage` key and what it holds: `drumline-theme`, `drumline-backing`,
    `drumline-volume`, `drumline-bpm`, `drumline-fx` (JSON), `drumline-pattern` (JSON
    `{ v: 1, length, cells }`). Mute is not saved.
  - Share links: the hash format `v1.<length>.<bpm>.<theme id>.<cells>`, with two bytes per
    cell (step, then row × 4 + instrument index) in base64url. A link loads over the autosave,
    is then autosaved, and is removed from the address bar. Invalid links are ignored.
  - Recording: `MediaRecorder` on a stream from `Audio_.createRecordingStream()`. The format
    is the first supported in `pickRecordingType`'s list. The Record button is disabled until
    audio starts, and hidden where `MediaRecorder` is missing.
  - MIDI: type 0, 96 ticks per quarter, one step = 24 ticks. Drums are on channel 10 (kick 36,
    snare 38, hat 42), and the synth uses the theme's scale on channel 1. The track ends at the
    pattern length.
- **Browser testing**: keep it. Add:
  - Navigating to the same URL with only a new `#hash` doesn't reload the page. Load
    `about:blank` first when testing share links.
  - Downloads in headless Edge need `Page.setDownloadBehavior`.

### 4. `docs/themes.md`

- Replace tower-defense wording:
  - "tower sounds" → "instrument sounds"
  - "tower timing, or game balance" → "the pattern"
  - "tower decays" → "instrument decays"
- Change "measured on DrumlineTD boards and must be refreshed for the full 128-cell grid" to
  say the baseline was measured on DrumlineTD boards and needs refreshing for the current
  grid, which is up to 256 cells with 32 steps and four instruments.
- Keep everything else.

## Acceptance

- PowerShell:
  `Select-String -Path README.md,AGENTS.md,docs/references.md,docs/themes.md -Pattern '\btower|the game\b|game balance|Speed and|5px'`
  prints nothing.
- PowerShell:
  `Select-String -Path docs/references.md -Pattern 'pattern.ts','midi.ts','recording.ts','fx.ts','live.ts','drumline-pattern','drumline-fx','drumline-bpm','createRecordingStream'`
  prints at least one line for each pattern.
- PowerShell: `Select-String -Path README.md -Pattern 'stansz.github.io/drumline-studio'`
  prints one line.
- `git diff --name-only` lists only `README.md`, `AGENTS.md`, `docs/references.md`, and
  `docs/themes.md`, plus the already-modified `.handoff/plan.md`.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`. Make no source,
  test, or config changes.
- Do not describe features that don't exist in the code, and do not describe the hidden live
  tools as available.
- Do not run `npm test` or `npm run build`. No commands other than reading files and the
  acceptance checks are needed.

## Out of scope

- The sampler (not built).
- Code comments.

## If blocked

Stop. Write what failed and the step number to `.handoff/report.md`.
