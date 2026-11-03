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
  { instrument: 'snare', col: 31, row: 7 },
];

describe('serializePattern / parsePattern', () => {
  it('round-trips a 32-step pattern with every instrument', () => {
    const pattern = { length: 32 as const, cells: ALL_INSTRUMENTS };
    expect(parsePattern(serializePattern(pattern))).toEqual(pattern);
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
        ['kick', 32, 0],
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
});

describe('encodeShare / decodeShare', () => {
  it('round-trips the length, tempo, theme, and cells', () => {
    const beat: SharedBeat = {
      length: 32,
      bpm: 128,
      themeId: 'neon',
      cells: ALL_INSTRUMENTS,
    };
    expect(decodeShare(encodeShare(beat))).toEqual(beat);
  });

  it('produces a v1 link', () => {
    expect(encodeShare({ length: 16, bpm: 120, themeId: 'lofi', cells: [] })).toMatch(
      /^v1\.(16|32)\.\d+\.[a-z0-9-]+\.[A-Za-z0-9_-]*$/,
    );
  });

  it('round-trips an empty pattern', () => {
    const beat: SharedBeat = { length: 16, bpm: 120, themeId: 'neon', cells: [] };
    expect(decodeShare(encodeShare(beat))?.cells).toEqual([]);
  });

  it('clamps the tempo to the allowed range', () => {
    expect(decodeShare('v1.16.999.neon.')?.bpm).toBe(300);
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
