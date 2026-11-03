import { describe, expect, it } from 'vitest';
import { randomPattern, seededRng } from '../src/random';
import type { Cell } from '../src/sequencer';

const STEPS = 16;
const ROWS = 8;

function position(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

describe('randomPattern', () => {
  it('gives the same seed the same pattern and different seeds different patterns', () => {
    expect(randomPattern(seededRng(1))).toEqual(randomPattern(seededRng(1)));
    expect(randomPattern(seededRng(1))).not.toEqual(randomPattern(seededRng(2)));
  });

  it('stays musical and inside the grid for 50 seeds', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const cells = randomPattern(seededRng(seed));
      const kicks = cells.filter((cell) => cell.instrument === 'kick');
      const kickSteps = new Set(kicks.map((cell) => cell.col));

      expect(cells).toContainEqual({ instrument: 'kick', col: 0, row: 6 });
      expect(cells).toContainEqual({ instrument: 'snare', col: 4, row: 5 });
      expect(cells).toContainEqual({ instrument: 'snare', col: 12, row: 5 });

      const positions = cells.map(position);
      expect(new Set(positions).size).toBe(positions.length);

      for (const cell of cells) {
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(STEPS);
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(ROWS);
        if (cell.instrument === 'sample') expect(cell.sample).toBe('clap');
      }

      const synth = cells.filter((cell) => cell.instrument === 'synth');
      expect(synth.length).toBeGreaterThanOrEqual(3);
      expect(synth.length).toBeLessThanOrEqual(6);

      const bass = cells.filter((cell) => cell.instrument === 'bass');
      const bassSteps = bass.map((cell) => cell.col);
      expect(new Set(bassSteps).size).toBe(bassSteps.length);
      for (const step of bassSteps) expect(kickSteps.has(step)).toBe(true);
    }
  });
});
