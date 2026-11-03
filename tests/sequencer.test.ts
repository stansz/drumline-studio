import { describe, expect, it } from 'vitest';
import { INSTRUMENTS, Sequencer } from '../src/sequencer';

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
    expect(sequencer.set('kick', 64, 0)).toBe(false);
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

  it('keeps columns up to 63 in the grid', () => {
    const sequencer = new Sequencer();
    expect(sequencer.set('kick', 63, 0)).toBe(true);
    expect(sequencer.set('kick', 64, 0)).toBe(false);
  });

  it('defaults to 16 steps and wraps from 15 to 0', () => {
    const sequencer = new Sequencer();
    expect(sequencer.length).toBe(16);
    for (let i = 0; i < 15; i += 1) sequencer.step();
    expect(sequencer.stepIndex).toBe(15);
    sequencer.step();
    expect(sequencer.stepIndex).toBe(0);
  });

  it('plays 32 steps after setLength(32)', () => {
    const sequencer = new Sequencer();
    sequencer.setLength(32);
    sequencer.set('hat', 20, 0);
    for (let i = 0; i < 20; i += 1) sequencer.step();
    expect(sequencer.stepIndex).toBe(20);
    expect(sequencer.step()).toEqual([{ instrument: 'hat', col: 20, row: 0 }]);
    for (let i = 21; i < 32; i += 1) sequencer.step();
    expect(sequencer.stepIndex).toBe(0);
  });

  it('plays 64 steps after setLength(64) and wraps from 63 to 0', () => {
    const sequencer = new Sequencer();
    sequencer.setLength(64);
    const visited: number[] = [];
    for (let i = 0; i < 64; i += 1) {
      visited.push(sequencer.stepIndex);
      sequencer.step();
    }
    expect(visited).toEqual(Array.from({ length: 64 }, (_, i) => i));
    expect(visited).toContain(63);
    expect(sequencer.stepIndex).toBe(0);
  });

  it('keeps notes past the length but does not play them', () => {
    const sequencer = new Sequencer();
    sequencer.set('hat', 20, 0);
    expect(sequencer.activeCells()).toEqual([]);
    expect(sequencer.cells).toHaveLength(1);
    for (let i = 0; i < 32; i += 1) {
      expect(sequencer.step().map((note) => note.col)).not.toContain(20);
    }
  });

  it('resets the step index when the length shrinks below it', () => {
    const sequencer = new Sequencer();
    sequencer.setLength(32);
    for (let i = 0; i < 20; i += 1) sequencer.step();
    expect(sequencer.stepIndex).toBe(20);
    sequencer.setLength(16);
    expect(sequencer.stepIndex).toBe(0);
  });

  it('rewinds to the first step', () => {
    const sequencer = new Sequencer();
    for (let i = 0; i < 7; i += 1) sequencer.step();
    sequencer.rewind();
    expect(sequencer.stepIndex).toBe(0);
  });

  it('repeats the steps inside a loop', () => {
    const sequencer = new Sequencer();
    expect(sequencer.setLoop(4, 7)).toBe(true);
    sequencer.stepIndex = 4;
    const visited: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      visited.push(sequencer.stepIndex);
      sequencer.step();
    }
    expect(visited).toEqual([4, 5, 6, 7, 4, 5, 6, 7]);
  });

  it('jumps into the loop from outside it', () => {
    const sequencer = new Sequencer();
    sequencer.setLoop(4, 7);
    sequencer.stepIndex = 10;
    sequencer.step();
    expect(sequencer.stepIndex).toBe(4);
  });

  it('accepts only a loop of at least two steps inside the pattern', () => {
    const sequencer = new Sequencer();
    expect(sequencer.setLoop(5, 5)).toBe(false);
    expect(sequencer.setLoop(-1, 3)).toBe(false);
    expect(sequencer.setLoop(3, 16)).toBe(false);
    expect(sequencer.loop).toBeNull();
    expect(sequencer.setLoop(9, 2)).toBe(true);
    expect(sequencer.loop).toEqual({ start: 2, end: 9 });
  });

  it('rewinds to the loop start, and to the beginning without a loop', () => {
    const sequencer = new Sequencer();
    sequencer.setLoop(4, 7);
    for (let i = 0; i < 3; i += 1) sequencer.step();
    sequencer.rewind();
    expect(sequencer.stepIndex).toBe(4);
    sequencer.clearLoop();
    sequencer.rewind();
    expect(sequencer.stepIndex).toBe(0);
  });

  it('clears a loop that no longer fits when the length shrinks', () => {
    const sequencer = new Sequencer();
    sequencer.setLength(32);
    sequencer.setLoop(20, 23);
    sequencer.setLength(16);
    expect(sequencer.loop).toBeNull();
  });

  it('skips a note once, because it already sounded live', () => {
    const sequencer = new Sequencer();
    sequencer.set('kick', 2, 4);
    sequencer.stepIndex = 2;
    sequencer.skipOnce(2, 4);
    expect(sequencer.step()).toEqual([]);
    for (let i = 0; i < 15; i += 1) sequencer.step();
    expect(sequencer.step()).toEqual([{ instrument: 'kick', col: 2, row: 4 }]);
  });

  it('stores the sound a sample note was painted with', () => {
    const sequencer = new Sequencer();
    expect(sequencer.set('sample', 0, 0, 'clap')).toBe(true);
    expect(sequencer.cells).toEqual([
      { instrument: 'sample', col: 0, row: 0, sample: 'clap' },
    ]);
  });

  it('changes a sample note when its sound changes, and reports no change otherwise', () => {
    const sequencer = new Sequencer();
    sequencer.set('sample', 0, 0, 'clap');
    expect(sequencer.set('sample', 0, 0, 'clap')).toBe(false);
    expect(sequencer.set('sample', 0, 0, 'tom')).toBe(true);
    expect(sequencer.cells).toEqual([
      { instrument: 'sample', col: 0, row: 0, sample: 'tom' },
    ]);
  });

  it('ignores a sample for other instruments and clears it on replacement', () => {
    const sequencer = new Sequencer();
    expect(sequencer.set('kick', 1, 0, 'tom')).toBe(true);
    expect(sequencer.cells).toEqual([{ instrument: 'kick', col: 1, row: 0 }]);
    sequencer.set('sample', 1, 0, 'tom');
    expect(sequencer.set('kick', 1, 0, 'tom')).toBe(true);
    expect(sequencer.cells).toEqual([{ instrument: 'kick', col: 1, row: 0 }]);
  });

  it('returns the sound on each sample note of a step', () => {
    const sequencer = new Sequencer();
    sequencer.set('sample', 0, 0, 'tom');
    expect(sequencer.step()).toEqual([
      { instrument: 'sample', col: 0, row: 0, sample: 'tom' },
    ]);
  });

  it('lists Bass as the last instrument', () => {
    expect(INSTRUMENTS[INSTRUMENTS.length - 1]).toBe('bass');
  });

  it('plays a bass note on its own step', () => {
    const sequencer = new Sequencer();
    sequencer.set('bass', 6, 2);
    for (let i = 0; i < 6; i += 1) sequencer.step();
    expect(sequencer.step()).toEqual([{ instrument: 'bass', col: 6, row: 2 }]);
  });
});
