import { describe, expect, it } from 'vitest';
import { STEPS_PER_BAR } from '../src/config';
import { layerLevels } from '../src/music';
import { FILL_STEPS, describeSwing, sectionAt, sectionIndexAt, sectionLevels, songMap } from '../src/song';

const barStep = (bar: number): number => bar * STEPS_PER_BAR;

describe('song sections', () => {
  it('maps the bars through the song form and repeats', () => {
    const verses = [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23];
    const choruses = [8, 9, 10, 11, 12, 13, 14, 15, 24, 25, 26, 27, 28, 29, 30, 31];
    const breaks = [32, 33, 34, 35];
    for (const bar of verses) {
      expect(sectionAt(barStep(bar), true).kind).toBe('verse');
    }
    for (const bar of choruses) {
      expect(sectionAt(barStep(bar), true).kind).toBe('chorus');
    }
    for (const bar of breaks) {
      expect(sectionAt(barStep(bar), true).kind).toBe('break');
    }
    const repeat = sectionAt(barStep(36), true);
    expect(repeat.kind).toBe('verse');
    expect(repeat.bar).toBe(0);
  });

  it('marks only the last bar of each section as a fill', () => {
    for (let bar = 0; bar < 36; bar += 1) {
      expect(sectionAt(barStep(bar), true).fill).toBe([7, 15, 23, 31, 35].includes(bar));
    }
  });

  it('reports the bar within the section and the section length', () => {
    const section = sectionAt(barStep(10), true);
    expect(section.kind).toBe('chorus');
    expect(section.bar).toBe(2);
    expect(section.bars).toBe(8);
  });

  it('plays a plain verse loop with sections off', () => {
    for (const step of [0, 1, 16, 400, -5]) {
      expect(sectionAt(step, false)).toEqual({ kind: 'verse', bar: 0, bars: 1, fill: false });
    }
  });

  it('starts a verse at bar 0 for a negative step', () => {
    const section = sectionAt(-5, true);
    expect(section.kind).toBe('verse');
    expect(section.bar).toBe(0);
  });

  it('leaves the verse levels alone', () => {
    const levels = layerLevels(0.35);
    expect(sectionLevels(levels, 'verse')).toBe(levels);
  });

  it('keeps the pad and drops bass and arp for the break', () => {
    const levels = layerLevels(1);
    expect(sectionLevels(levels, 'break')).toEqual({ pad: levels.pad, bass: 0, arp: 0 });
  });

  it('raises the chorus layers without lowering any or passing 1', () => {
    for (const amount of [0, 0.1, 0.35, 0.5, 0.75, 1]) {
      const levels = layerLevels(amount);
      const chorus = sectionLevels(levels, 'chorus');
      expect(chorus.pad).toBe(Math.min(1, levels.pad + 0.15));
      expect(chorus.bass).toBe(Math.max(levels.bass, 0.6));
      expect(chorus.arp).toBe(Math.max(levels.arp, 0.6));
      expect(chorus.pad).toBeLessThanOrEqual(1);
      expect(chorus.bass).toBeLessThanOrEqual(1);
      expect(chorus.arp).toBeLessThanOrEqual(1);
      expect(chorus.pad).toBeGreaterThanOrEqual(levels.pad);
      expect(chorus.bass).toBeGreaterThanOrEqual(levels.bass);
      expect(chorus.arp).toBeGreaterThanOrEqual(levels.arp);
    }
  });

  it('runs the fill on the last four sixteenths', () => {
    expect(FILL_STEPS).toEqual([12, 13, 14, 15]);
  });
});

describe('song map and info helpers', () => {
  it('maps the song form with the bar each section starts on', () => {
    expect(songMap()).toHaveLength(5);
    expect(songMap()).toEqual([
      { kind: 'verse', bars: 8, startBar: 0 },
      { kind: 'chorus', bars: 8, startBar: 8 },
      { kind: 'verse', bars: 8, startBar: 16 },
      { kind: 'chorus', bars: 8, startBar: 24 },
      { kind: 'break', bars: 4, startBar: 32 },
    ]);
    expect(songMap().map((entry) => entry.startBar)).toEqual([0, 8, 16, 24, 32]);
  });

  it('finds the section index for a step and repeats after the last bar', () => {
    expect(sectionIndexAt(0)).toBe(0);
    expect(sectionIndexAt(barStep(8))).toBe(1);
    expect(sectionIndexAt(barStep(33))).toBe(4);
    expect(sectionIndexAt(barStep(36))).toBe(0);
  });

  it('describes swing as straight or as a percentage', () => {
    expect(describeSwing(0)).toBe('Straight');
    expect(describeSwing(0.22)).toBe('Swung 22%');
  });
});
