# Plan: Bass, a sixth instrument

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`), add **Bass** (key **6**):

- Each row plays a note of the current theme's synth scale, two octaves lower: the bottom row
  is the lowest note.
- It uses the theme's backing-bass tone (wave, decay, filter), so each theme's bass sounds
  like that theme.
- It has its own pad, color (a new purple), mixer slider, single-slider mixer view, MIDI
  channel, and a new share-link version `v4`. Old links still load.
- While the pattern holds any Bass notes, the backing's own bass part is muted, so the two
  bass lines don't clash.

## Files to touch

- `src/sequencer.ts`
- `src/config.ts`
- `src/sprites.ts`
- `src/render.ts`
- `src/audio.ts`
- `src/mix.ts`
- `src/pattern.ts`
- `src/midi.ts`
- `src/main.ts`
- `src/style.css`
- `index.html`
- `tests/sequencer.test.ts`
- `tests/voices.test.ts`
- `tests/sprites.test.ts`
- `tests/mix.test.ts`
- `tests/pattern.test.ts`
- `tests/midi.test.ts`
- `README.md`
- `AGENTS.md`
- `docs/references.md`
- `.handoff/report.md`

## Steps

### 1. `src/sequencer.ts`

`Instrument` adds `'bass'`. `INSTRUMENTS` becomes
`['kick', 'hat', 'synth', 'snare', 'sample', 'bass']`. Append only: the order is part of the
share format.

### 2. `src/config.ts`

- `MIX`: add `bassNote: 0.3,`.
- `VOICE_LIMITS`: add `bass: 1` (a bass line is one note at a time).
- `INSTRUMENT_INFO`: add
  `bass: { name: 'Bass', description: "Deep notes in the theme's key. Higher rows play higher. Bass notes mute the backing bass." },`.

### 3. `src/sprites.ts`

- Add `p: '#9b6cff',` to `PIXEL_COLORS`.
- Add `'bass'` to `SpriteName`, and this entry to `SPRITES`:

```ts
bass: [
  [
    '................',
    '.00000000000000.',
    '.0pppppppppppp0.',
    '.0ppp000000ppp0.',
    '.0pp04444440pp0.',
    '.0p0443333440p0.',
    '.0p0433003340p0.',
    '.0p0430660340p0.',
    '.0p0430660340p0.',
    '.0p0433003340p0.',
    '.0p0443333440p0.',
    '.0pp04444440pp0.',
    '.0ppp000000ppp0.',
    '.0pppppppppppp0.',
    '.00000000000000.',
    '................',
  ],
  [
    '................',
    '.00000000000000.',
    '.0pppppppppppp0.',
    '.0ppp000000ppp0.',
    '.0pp04444440pp0.',
    '.0p0444444440p0.',
    '.0p0446666440p0.',
    '.0p0466666640p0.',
    '.0p0466666640p0.',
    '.0p0446666440p0.',
    '.0p0444444440p0.',
    '.0pp04444440pp0.',
    '.0ppp000000ppp0.',
    '.0pppppppppppp0.',
    '.00000000000000.',
    '................',
  ],
],
```

### 4. `src/render.ts`

`NOTE_OUTLINE`: add `bass: PIXEL_COLORS.p`.

### 5. `src/audio.ts`

- Add `bass` to the per-instrument level and delay-send gains. If they are built from
  `INSTRUMENTS`, this happens automatically: check.
- `playNote`: add `} else if (instrument === 'bass') { this.playBassNote(row, time, level); }`
  before the final `else`.
- Add:

  ```ts
  // The playable bass: the theme's synth scale two octaves down, with the backing bass's tone.
  private playBassNote(row: number, time: number, level: number): void {
    const bass = this.theme.bass;
    const note = (this.theme.synth.scale[7 - clampRow(row)] ?? 45) - 24;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    this.setWave(osc, bass.wave);
    osc.frequency.setValueAtTime(midiToHz(note), time);
    const decay = Math.max(bass.decay, 0.25);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIX.bassNote * bass.level * level, 0.0001), time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    if (bass.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = bass.filter.q;
      filter.frequency.setValueAtTime(bass.filter.startHz, time);
      filter.frequency.exponentialRampToValueAtTime(bass.filter.endHz, time + decay);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.instrumentLevels.bass);
    osc.start(time);
    osc.stop(time + decay + 0.02);
  }
  ```

- `playMusicStep(…, section, options: { backingBass?: boolean } = {})`: skip the backing bass
  part when `options.backingBass === false`. Everything else is unchanged.

### 6. `src/mix.ts`

`MIX_CHANNELS` becomes `['kick', 'hat', 'synth', 'snare', 'sample', 'bass', 'backing']`.
`DEFAULT_MIX` adds `bass: 1`.

### 7. `src/pattern.ts`

- `encodeShare` writes `v4`. It is the same as `v3`, except each cell's second byte is
  `row * 6 + instrument index`. The `'v4'` prefix and 7 parts are otherwise identical.
- `decodeShare` accepts `v4` (6 instruments) and still accepts `v3` (5 instruments), `v2`,
  and `v1`.
  - Share the v3/v4 parsing code, with the instrument count as a parameter.
  - Make sure v1/v2/v3 decoding keeps its old counts (4, 5, 5) and does not use
    `INSTRUMENTS.length`.
- Update the format comment.

### 8. `src/midi.ts`

Bass cells go on channel 2 (index 1), with note `synthScale[7 - row] - 24`. Add
`const BASS_CHANNEL = 1;`.

### 9. `index.html`

- After the `#tool-sample` pad, add:
  `<button id="tool-bass" class="pad" type="button"><span class="led"></span><canvas data-sprite="bass" width="16" height="16"></canvas><b>Bass</b><kbd>6</kbd></button>`
- In `#mix`, after the snare `.mix-channel` label, add:
  `<label class="fx-knob mix-channel" data-channel="bass" style="--c: #9b6cff" hidden><small>Bass volume</small><input id="mix-bass" type="range" min="0" max="100" step="1" value="100" data-mix-channel="bass" aria-label="Bass volume" /></label>`
  Match the attributes the other `.mix-channel` labels use. If they don't have `hidden` in
  the HTML, leave it off too.
- In `#mix-all`, after the Sample label, add:
  `<label class="fx-knob" style="--c: #9b6cff"><small>Bass</small><input type="range" min="0" max="100" step="1" value="100" data-mix-channel="bass" aria-label="Bass volume" /></label>`

### 10. `src/main.ts`

- Wire `#tool-bass`: add a `bassButton`, a click handler `selectTool('bass')`, the `selected`
  toggle in `updateSelection`, and key `'6'`.
- `onStep`: compute
  `const userBass = sequencer.activeCells().some((cell) => cell.instrument === 'bass');`
  and pass `{ backingBass: !userBass }` as the new last argument to `audio.playMusicStep`.
- The mixer wiring finds sliders by `data-mix-channel`, so `bass` should work without
  changes. Check it.
- The pad tooltip loop over `INSTRUMENTS` picks up Bass automatically. Check it.

### 11. `src/style.css`

- `.pads`: `grid-template-columns: repeat(6, 1fr);`. Change any other 5-column `.pads` rule
  to 6.
- `#tool-bass { --c: #9b6cff; }`.
- `.mix-all-panel`: `repeat(7, minmax(0, 1fr))`.
- Keep layouts otherwise unchanged. The GUI layout gets reviewed separately.

### 12. Tests

- `tests/sequencer.test.ts`: `INSTRUMENTS` ends with `'bass'`, and a bass cell plays on its
  step.
- `tests/voices.test.ts`: bass has a limit of 1. Three bass notes on one step keep one.
- `tests/sprites.test.ts`: the size test and the key-list test include `bass`. Every sprite
  color is defined (the existing test covers `p`).
- `tests/mix.test.ts`: `MIX_CHANNELS` is `INSTRUMENTS` followed by `'backing'`, and
  `DEFAULT_MIX.bass` is 1.
- `tests/pattern.test.ts`:
  - `encodeShare` writes `v4`, and a round-trip keeps a bass cell at column 31, row 7,
    alongside sample cells with different sounds.
  - Update the regex test to `v4`.
  - Add: a v3 link built in the test with the old v3 encoding (`row * 5 + index`, 3 bytes per
    cell) still decodes a sample cell correctly.
  - The existing v1/v2 tests stay green.
- `tests/midi.test.ts`: a bass cell at row 7 with scale `[60, …]` produces note-on
  `0x91 36 100`.

### 13. Docs

- `README.md`: six instruments, with Bass on key 6. Add a short Bass paragraph: the theme's
  scale two octaves down, one note at a time, and painting Bass mutes the backing bass. Add
  Bass to the mixer and Controls lists. Note that older share links still open.
- `AGENTS.md`: update the share-link rule to mention `v4`.
- `docs/references.md`:
  - The `v4` format.
  - The bass voice in the audio chain.
  - The MIDI bass channel.
  - The `drumline-mix` key now includes `bass`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F 'tool-bass' -- index.html` prints one line.
- `git grep -n -F "'v4'" -- src/pattern.ts` prints at least one line.
- PowerShell: `(Select-String -Path index.html -Pattern 'data-mix-channel="bass"').Count`
  prints 2.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- A browser check of the sound, mixer, backing-bass mute, and layout.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change other instruments' sounds, themes, sections, FX, the sampler, or the dock.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line,
  type-only fix that doesn't change behavior, apply it and list it in the report instead of
  stopping.

## Out of scope

- Presets or randomize (next round).
- A layout redesign.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
