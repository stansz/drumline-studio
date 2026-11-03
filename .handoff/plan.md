# Plan: Backing info screen, and a full docs refresh

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`):

1. Add a **Backing info** screen. An **ⓘ** button next to the theme button (key **I**) opens
   a modal about the current theme's backing music:
   - the theme's name and a one-line description
   - the Backing mode (Song / Loop / Off) and what it means
   - a song map showing the five sections, with the current section and bar highlighted live
     while playing
   - the verse and chorus chord names
   - the feel (straight or swung) and the tempo

   It closes with a ✕ button, **Esc**, **I**, or a click on the backdrop.
2. Do a **full docs refresh**: `README.md`, `AGENTS.md`, `docs/references.md`, and
   `docs/themes.md` must describe the app as it is after this change, checked against the
   code.

## Files to touch

- `src/song.ts`
- `src/themes.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/song.test.ts`
- `tests/themes.test.ts`
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `docs/themes.md`
- `.handoff/report.md`

## Steps

### 1. `src/song.ts`

Add pure helpers:

```ts
// Each section with the bar it starts on, for drawing the song map.
export function songMap(): Array<{ kind: SectionKind; bars: number; startBar: number }> {
  let startBar = 0;
  return SONG_FORM.map((part) => {
    const entry = { kind: part.kind, bars: part.bars, startBar };
    startBar += part.bars;
    return entry;
  });
}

// Index into SONG_FORM of the section playing at this step (sections on).
export function sectionIndexAt(musicStep: number): number {
  let bar = Math.floor(Math.max(0, musicStep) / STEPS_PER_BAR) % SONG_BARS;
  for (let i = 0; i < SONG_FORM.length; i += 1) {
    const part = SONG_FORM[i];
    if (!part) break;
    if (bar < part.bars) return i;
    bar -= part.bars;
  }
  return 0;
}

export function describeSwing(swing: number): string {
  return swing <= 0 ? 'Straight' : `Swung ${Math.round(swing * 100)}%`;
}

export const SECTION_NAMES: Record<SectionKind, string> = {
  verse: 'Verse',
  chorus: 'Chorus',
  break: 'Break',
};
```

### 2. `src/themes.ts`

- Add `blurb: string;` to `Theme`, directly after `name`.
- Add a `blurb` to each theme. Use these drafts, but **check each claim against that theme's
  values** (chord style and level, bass wave, arp steps and level, drum steps and levels,
  swing, crackle, `toneHz`, `crush`, `reverbSend`). Correct any wording that a value
  contradicts, and list each correction in the report:
  - Neon: `'Warm sawtooth pads over a soft triangle bass in A minor. No backing drums, so your beat leads.'`
  - Chiptune: `'A bouncy triangle bass and a fast pulse-wave arpeggio in C major, with 8-bit grit and simple drums.'`
  - Lo-fi: `'Mellow jazzy chords with a lazy swing, a muffled tone, and vinyl crackle.'`
  - Techno: `'Dark minor stabs, a four-on-the-floor kick, and a big, spacious reverb.'`
  - Funk: `'Bright ninth and thirteenth chord stabs, a bass with ghost notes, and a light swing.'`

### 3. `index.html`

- In `.sys`, directly after `#theme`, add
  `<button id="info-toggle" class="hw" type="button" aria-haspopup="dialog" aria-controls="backing-info" title="About the backing music (I)">ⓘ</button>`.
- Before `<div id="overlay">`, add:

  ```html
  <div id="backing-info" class="info-backdrop" hidden>
    <div class="info-panel" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <div class="info-head">
        <h2 id="info-title">Backing</h2>
        <button id="info-close" class="hw" type="button" aria-label="Close">✕</button>
      </div>
      <p id="info-blurb" class="info-blurb"></p>
      <p id="info-mode" class="info-line"></p>
      <div id="info-map" class="info-map" aria-label="Song sections"></div>
      <p id="info-position" class="info-line"></p>
      <dl class="info-facts">
        <dt>Verse chords</dt><dd id="info-verse"></dd>
        <dt>Chorus chords</dt><dd id="info-chorus"></dd>
        <dt>Feel</dt><dd id="info-feel"></dd>
        <dt>Tempo</dt><dd id="info-tempo"></dd>
      </dl>
    </div>
  </div>
  ```

### 4. `src/main.ts`

- Imports: `songMap, sectionIndexAt, describeSwing, SECTION_NAMES` from `./song`.
- Elements: `infoToggle`, `infoBackdrop` (`#backing-info`), `infoClose`, `infoBlurb`,
  `infoMode`, `infoMap`, `infoPosition`, `infoVerse`, `infoChorus`, `infoFeel`, `infoTempo`,
  and the `#info-title` heading.
- Build the map once at startup: for each entry of `songMap()`, append a `<span>` to
  `infoMap` with class `info-section info-<kind>`, the text `` `${SECTION_NAMES[kind]} ${bars}` ``,
  and `style.flexGrow = String(bars)`.
- `renderInfo()` fills everything from the current state:
  - title: `` `♪ ${theme.name} backing` ``
  - blurb: `theme.blurb`
  - mode text:
    - `backing && sections`: `'Song: verse, chorus, verse, chorus, then a break, with a snare fill before each change.'`
    - `backing && !sections`: `'Loop: the verse chords on repeat.'`
    - `!backing`: `'Off: no backing music.'`
  - verse and chorus chord names: `theme.chords.map((c) => c.name).join(' · ')`, and the same
    for `chorusChords`
  - feel: `describeSwing(theme.swing)`
  - tempo: `` `${bpm} BPM` ``
  - Call it from `openInfo()`, and also after the theme, backing mode, or tempo changes while
    the screen is open.
- **Live position** (cheap: only while open). In `frame()`, when `!infoBackdrop.hidden`:
  - Take the music step being heard: track the `musicStep` of the step mark currently
    shown. If no such value exists, add `musicStep` to each `stepMarks` entry where
    `onStep` pushes it, and keep the latest shown one in a `heardMusicStep` variable.
  - With Song on and playing:
    - mark the span at `sectionIndexAt(heardMusicStep)` with class `current` (and none
      otherwise)
    - set `infoPosition` to `` `Now: ${SECTION_NAMES[kind]}, bar ${bar + 1} of ${bars}` ``, using
      `sectionAt(heardMusicStep, true)`
  - With Song on but stopped or paused: no `current` class, and the position text is
    `'Press Play to hear the song.'`
  - With Loop: the map gets class `dim`, and the text is `'Sections are off.'`
  - With backing off: the map gets class `dim`, and the text is `''`
  - Only touch the DOM when the section index, bar, or mode changed since the last frame.
- **Open and close**:
  - `openInfo()`: render, then show it (`infoBackdrop.hidden = false`) and focus `infoClose`.
  - `closeInfo()`: hide it and return focus to `infoToggle`.
  - `infoToggle` click → open. `infoClose` click → close. A click on the backdrop itself
    (`event.target === infoBackdrop`) → close.
  - Keyboard, at the top of the `keydown` handler, before other handling:
    - If the info screen is open, **Esc** or **I** closes it and returns. Every other key is
      ignored while it is open, so Space doesn't play and so on.
    - Otherwise **I** opens it. Add it to the `switch` as `case 'i'`.
  - **Esc** keeps its existing Stop behavior when the screen is closed.
- Playback continues while the screen is open.

### 5. `src/style.css`

```css
.info-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(20, 19, 26, 0.8);
}

.info-backdrop[hidden] {
  display: none;
}

.info-panel {
  width: min(520px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  background: linear-gradient(180deg, #2b2933, #24222b);
  border: 2px solid #000;
  box-shadow: inset 0 2px 0 #45414f, inset 0 -3px 0 #16151b;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--cream);
}

.info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.info-head h2 {
  margin: 0;
  font: 400 0.9rem/1.2 var(--label);
  color: var(--amber);
}

.info-head .hw {
  min-height: 32px;
  padding-inline: 10px;
}

.info-blurb,
.info-line {
  margin: 0;
  font: 400 1.15rem/1.25 var(--lcd);
  color: #cfe8c8;
}

.info-map {
  display: flex;
  gap: 3px;
}

.info-section {
  font: 400 0.55rem/1 var(--label);
  text-align: center;
  padding: 8px 2px;
  background: #3a3743;
  color: var(--mute);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.info-chorus { background: #4c3c2f; }
.info-break { background: #2c2b30; }

.info-section.current {
  background: var(--amber);
  color: #1d1a10;
}

.info-map.dim { opacity: 0.45; }

.info-facts {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font: 400 1.1rem/1.2 var(--lcd);
}

.info-facts dt { color: var(--mute); }
.info-facts dd { margin: 0; color: var(--cream); }
```

Check that `--amber`, `--mute`, `--cream`, and `--label`/`--lcd` exist. On a phone held
upright, the header must still fit on one row of buttons. If adding ⓘ makes the `.sys` row
wrap at 360px width, reduce the ⓘ button's horizontal padding to 6px.

### 6. Tests

- `tests/song.test.ts`:
  - `songMap()` returns 5 entries, starting at bars 0, 8, 16, 24, and 32.
  - `sectionIndexAt`: step 0 → 0, the first step of bar 8 → 1, bar 33 → 4, bar 36 → 0.
  - `describeSwing(0)` is `'Straight'`, and `describeSwing(0.22)` is `'Swung 22%'`.
- `tests/themes.test.ts`: every theme has a non-empty `blurb` under 140 characters.

### 7. Full docs refresh

Read the current source first: `src/*.ts`, `index.html`, `package.json`, and
`.github/workflows/deploy.yml`. Then rewrite the docs so every statement is true now.
Remove anything stale.

- **`README.md`**:
  - Keep the structure: intro with the live link, How to use (subsections), Controls,
    Commands, Hidden features, Credits.
  - How to use must cover, in this order, each briefly:
    - painting (five instruments, rows as pitch, removing notes)
    - the sampler (six built-in sounds with colors, each note keeps its sound, Mic and File
      into **Mine**, Mine is one slot saved on the device, share links fall back to Clap)
    - length and pages
    - playing (Play/Pause, Stop, tempo, Backing Song/Loop/Off with sections, Mute, Clear,
      Theme)
    - the Backing info screen
    - the mixer (the selected instrument's slider in the dock, Sample's volume in the
      sampler, Backing under Vol in the header, the **Mix** button showing all six in sync)
    - FX
    - saving and sharing (autosave, Copy link, Record, MIDI)
    - the dock (one slot under the board, one view at a time, floating when the phone is held
      sideways)
  - Controls: check every key against the `keydown` handler, and add **I**.
- **`AGENTS.md`**:
  - Keep every rule that is still true, and update any that aren't.
  - Make sure the pure-module list includes every module that is free of the DOM, audio, and
    storage. Check each file's imports: `sequencer`, `live`, `fx`, `pattern`, `midi`,
    `recording`, `samples`, `sampleEdit`, `mix`, `song`.
- **`docs/references.md`**:
  - Files: every file in `src/` and `tests/`, with one line each.
  - How a step works: include sections and per-note samples.
  - Audio chain: matches the constructor, including instrument levels and sends, the backing
    level, music trim, and FX.
  - Visuals: the dock views and the info screen.
  - Saving and sharing: every `localStorage` key in `main.ts`, the IndexedDB store, and the
    current share-link format plus the older versions that still decode.
  - Browser testing tips.
- **`docs/themes.md`**:
  - The theme fields that matter for authors: `blurb`, `chords`, `chorusChords`, `swing`,
    `space.trim`, `space.musicTrim`.
  - The section form.
  - The loudness workflow (sections off, backing and instrument checks).

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'id="backing-info"' -- index.html` prints one line.
- PowerShell: `(Select-String -Path src/themes.ts -Pattern 'blurb').Count` prints 6.
- PowerShell: `Select-String -Path README.md -Pattern '\*\*I\*\*'` prints at least one line.
- PowerShell: for each storage key name, `Select-String -Path docs/references.md -Pattern '<key>'`
  prints at least one line. The keys are `drumline-theme`, `drumline-backing`,
  `drumline-volume`, `drumline-bpm`, `drumline-fx`, `drumline-pattern`, `drumline-sample`,
  `drumline-mix`, and `drumline-sections`.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of the info screen, live position, and keys.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change sound, theme values other than adding `blurb`, the song form, the mixer, the
  sampler, or the share format.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- New themes or sections.
- Jumping to a section by hand.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
