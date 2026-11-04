import { describe, expect, it } from 'vitest';
import {
  decodeShare,
  encodeShare,
  parsePattern,
  serializePattern,
  type SharedBeat,
} from '../src/pattern';
import type { Cell } from '../src/sequencer';

const ALL_INSTRUMENTS: Cell[] = [
  { instrument: 'kick', col: 0, row: 0 },
  { instrument: 'hat', col: 5, row: 2 },
  { instrument: 'synth', col: 17, row: 7 },
  { instrument: 'snare', col: 30, row: 7 },
  { instrument: 'sample', col: 31, row: 7 },
];

// The encoder writes base64url; tests build old links with the same encoding.
function base64url(bytes: readonly number[]): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('serializePattern / parsePattern', () => {
  it('round-trips a 32-step pattern with every instrument', () => {
    const pattern = { length: 32 as const, cells: ALL_INSTRUMENTS };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
  });

  it('round-trips a 64-step pattern', () => {
    const pattern = {
      length: 64 as const,
      cells: [{ instrument: 'kick' as const, col: 63, row: 7 }],
    };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
  });

  it('reads a saved 48-step length', () => {
    expect(parsePattern(JSON.stringify({ v: 1, length: 48, cells: [] }))?.length).toBe(48);
  });

  it('returns null for missing or unreadable text', () => {
    expect(parsePattern(null)).toBeNull();
    expect(parsePattern('nope')).toBeNull();
    expect(parsePattern('{"v":2,"cells":[]}')).toBeNull();
    expect(parsePattern('{"v":1}')).toBeNull();
  });

  it('drops invalid cells and keeps the first note on a position', () => {
    const text = JSON.stringify({
      v: 1,
      length: 16,
      cells: [
        ['bogus', 1, 1],
        ['kick', 64, 0],
        ['kick', 0, 8],
        ['kick', 1.5, 0],
        ['kick', 2, 2],
        ['hat', 2, 2],
      ],
    });
    expect(parsePattern(text)).toEqual({
      length: 16,
      cells: [{ instrument: 'kick', col: 2, row: 2 }],
    });
  });

  it('falls back to 16 steps for an unknown length', () => {
    expect(parsePattern('{"v":1,"length":99,"cells":[]}')?.length).toBe(16);
  });

  it('accepts a sample cell', () => {
    const pattern = {
      length: 16 as const,
      cells: [{ instrument: 'sample' as const, col: 3, row: 4 }],
    };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
  });

  it('round-trips each sample cell sound, plus other instruments', () => {
    const pattern = {
      length: 16 as const,
      cells: [
        { instrument: 'kick' as const, col: 0, row: 0 },
        { instrument: 'sample' as const, col: 1, row: 1, sample: 'clap' },
        { instrument: 'sample' as const, col: 2, row: 2, sample: 'tom' },
        { instrument: 'sample' as const, col: 3, row: 3, sample: 'mine' },
      ],
    };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
  });

  it('parses an old save with no sample on a sample cell', () => {
    const saved = parsePattern('{"v":1,"length":16,"cells":[["sample",0,0]]}');
    expect(saved?.cells).toHaveLength(1);
    expect(saved?.cells[0]?.sample).toBeUndefined();
  });

  it('drops a bad sample id but keeps the cell', () => {
    const saved = parsePattern('{"v":1,"length":16,"cells":[["sample",0,0,"BAD!"]]}');
    expect(saved?.cells).toHaveLength(1);
    expect(saved?.cells[0]?.sample).toBeUndefined();
  });

  it('round-trips a scale', () => {
    const pattern = { length: 16 as const, cells: [], scale: 'a-minor' };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
  });

  it('drops an invalid scale but keeps the pattern', () => {
    const saved = parsePattern('{"v":1,"length":16,"cells":[],"scale":"BAD!"}');
    expect(saved).toEqual({ length: 16, cells: [] });
    expect(saved?.scale).toBeUndefined();
  });
});

describe('encodeShare / decodeShare', () => {
  it('round-trips the length, tempo, theme, sample, and cells', () => {
    const beat: SharedBeat = {
      length: 32,
      bpm: 128,
      themeId: 'neon',
      sampleId: 'cowbell',
      cells: ALL_INSTRUMENTS,
    };
    expect(decodeShare(encodeShare(beat))).toEqual(beat);
  });

  it('produces a v7 link', () => {
    expect(
      encodeShare({ length: 16, bpm: 120, themeId: 'lofi', sampleId: 'clap', cells: [] }),
    ).toMatch(
      /^v7\.(16|32|48|64)\.\d+\.[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]*\.[a-z0-9_-]*\.[A-Za-z0-9_-]*$/,
    );
  });

  it('writes a 64-step pattern as v7.64 and reads it back', () => {
    const beat: SharedBeat = {
      length: 64,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [{ instrument: 'bass', col: 63, row: 0 }],
    };
    const link = encodeShare(beat);
    expect(link.startsWith('v7.64.')).toBe(true);
    const decoded = decodeShare(link);
    expect(decoded?.length).toBe(64);
    expect(decoded?.cells).toEqual(beat.cells);
  });

  it('returns null for a v5 link with length 64', () => {
    const link = encodeShare({
      length: 32,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [],
    });
    expect(decodeShare(link.replace('v7.32.', 'v5.64.'))).toBeNull();
  });

  it('still decodes a v5 link with length 32', () => {
    const link = encodeShare({
      length: 32,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [],
    });
    expect(decodeShare(link.replace('v7.32.', 'v5.32.'))?.length).toBe(32);
  });

  it('writes a 48-step pattern as v7.48 and reads it back', () => {
    const beat: SharedBeat = {
      length: 48,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [{ instrument: 'bass', col: 47, row: 0 }],
    };
    const link = encodeShare(beat);
    expect(link.startsWith('v7.48.')).toBe(true);
    const decoded = decodeShare(link);
    expect(decoded?.length).toBe(48);
    expect(decoded?.cells).toEqual(beat.cells);
  });

  it('returns null for a v6 link with length 48', () => {
    const link = encodeShare({
      length: 32,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [],
    });
    expect(decodeShare(link.replace('v7.32.', 'v6.48.'))).toBeNull();
  });

  it('still decodes a v6 link with length 64', () => {
    const link = encodeShare({
      length: 64,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [],
    });
    expect(decodeShare(link.replace('v7.64.', 'v6.64.'))?.length).toBe(64);
  });

  it('round-trips a v5 link with a scale', () => {
    const beat: SharedBeat = {
      length: 32,
      bpm: 80,
      themeId: 'chiptune',
      sampleId: 'clap',
      scale: 'a-minor',
      cells: ALL_INSTRUMENTS,
    };
    expect(decodeShare(encodeShare(beat))).toEqual(beat);
  });

  it('writes an empty scale for the theme scale and round-trips it', () => {
    const beat: SharedBeat = {
      length: 16,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [{ instrument: 'kick', col: 0, row: 0 }],
    };
    const link = encodeShare(beat);
    expect(link.split('.')[5]).toBe('');
    const decoded = decodeShare(link);
    expect(decoded?.scale).toBeUndefined();
    expect(decoded?.cells).toEqual(beat.cells);
  });

  it('still decodes a v4 link with the six-instrument encoding', () => {
    // Three bytes per cell: the step, row * 6 + instrument index (sample is index 4), and the
    // sample-table index.
    const cells = base64url([2, 3 * 6 + 4, 0]);
    const beat = decodeShare(`v4.16.120.neon.clap.clap.${cells}`);
    expect(beat?.cells).toEqual([{ instrument: 'sample', col: 2, row: 3, sample: 'clap' }]);
    expect(beat?.scale).toBeUndefined();
  });

  it('returns null for a v5 link with a bad scale id', () => {
    expect(decodeShare(`v5.16.120.neon.clap.BAD!.clap.${base64url([0, 0, 0])}`)).toBeNull();
  });

  it('round-trips a bass cell alongside sample cells with different sounds', () => {
    const beat: SharedBeat = {
      length: 32,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [
        { instrument: 'sample', col: 0, row: 1, sample: 'clap' },
        { instrument: 'sample', col: 2, row: 2, sample: 'tom' },
        { instrument: 'bass', col: 31, row: 7 },
      ],
    };
    expect(decodeShare(encodeShare(beat))).toEqual(beat);
  });

  it('decodes a v3 link with the old five-instrument encoding', () => {
    // Three bytes per cell: the step, row * 5 + instrument index (sample is index 4), and the
    // sample-table index.
    const cells = base64url([2, 3 * 5 + 4, 0]);
    const beat = decodeShare(`v3.16.120.neon.cowbell.clap.${cells}`);
    expect(beat?.cells).toEqual([{ instrument: 'sample', col: 2, row: 3, sample: 'clap' }]);
  });

  it('round-trips each sample cell sound in a link', () => {
    const beat: SharedBeat = {
      length: 16,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [
        { instrument: 'kick', col: 0, row: 0 },
        { instrument: 'sample', col: 1, row: 1, sample: 'clap' },
        { instrument: 'sample', col: 2, row: 2, sample: 'tom' },
        { instrument: 'sample', col: 3, row: 3, sample: 'mine' },
      ],
    };
    expect(decodeShare(encodeShare(beat))).toEqual(beat);
  });

  it('round-trips a pattern with no sample cells with an empty table', () => {
    const beat: SharedBeat = {
      length: 16,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [{ instrument: 'kick', col: 0, row: 0 }],
    };
    const link = encodeShare(beat);
    expect(link.split('.')[6]).toBe('');
    expect(decodeShare(link)?.cells).toEqual(beat.cells);
  });

  it('decodes sample cells of a v2 link with that link sample', () => {
    // Two bytes per cell: the step, then row * 5 + instrument index (sample is index 4).
    const cells = base64url([2, 3 * 5 + 4, 0, 0]);
    const beat = decodeShare(`v2.16.120.neon.cowbell.${cells}`);
    expect(beat?.sampleId).toBe('cowbell');
    expect(beat?.cells).toEqual([
      { instrument: 'sample', col: 2, row: 3, sample: 'cowbell' },
      { instrument: 'kick', col: 0, row: 0 },
    ]);
  });

  it('round-trips an empty pattern', () => {
    const beat: SharedBeat = {
      length: 16,
      bpm: 120,
      themeId: 'neon',
      sampleId: 'clap',
      cells: [],
    };
    expect(decodeShare(encodeShare(beat))?.cells).toEqual([]);
  });

  it('clamps the tempo to the allowed range', () => {
    expect(decodeShare('v1.16.999.neon.')?.bpm).toBe(300);
  });

  it('still decodes a v1 link', () => {
    const beat = decodeShare('v1.32.120.chiptune.ABwEHAgcDBwCAh8P');
    expect(beat?.length).toBe(32);
    expect(beat?.bpm).toBe(120);
    expect(beat?.themeId).toBe('chiptune');
    expect(beat?.sampleId).toBe('clap');
    expect(beat?.cells).toEqual(
      expect.arrayContaining([
        { instrument: 'kick', col: 0, row: 7 },
        { instrument: 'kick', col: 4, row: 7 },
        { instrument: 'kick', col: 8, row: 7 },
        { instrument: 'kick', col: 12, row: 7 },
        { instrument: 'synth', col: 2, row: 0 },
        { instrument: 'snare', col: 31, row: 3 },
      ]),
    );
    expect(beat?.cells).toHaveLength(6);
  });

  it('returns null for a v2 link with a bad sample id', () => {
    expect(decodeShare('v2.16.120.neon.BAD!.')).toBeNull();
  });

  it('returns null for a v3 link with a bad sample table entry', () => {
    expect(decodeShare('v3.16.120.neon.clap.BAD!.')).toBeNull();
  });

  it('returns null for a v3 link whose cell bytes are not a multiple of three', () => {
    expect(decodeShare(`v3.16.120.neon.clap..${base64url([0, 0])}`)).toBeNull();
  });

  it('returns null for malformed links', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('v2.16.120.neon.')).toBeNull();
    expect(decodeShare('v1.20.120.neon.')).toBeNull();
    expect(decodeShare('v1.16.120.NEON!.')).toBeNull();
    expect(decodeShare('v1.16.120.neon.@@')).toBeNull();
    expect(decodeShare('v1.16.120.neon.AA')).toBeNull();
  });
});
