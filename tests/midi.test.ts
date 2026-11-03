import { describe, expect, it } from 'vitest';
import { MIDI_PPQ, TICKS_PER_STEP, patternToMidi } from '../src/midi';
import type { Cell } from '../src/sequencer';

const SCALE = [60, 62, 64, 65, 67, 69, 71, 72];
const SAMPLE_NOTE_FOR = (sample: string | undefined): number => (sample === 'tom' ? 45 : 39);

function bytesOf(cells: Cell[], length: number): number[] {
  return Array.from(patternToMidi(cells, length, 120, SCALE, SAMPLE_NOTE_FOR));
}

function find(haystack: number[], needle: number[]): number {
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    if (needle.every((byte, j) => haystack[i + j] === byte)) return i;
  }
  return -1;
}

function readVariableLength(bytes: number[], start: number): { value: number; next: number } {
  let value = 0;
  let i = start;
  while (i < bytes.length) {
    const byte = bytes[i] ?? 0;
    value = (value << 7) | (byte & 0x7f);
    i += 1;
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: i };
}

// Walks the track's delta times and returns their sum.
function totalDelta(bytes: number[]): number {
  let i = 22;
  let total = 0;
  while (i < bytes.length) {
    const delta = readVariableLength(bytes, i);
    total += delta.value;
    i = delta.next;
    const status = bytes[i];
    if (status === undefined) break;
    if (status === 0xff) {
      const type = bytes[i + 1] ?? 0;
      const length = readVariableLength(bytes, i + 2);
      i = length.next + length.value;
      if (type === 0x2f) break;
    } else {
      i += 3;
    }
  }
  return total;
}

describe('patternToMidi', () => {
  it('writes a MIDI header and a track chunk', () => {
    const bytes = bytesOf([], 16);
    expect(bytes.slice(0, 4)).toEqual([0x4d, 0x54, 0x68, 0x64]);
    expect(bytes.slice(14, 18)).toEqual([0x4d, 0x54, 0x72, 0x6b]);
  });

  it('sets the header division to 96 ticks per quarter note', () => {
    const bytes = bytesOf([], 16);
    expect(((bytes[12] ?? 0) << 8) | (bytes[13] ?? 0)).toBe(MIDI_PPQ);
  });

  it('writes the tempo, the drum note, and the synth note', () => {
    const cells: Cell[] = [
      { instrument: 'kick', col: 0, row: 0 },
      { instrument: 'synth', col: 4, row: 7 },
    ];
    const bytes = bytesOf(cells, 16);
    const tempoAt = find(bytes, [0xff, 0x51, 0x03]);
    expect(tempoAt).toBeGreaterThanOrEqual(0);
    expect(bytes.slice(tempoAt + 3, tempoAt + 6)).toEqual([0x07, 0xa1, 0x20]);
    expect(find(bytes, [0x99, 36, 100])).toBeGreaterThanOrEqual(0);
    expect(find(bytes, [0x90, 60, 100])).toBeGreaterThanOrEqual(0);
  });

  it('writes the sample note on the drum channel', () => {
    const bytes = bytesOf([{ instrument: 'sample', col: 0, row: 7 }], 16);
    expect(find(bytes, [0x99, 39, 100])).toBeGreaterThanOrEqual(0);
  });

  it('writes each sample note from its own sound', () => {
    const bytes = bytesOf(
      [
        { instrument: 'sample', col: 0, row: 7, sample: 'tom' },
        { instrument: 'sample', col: 4, row: 7, sample: 'clap' },
      ],
      16,
    );
    expect(find(bytes, [0x99, 45, 100])).toBeGreaterThanOrEqual(0);
    expect(find(bytes, [0x99, 39, 100])).toBeGreaterThanOrEqual(0);
  });

  it('writes a track length that matches the track bytes', () => {
    const bytes = bytesOf([{ instrument: 'snare', col: 7, row: 3 }], 16);
    const size =
      ((bytes[18] ?? 0) << 24) |
      ((bytes[19] ?? 0) << 16) |
      ((bytes[20] ?? 0) << 8) |
      (bytes[21] ?? 0);
    expect(size).toBe(bytes.length - 22);
  });

  it('ends the track exactly at the pattern length', () => {
    for (const length of [16, 32]) {
      const bytes = bytesOf([{ instrument: 'kick', col: 0, row: 0 }], length);
      expect(totalDelta(bytes)).toBe(length * TICKS_PER_STEP);
      expect(bytes.slice(-3)).toEqual([0xff, 0x2f, 0x00]);
    }
  });

  it('leaves out cells at or past the pattern length', () => {
    const bytes = bytesOf([{ instrument: 'kick', col: 20, row: 0 }], 16);
    expect(bytes).not.toContain(0x99);
  });
});
