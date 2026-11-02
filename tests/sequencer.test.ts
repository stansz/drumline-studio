import { describe, expect, it } from 'vitest';
import { Sequencer } from '../src/sequencer';

describe('Sequencer', () => {
  it('adds a note to an empty cell', () => {
    const sequencer = new Sequencer();
    expect(sequencer.set('kick', 2, 3)).toBe(true);
    expect(sequencer.cells).toEqual([{ instrument: 'kick', col: 2, row: 3 }]);
  });

  it('returns false and changes nothing for the same instrument', () => {
    const sequencer = new Sequencer();
    sequencer.set('kick', 2, 3);
    expect(sequencer.set('kick', 2, 3)).toBe(false);
    expect(sequencer.cells).toHaveLength(1);
  });

  it('replaces a different instrument in place', () => {
    const sequencer = new Sequencer();
    sequencer.set('kick', 2, 3);
    expect(sequencer.set('hat', 2, 3)).toBe(true);
    expect(sequencer.cells).toEqual([{ instrument: 'hat', col: 2, row: 3 }]);
  });

  it('returns false outside the grid', () => {
    const sequencer = new Sequencer();
    expect(sequencer.set('kick', -1, 0)).toBe(false);
    expect(sequencer.set('kick', 16, 0)).toBe(false);
    expect(sequencer.set('kick', 0, 8)).toBe(false);
    expect(sequencer.set('kick', 0.5, 0)).toBe(false);
    expect(sequencer.cells).toHaveLength(0);
  });

  it('erases a note, then reports nothing left to erase', () => {
    const sequencer = new Sequencer();
    sequencer.set('hat', 1, 2);
    expect(sequencer.erase(1, 2)).toBe(true);
    expect(sequencer.erase(1, 2)).toBe(false);
    expect(sequencer.cells).toHaveLength(0);
  });

  it('clears the pattern', () => {
    const sequencer = new Sequencer();
    sequencer.set('kick', 0, 0);
    sequencer.set('hat', 1, 1);
    sequencer.clear();
    expect(sequencer.cells).toHaveLength(0);
  });

  it('plays each note only on its own column step', () => {
    for (const instrument of ['hat', 'kick'] as const) {
      const sequencer = new Sequencer();
      sequencer.set(instrument, 4, 0);
      const played: number[] = [];
      for (let i = 0; i < 32; i += 1) {
        const step = sequencer.stepIndex;
        if (sequencer.step().length > 0) played.push(step);
      }
      expect(played).toEqual([4, 4]);
    }
  });

  it('returns notes in one column together, in cells order', () => {
    const sequencer = new Sequencer();
    sequencer.set('hat', 1, 5);
    sequencer.set('kick', 1, 2);
    sequencer.step();
    expect(sequencer.step()).toEqual([
      { instrument: 'hat', col: 1, row: 5 },
      { instrument: 'kick', col: 1, row: 2 },
    ]);
  });

  it('wraps the step index from 15 to 0', () => {
    const sequencer = new Sequencer();
    for (let i = 0; i < 15; i += 1) sequencer.step();
    expect(sequencer.stepIndex).toBe(15);
    sequencer.step();
    expect(sequencer.stepIndex).toBe(0);
  });

  it('rewinds to the first step', () => {
    const sequencer = new Sequencer();
    for (let i = 0; i < 7; i += 1) sequencer.step();
    sequencer.rewind();
    expect(sequencer.stepIndex).toBe(0);
  });
});
