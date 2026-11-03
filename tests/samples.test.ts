import { describe, expect, it } from 'vitest';
import { DEFAULT_SAMPLE, SAMPLE_PRESETS, USER_SAMPLE, rateForRow, sampleById } from '../src/samples';
import { PIXEL_COLORS } from '../src/sprites';

describe('samples', () => {
  it('has unique, well-formed preset ids', () => {
    const ids = SAMPLE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,24}$/);
  });

  it('finds a preset by id and falls back to Clap', () => {
    expect(sampleById('cowbell').name).toBe('Cowbell');
    expect(sampleById('nope')).toBe(sampleById('clap'));
    expect(sampleById(null)).toBe(sampleById('clap'));
  });

  it('only finds the user sample when one exists', () => {
    expect(sampleById('mine')).toBe(sampleById('clap'));
    expect(sampleById('mine', true)).toBe(USER_SAMPLE);
    expect(sampleById('cowbell', true)).toBe(sampleById('cowbell'));
  });

  it('gives every sound a pixel color', () => {
    for (const preset of [...SAMPLE_PRESETS, USER_SAMPLE]) {
      expect(PIXEL_COLORS[preset.color]).toBeTypeOf('string');
    }
  });

  it('gives the presets different colors', () => {
    const colors = SAMPLE_PRESETS.map((preset) => preset.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('uses a preset for the default sample', () => {
    expect(SAMPLE_PRESETS.some((preset) => preset.id === DEFAULT_SAMPLE)).toBe(true);
  });

  it('sets the playback rate by row', () => {
    expect(rateForRow(7)).toBe(1);
    expect(rateForRow(0)).toBeCloseTo(2, 10);
    expect(rateForRow(4)).toBeCloseTo(2 ** (5 / 12), 10);
    for (let row = 7; row > 0; row -= 1) {
      expect(rateForRow(row - 1)).toBeGreaterThan(rateForRow(row));
    }
    expect(rateForRow(-3)).toBe(rateForRow(0));
    expect(rateForRow(12)).toBe(rateForRow(7));
  });
});
