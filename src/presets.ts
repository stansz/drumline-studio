import type { Cell, Instrument, PatternLength } from './sequencer';

// Named synth scales, low to high, one MIDI note per board row (index 0 is the bottom row).
export const SCALES: Readonly<Record<string, readonly number[]>> = {
  'a-minor': [69, 71, 72, 74, 76, 77, 79, 81], // A4 B4 C5 D5 E5 F5 G5 A5
};

export function scaleNotes(id: string | null | undefined): readonly number[] | null {
  return id ? (SCALES[id] ?? null) : null;
}

export type BackingMode = 'song' | 'loop' | 'off';

export interface Preset {
  id: string;
  name: string;
  themeId: string;
  bpm: number;
  length: PatternLength;
  backing: BackingMode;
  scale: string | null;
  cells: Cell[];
}

// Notes for one instrument on one row at the given steps.
function line(instrument: Instrument, row: number, steps: readonly number[], sample?: string): Cell[] {
  return steps.map((col) => (sample ? { instrument, col, row, sample } : { instrument, col, row }));
}

// Melody notes as [step, row] pairs.
function melody(instrument: Instrument, notes: ReadonlyArray<readonly [number, number]>): Cell[] {
  return notes.map(([col, row]) => ({ instrument, col, row }));
}

// Genre presets are original grooves named by style. Korobeiniki is a 19th-century folk song in
// the public domain. Do not name presets after copyrighted songs.
export const PRESETS: readonly Preset[] = [
  {
    id: 'four-floor',
    name: 'Four on the Floor',
    themeId: 'techno',
    bpm: 124,
    length: 16,
    backing: 'song',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 4, 8, 12]),
      ...line('hat', 1, [2, 6, 10, 14]),
      ...line('sample', 7, [4, 12], 'clap'),
      ...line('bass', 7, [2, 6, 10, 14]),
    ],
  },
  {
    id: 'boom-bap',
    name: 'Boom Bap',
    themeId: 'lofi',
    bpm: 90,
    length: 16,
    backing: 'song',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 7, 10]),
      ...line('snare', 5, [4, 12]),
      ...line('hat', 2, [0, 2, 4, 6, 8, 10, 12, 14]),
      ...melody('bass', [
        [0, 7],
        [10, 5],
      ]),
    ],
  },
  {
    id: 'breakbeat',
    name: 'Breakbeat',
    themeId: 'funk',
    bpm: 112,
    length: 16,
    backing: 'song',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 2, 10]),
      ...line('snare', 5, [4, 12]),
      ...line('snare', 1, [7, 15]),
      ...line('hat', 3, [0, 2, 4, 6, 8, 10, 12, 14]),
      ...melody('bass', [
        [0, 7],
        [10, 4],
      ]),
    ],
  },
  {
    id: 'trap',
    name: 'Trap',
    themeId: 'neon',
    bpm: 140,
    length: 16,
    backing: 'loop',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 11]),
      ...line('sample', 7, [8], 'clap'),
      ...line('hat', 2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
      ...melody('bass', [
        [0, 7],
        [11, 7],
        [14, 4],
      ]),
    ],
  },
  {
    id: 'dembow',
    name: 'Dembow',
    themeId: 'funk',
    bpm: 96,
    length: 16,
    backing: 'song',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 4, 8, 12]),
      ...line('snare', 4, [3, 6, 11, 14]),
      ...line('bass', 7, [0, 8]),
    ],
  },
  {
    id: 'funk',
    name: 'Funk Groove',
    themeId: 'funk',
    bpm: 104,
    length: 16,
    backing: 'song',
    scale: null,
    cells: [
      ...line('kick', 6, [0, 6, 10]),
      ...line('snare', 5, [4, 12]),
      ...line('snare', 1, [9]),
      ...line('hat', 2, [0, 2, 4, 6, 8, 10, 12, 14]),
      ...melody('bass', [
        [0, 7],
        [3, 5],
        [6, 7],
        [10, 4],
        [14, 6],
      ]),
    ],
  },
  {
    id: 'korobeiniki',
    name: 'Korobeiniki (Tetris tune)',
    themeId: 'chiptune',
    bpm: 80,
    length: 32,
    backing: 'off',
    scale: 'a-minor',
    cells: [
      ...melody('synth', [
        [0, 3],
        [2, 6],
        [3, 5],
        [4, 4],
        [6, 5],
        [7, 6],
        [8, 7],
        [10, 7],
        [11, 5],
        [12, 3],
        [14, 4],
        [15, 5],
        [16, 6],
        [19, 5],
        [20, 4],
        [22, 3],
        [24, 5],
        [26, 7],
        [28, 7],
      ]),
      ...melody('bass', [
        [2, 3],
        [4, 3],
        [16, 3],
        [20, 3],
        [8, 0],
        [12, 0],
        [24, 0],
        [28, 0],
      ]),
      ...line('kick', 1, [0, 8, 16, 24]),
      ...line('snare', 2, [4, 12, 20, 28]),
    ],
  },
];

export function presetById(id: string): Preset | null {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}
