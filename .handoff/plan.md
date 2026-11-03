# Plan: four new themes, four Christmas tunes, and a Sounds page on the screen

## Goal

In Drumline Studio (`C:\Users\sz\Documents\Code\drumline-studio`):

1. Add four themes: **Hip-hop**, **House**, **Synthwave**, and **Clean**.
2. Add four public-domain Christmas tunes as presets in a new **Holiday** group on the Beats page.
3. Move the sampler's sound list, **Mic**, and **File** onto a third page of the screen
   (`#beats-screen`), **Sounds**. When Sample is selected, the dock shows a button with the
   current sound's name (it opens the Sounds page) and the Sample volume slider.

## Files to touch

- `src/themes.ts`
- `tests/themes.test.ts`
- `src/presets.ts`
- `tests/presets.test.ts`
- `index.html`
- `src/main.ts`
- `src/style.css`
- `docs/themes.md`
- `docs/guide.md`
- `docs/references.md`
- `README.md`
- `.handoff/report.md`

## Steps

### 1. `src/themes.ts`: four new themes

Add these constants after `FUNK`, then set
`export const THEMES: Theme[] = [NEON, CHIPTUNE, LOFI, TECHNO, FUNK, HIPHOP, HOUSE, SYNTHWAVE, CLEAN];`.
Use the values exactly. `trim` and `musicTrim` start at 1; the verifier calibrates them.

```ts
const HIPHOP: Theme = {
  id: 'hiphop',
  name: 'Hip-hop',
  blurb: 'Dusty minor chords, a heavy boom-bap kick and snare, and a little swing.',
  chords: [
    { name: 'Cm9', pad: [55, 58, 62, 63], bass: 36 },
    { name: 'Abmaj7', pad: [56, 60, 63, 67], bass: 44 },
    { name: 'Fm9', pad: [55, 56, 60, 63], bass: 41 },
    { name: 'G7', pad: [53, 55, 59, 62], bass: 43 },
  ],
  chorusChords: [
    { name: 'Ebmaj7', pad: [51, 55, 58, 62], bass: 39 },
    { name: 'Abmaj7', pad: [56, 60, 63, 67], bass: 44 },
    { name: 'Fm9', pad: [55, 56, 60, 63], bass: 41 },
    { name: 'G7', pad: [53, 55, 59, 62], bass: 43 },
  ],
  swing: 0.12,
  crackle: 0,
  space: {
    reverbSend: 0.1,
    reverbSeconds: 0.8,
    trim: 1,
    musicTrim: 1,
    delaySend: 0.08,
    delayFeedback: 0.3,
    toneHz: 7000,
    crush: 0.15,
  },
  chord: { style: 'stab', steps: [0, 7], wave: 'triangle', cutoffHz: 2000, decay: 0.6, level: 1.6, wobbleCents: 4 },
  bass: {
    steps: [0, 7, 10],
    wave: 'sine',
    decay: 0.5,
    level: 1.2,
    filter: null,
    octaveSteps: [],
    ghostSteps: [],
    sweepBars: 0,
  },
  arp: { steps: [], rate: 2, wave: 'triangle', decay: 0.2, level: 0, minLevel: 0 },
  drums: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  drumLevels: { kick: 0.4, snare: 0.18, hat: 0.07 },
  drumKit: { snareHz: 1500, snareDecay: 0.14, hatDecay: 0.03 },
  kick: { wave: 'sine', baseHz: 50, sweep: 3, sweepTime: 0.07, attack: 0.003, decay: 0.35, click: 0.1 },
  hat: { noise: 'white', filter: 'bandpass', filterHz: 6000, q: 1, decay: 0.04, level: 0.8 },
  synth: {
    waves: ['triangle', 'sine'],
    secondRatio: 2,
    filter: 'lowpass',
    filterHz: 2200,
    filterEndHz: null,
    q: 1,
    attack: 0.005,
    decay: 0.35,
    scale: [60, 63, 65, 67, 70, 72, 75, 77],
  },
};

const HOUSE: Theme = {
  id: 'house',
  name: 'House',
  blurb: 'A four-on-the-floor kick, offbeat open hats, and stabbing organ chords over an offbeat bass.',
  chords: [
    { name: 'Am7', pad: [55, 60, 64, 69], bass: 45 },
    { name: 'Dm7', pad: [57, 60, 62, 65], bass: 38 },
    { name: 'Fmaj7', pad: [57, 60, 64, 65], bass: 41 },
    { name: 'E7', pad: [56, 59, 62, 64], bass: 40 },
  ],
  chorusChords: [
    { name: 'Fmaj7', pad: [57, 60, 64, 65], bass: 41 },
    { name: 'G', pad: [55, 59, 62, 67], bass: 43 },
    { name: 'Am7', pad: [55, 60, 64, 69], bass: 45 },
    { name: 'E7', pad: [56, 59, 62, 64], bass: 40 },
  ],
  swing: 0,
  crackle: 0,
  space: {
    reverbSend: 0.2,
    reverbSeconds: 1.4,
    trim: 1,
    musicTrim: 1,
    delaySend: 0.15,
    delayFeedback: 0.28,
    toneHz: 14000,
    crush: 0,
  },
  chord: { style: 'stab', steps: [2, 6, 10, 14], wave: 'square', cutoffHz: 2400, decay: 0.12, level: 1.4, wobbleCents: 0 },
  bass: {
    steps: [2, 6, 10, 14],
    wave: 'sawtooth',
    decay: 0.14,
    level: 0.9,
    filter: { startHz: 900, endHz: 300, q: 4 },
    octaveSteps: [],
    ghostSteps: [],
    sweepBars: 0,
  },
  arp: { steps: [], rate: 2, wave: 'sine', decay: 0.12, level: 0, minLevel: 0 },
  drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14] },
  drumLevels: { kick: 0.44, snare: 0.14, hat: 0.1 },
  drumKit: { snareHz: 2200, snareDecay: 0.12, hatDecay: 0.12 },
  kick: { wave: 'sine', baseHz: 48, sweep: 4, sweepTime: 0.05, attack: 0.002, decay: 0.28, click: 0.2 },
  hat: { noise: 'white', filter: 'highpass', filterHz: 8000, q: 0.7, decay: 0.12, level: 0.9 },
  synth: {
    waves: ['square', 'sawtooth'],
    secondRatio: 1,
    filter: 'lowpass',
    filterHz: 3000,
    filterEndHz: 800,
    q: 3,
    attack: 0.003,
    decay: 0.18,
    scale: [57, 59, 60, 62, 64, 65, 67, 69],
  },
};

const SYNTHWAVE: Theme = {
  id: 'synthwave',
  name: 'Synthwave',
  blurb: 'Big detuned saw pads, a driving eighth-note bass, a fast arpeggio, and lots of reverb.',
  chords: [
    { name: 'Dm', pad: [57, 62, 65, 69], bass: 38 },
    { name: 'Bbmaj7', pad: [57, 58, 62, 65], bass: 46 },
    { name: 'F', pad: [57, 60, 65, 69], bass: 41 },
    { name: 'C', pad: [55, 60, 64, 67], bass: 48 },
  ],
  chorusChords: [
    { name: 'Bb', pad: [58, 62, 65, 70], bass: 46 },
    { name: 'C', pad: [55, 60, 64, 67], bass: 48 },
    { name: 'Dm', pad: [57, 62, 65, 69], bass: 38 },
    { name: 'Am', pad: [57, 60, 64, 69], bass: 45 },
  ],
  swing: 0,
  crackle: 0,
  space: {
    reverbSend: 0.35,
    reverbSeconds: 2.6,
    trim: 1,
    musicTrim: 1,
    delaySend: 0.25,
    delayFeedback: 0.4,
    toneHz: 11000,
    crush: 0,
  },
  chord: { style: 'hold', steps: [0], wave: 'sawtooth', cutoffHz: 1400, decay: 0, level: 1.1, wobbleCents: 12 },
  bass: {
    steps: [0, 2, 4, 6, 8, 10, 12, 14],
    wave: 'sawtooth',
    decay: 0.12,
    level: 0.75,
    filter: { startHz: 1200, endHz: 400, q: 2 },
    octaveSteps: [2, 6, 10, 14],
    ghostSteps: [],
    sweepBars: 0,
  },
  arp: {
    steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    rate: 1,
    wave: 'square',
    decay: 0.1,
    level: 0.6,
    minLevel: 0.4,
  },
  drums: { kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14] },
  drumLevels: { kick: 0.4, snare: 0.18, hat: 0.06 },
  drumKit: { snareHz: 1600, snareDecay: 0.25, hatDecay: 0.03 },
  kick: { wave: 'sine', baseHz: 50, sweep: 4, sweepTime: 0.08, attack: 0.003, decay: 0.3, click: 0.05 },
  hat: { noise: 'white', filter: 'highpass', filterHz: 7500, q: 1.2, decay: 0.03, level: 0.8 },
  synth: {
    waves: ['sawtooth', 'sawtooth'],
    secondRatio: 1.008,
    filter: 'lowpass',
    filterHz: 3500,
    filterEndHz: 1200,
    q: 2,
    attack: 0.01,
    decay: 0.3,
    scale: [62, 64, 65, 67, 69, 70, 72, 74],
  },
};

const CLEAN: Theme = {
  id: 'clean',
  name: 'Clean',
  blurb: 'Plain sine and triangle tones with almost no effects, so every note sounds as written.',
  chords: [
    { name: 'C', pad: [60, 64, 67], bass: 48 },
    { name: 'Am', pad: [57, 60, 64], bass: 45 },
    { name: 'F', pad: [57, 60, 65], bass: 41 },
    { name: 'G', pad: [55, 59, 62], bass: 43 },
  ],
  chorusChords: [
    { name: 'F', pad: [57, 60, 65], bass: 41 },
    { name: 'G', pad: [55, 59, 62], bass: 43 },
    { name: 'Em', pad: [55, 59, 64], bass: 40 },
    { name: 'Am', pad: [57, 60, 64], bass: 45 },
  ],
  swing: 0,
  crackle: 0,
  space: {
    reverbSend: 0.05,
    reverbSeconds: 0.6,
    trim: 1,
    musicTrim: 1,
    delaySend: 0,
    delayFeedback: 0.15,
    toneHz: 20000,
    crush: 0,
  },
  chord: { style: 'hold', steps: [0], wave: 'sine', cutoffHz: 4000, decay: 0, level: 1.2, wobbleCents: 0 },
  bass: {
    steps: [0, 8],
    wave: 'sine',
    decay: 0.6,
    level: 1.1,
    filter: null,
    octaveSteps: [],
    ghostSteps: [],
    sweepBars: 0,
  },
  arp: { steps: [0, 4, 8, 12], rate: 2, wave: 'sine', decay: 0.25, level: 0.7, minLevel: 0 },
  drums: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  drumLevels: { kick: 0.32, snare: 0.14, hat: 0.05 },
  drumKit: { snareHz: 2000, snareDecay: 0.1, hatDecay: 0.025 },
  kick: { wave: 'sine', baseHz: 55, sweep: 2.5, sweepTime: 0.1, attack: 0.004, decay: 0.25, click: 0 },
  hat: { noise: 'white', filter: 'highpass', filterHz: 6500, q: 0.7, decay: 0.03, level: 0.8 },
  synth: {
    waves: ['sine', 'triangle'],
    secondRatio: 1,
    filter: 'lowpass',
    filterHz: 8000,
    filterEndHz: null,
    q: 0.5,
    attack: 0.005,
    decay: 0.3,
    scale: [60, 62, 64, 67, 69, 72, 74, 76],
  },
};
```

Format with the file's existing style (one property per line where the existing themes do so);
values must not change.

### 2. `tests/themes.test.ts`

- Rename `'swings only Lo-fi and Funk'` to `'swings only Lo-fi, Funk, and Hip-hop'` and expect
  `['lofi', 'funk', 'hiphop']`.
- Add `'lists the nine themes in order'`: `THEMES.map((t) => t.id)` equals
  `['neon', 'chiptune', 'lofi', 'techno', 'funk', 'hiphop', 'house', 'synthwave', 'clean']`.
- Keep every other test.

### 3. `src/presets.ts`: Holiday tunes

- `kind` becomes `'groove' | 'tune' | 'holiday'`.
- Add scales:
  ```ts
  'deck-the-halls': [71, 72, 74, 76, 77, 79, 81, 83], // B4 C5 D5 E5 F5 G5 A5 B5
  'god-rest-ye': [67, 69, 71, 72, 74, 76, 77, 79], // G4 A4 B4 C5 D5 E5 F5 G5
  ```
- Append after `can-can`, in this order:
  ```ts
  {
    id: 'jingle-bells',
    name: 'Jingle Bells',
    kind: 'holiday',
    blurb: 'James Lord Pierpont, 1857. Sleigh bells on every beat.',
    themeId: 'clean',
    bpm: 70,
    length: 32,
    backing: 'off',
    scale: 'c-major',
    cells: [
      ...melody('synth', [
        [0, 5], [2, 5], [4, 5], [8, 5], [10, 5], [12, 5], [16, 5], [18, 3], [20, 7], [23, 6], [24, 5],
      ]),
      ...melody('bass', [
        [0, 7], [4, 3], [8, 7], [12, 3], [16, 7], [20, 3], [24, 7], [28, 3],
      ]),
      ...line('hat', 0, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]),
      ...line('kick', 6, [0, 8, 16, 24]),
      ...line('snare', 2, [4, 12, 20, 28]),
    ],
  },
  {
    id: 'deck-the-halls',
    name: 'Deck the Halls',
    kind: 'holiday',
    blurb: 'Welsh carol, 1700s. Fa-la-la by the fire.',
    themeId: 'lofi',
    bpm: 72,
    length: 32,
    backing: 'off',
    scale: 'deck-the-halls',
    cells: [
      ...melody('synth', [
        [0, 2], [3, 3], [4, 4], [6, 5], [8, 6], [10, 5], [12, 4], [14, 6],
        [16, 5], [17, 4], [18, 3], [19, 5], [20, 4], [23, 5], [24, 6], [26, 7], [28, 6],
      ]),
      ...melody('bass', [
        [0, 6], [4, 2], [8, 2], [12, 6], [16, 2], [20, 2], [24, 2], [30, 6],
      ]),
      ...line('kick', 1, [0, 8, 16, 24]),
      ...line('snare', 0, [4, 12, 20, 28]),
    ],
  },
  {
    id: 'joy-to-the-world',
    name: 'Joy to the World',
    kind: 'holiday',
    blurb: 'Isaac Watts and Lowell Mason, 1839. A whole scale, top to bottom.',
    themeId: 'house',
    bpm: 120,
    length: 32,
    backing: 'off',
    scale: 'c-major',
    cells: [
      ...melody('synth', [
        [0, 0], [4, 1], [7, 2], [8, 3], [14, 4], [16, 5], [20, 6], [24, 7],
      ]),
      ...melody('bass', [
        [0, 7], [4, 7], [8, 4], [12, 3], [16, 7], [20, 3], [28, 7],
      ]),
      ...line('kick', 6, [0, 8, 16, 24]),
      ...line('snare', 2, [4, 12, 20, 28]),
    ],
  },
  {
    id: 'god-rest-ye',
    name: 'God Rest Ye Merry Gentlemen',
    kind: 'holiday',
    blurb: 'English carol, 1700s. A minor-key march.',
    themeId: 'synthwave',
    bpm: 75,
    length: 32,
    backing: 'off',
    scale: 'god-rest-ye',
    cells: [
      ...melody('synth', [
        [0, 6], [2, 6], [4, 2], [6, 2], [8, 3], [10, 4], [12, 5], [14, 6],
        [16, 7], [18, 6], [20, 5], [22, 4], [24, 3], [26, 2],
      ]),
      ...melody('bass', [
        [1, 6], [5, 6], [9, 3], [13, 2], [17, 7], [21, 4], [25, 3], [29, 2],
      ]),
      ...line('kick', 1, [0, 8, 16, 24]),
      ...line('snare', 0, [4, 12, 20, 28]),
    ],
  },
  ```
- Update the comment above `PRESETS` to also name the Holiday tunes as public-domain carols
  (Pierpont 1857, Mason 1839, and traditional English and Welsh carols).

### 4. `tests/presets.test.ts`

- `'gives every preset a kind and a short blurb'`: `kind` is one of `'groove'`, `'tune'`,
  `'holiday'`.
- Replace `'lists the grooves before the tunes'` with `'lists grooves, then tunes, then holiday
  tunes'`: the sequence of `kind`s in `PRESETS` never goes back to an earlier group in the order
  groove → tune → holiday.
- Add `'writes the four holiday tunes'`: for each of `jingle-bells`, `deck-the-halls`,
  `joy-to-the-world`, `god-rest-ye`: the preset exists, `kind` is `'holiday'`, its `scale` is in
  `SCALES`, `length` is 32, and its theme id is in `THEMES`; the first synth cells (lowest `col`)
  are `{ instrument: 'synth', col: 0, row: 5 }`, `{ instrument: 'synth', col: 0, row: 2 }`,
  `{ instrument: 'synth', col: 0, row: 0 }`, `{ instrument: 'synth', col: 0, row: 6 }`
  respectively. Import `THEMES` from `../src/themes` if not already imported.

### 5. `index.html`: Sounds page

- Replace the `#sampler` dock view's contents with exactly:
  ```html
  <button id="sample-pick" class="hw sample-pick" type="button" title="Choose the Sample sound">♪ Clap</button>
  <label class="sampler-volume" title="Sample volume"><small>Vol</small><input id="mix-sample" type="range" min="0" max="100" step="1" value="100" data-mix-channel="sample" aria-label="Sample volume" /></label>
  ```
  (The old `#sample-list`, `#sample-mic`, `#sample-file`, and `#sample-file-input` move to the
  Sounds page below; keep the `mix-sample` input exactly as it was.)
- In `#beats-screen`'s `.screen-tabs`, add after `#screen-backing`:
  `<button id="screen-sounds" class="hw" type="button" role="tab" aria-controls="sounds-page">Sounds</button>`.
  Change the dialog's `aria-label` to `"Beats, backing, and sounds"`.
- After `#backing-page`, add:
  ```html
  <div id="sounds-page" class="screen-page" role="tabpanel" hidden>
    <div class="beats-lcd">
      <div id="sample-list" class="beats-list sound-list" role="listbox" aria-label="Sample sounds"></div>
    </div>
    <div class="sounds-controls">
      <button id="sample-mic" class="hw" type="button" title="Record up to 2 seconds from the microphone">● Mic</button>
      <button id="sample-file" class="hw" type="button" title="Load a short sound file">File</button>
      <input id="sample-file-input" type="file" accept="audio/*" hidden />
    </div>
  </div>
  ```

### 6. `src/main.ts`

- Beats list groups: `renderBeatsList()` iterates `[['groove', 'Grooves'], ['tune', 'Tunes'],
  ['holiday', 'Holiday']]`.
- Screen pages: `screenPage` and the `showPage`/`openScreen` parameter type become
  `'beats' | 'backing' | 'sounds'`. Add lookups `screenSounds` (`screen-sounds`) and
  `soundsPage` (`sounds-page`), and `samplePick` (`sample-pick`, `HTMLButtonElement`).
  `showPage` also sets `soundsPage.hidden = page !== 'sounds'` and toggles `selected` /
  `aria-selected` on `screenSounds`. For `'sounds'` it calls `updateSampler()` and focuses the
  `.sound-item.active` button (or `screenSounds` if none).
- Wiring: `screenSounds` click → `showPage('sounds')`; `samplePick` click → `openScreen('sounds')`.
- `addSampleButton(name, id)`: the button gets `className = 'beats-item sound-item'`,
  `role="option"`, `data-sample` as before, `textContent = name`, and
  `style.setProperty('--c', PIXEL_COLORS[sampleById(id, hasUserSample).color] ?? '')`. Its click
  handler is unchanged (sets `sampleChosenThisVisit = true` and calls `pickSample(id)`), so
  picking a sound plays it and keeps the screen open.
- `updateSampler()`: on each `#sample-list .sound-item`, toggle class `active` and set
  `aria-selected` when `dataset.sample === sample.id` (instead of toggling `selected`).
- `updateSampleLook()`: also set `samplePick.textContent = \`♪ ${sample.name}\``. Keep the other
  lines.
- Keyboard: in the open-screen block, when `screenPage === 'sounds'`: `ArrowUp` / `ArrowDown`
  (with `preventDefault`) pick the previous / next sound in `#sample-list` order, wrapping, by
  calling `pickSample` with that button's `data-sample` and setting `sampleChosenThisVisit =
  true`; `Enter` (with `preventDefault`) calls `closeScreen()`. Escape, I, and Space behave as
  they do on the other pages.
- The `updateDock` logic (`'sampler'` view when Sample is selected) is unchanged.

### 7. `src/style.css`

- `.sampler-panel`: `grid-template-columns: minmax(0, 1fr) auto;`.
- Add:
  ```css
  .sample-pick {
    min-height: 0;
    height: 34px;
    padding-block: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sound-item::before {
    content: '■ ';
    color: var(--c);
  }

  .sound-item.active::before {
    color: #1d1a10;
  }

  .sounds-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .sounds-controls .hw {
    min-height: 40px;
  }
  ```
- Delete the now-unused `.sample-list` and `.sample-list .hw` rules (base and phone media
  query). Remove `.sample-list .hw`, `#sample-mic`, and `#sample-file` from the shared
  34px-height selector list and from the phone font-size selector list (keep the other
  selectors in those lists). Keep `#sample-mic.rec`.
- In the phone media query that sets `.sampler-volume { width: 72px; }`, change it to
  `width: 110px;` and delete the `.sampler-volume small { display: none; }` rule there.

### 8. Docs

- `docs/themes.md`: wherever it lists the themes, list all nine: Neon, Chiptune, Lo-fi, Techno,
  Funk, Hip-hop, House, Synthwave, Clean. Note that Clean keeps effects near zero.
- `docs/guide.md`:
  - Backing music: the themes are Neon, Chiptune, Lo-fi, Techno, Funk, Hip-hop, House,
    Synthwave, and Clean.
  - Beats section: three lists, adding **Holiday** (Jingle Bells, Deck the Halls, Joy to the
    World, God Rest Ye Merry Gentlemen). Holiday tunes are public-domain carols.
  - Sampler section: selecting **Sample** shows the current sound's button and the Sample
    volume in the dock; tap the sound's button to open the **Sounds** page of the screen, with
    the sound list, **Mic**, and **File**. Tapping a sound plays it and keeps the screen open;
    the arrow keys step through sounds and **Enter** closes. Keep the rest of the section (rows,
    per-note sounds, Mic/File behavior, Mine). Change the image alt text to
    `The Sounds page of the screen`.
  - The Dock bullet in "The screen": "the selected instrument's volume, the Sample sound and
    volume, or whichever of Mix, FX, or Share is open".
- `docs/references.md`: the Beats screen paragraph names three pages (Beats, Backing, Sounds),
  `#sounds-page`, and that `renderSampleButtons()` fills `#sample-list` there; the dock
  paragraph says the sampler view holds `#sample-pick` and the Sample volume.
- `README.md`: Features: "Backing music in nine themes: Neon, Chiptune, Lo-fi, Techno, Funk,
  Hip-hop, House, Synthwave, and Clean, …"; the Grooves and tunes bullet becomes "six ready-made
  grooves, five public-domain tunes, and four Christmas carols, plus a random groove maker with
  undo." Add to Credits: "Jingle Bells (Pierpont, 1857), Joy to the World (Mason, 1839), Deck the
  Halls, and God Rest Ye Merry Gentlemen are public-domain carols."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git grep -n -F "id: 'clean'" -- src/themes.ts` prints one line.
- `git grep -n -F "id: 'god-rest-ye'" -- src/presets.ts` prints one line.
- `git grep -n -F 'id="sounds-page"' -- index.html` prints one line.
- `git grep -n -F 'id="sample-pick"' -- index.html` prints one line.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.
- Loudness calibration of the four new themes on `/tests/loudness.html`.
- A browser check of the Sounds page, the dock, the Holiday list, and the new themes.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch**, except `.handoff/report.md`.
- Do not change the existing five themes, existing presets, sounds, saved keys, share-link
  formats, or shortcuts.
- Do not change any value given in this plan.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get
  past it.
- If a TypeScript type error comes from code written in this plan and has a one-line, type-only
  fix that doesn't change behavior, apply it and list it in the report instead of stopping.

## Out of scope

- Loudness trims (the verifier sets them).
- New screenshots (the verifier retakes them).
- Grooves for the new themes.

## If blocked

Stop. Write what failed, the exact command and its output, and the step number to
`.handoff/report.md`. Do not improvise a different design.
