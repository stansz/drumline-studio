import { describe, expect, it } from 'vitest';
import {
  crushMix,
  DEFAULT_FX,
  filterCutoffs,
  parseFx,
} from '../src/fx';

describe('parseFx', () => {
  it('falls back to off for missing or unreadable settings', () => {
    expect(parseFx(null)).toEqual(DEFAULT_FX);
    expect(parseFx('')).toEqual(DEFAULT_FX);
    expect(parseFx('not json')).toEqual(DEFAULT_FX);
    expect(parseFx('[1]')).toEqual(DEFAULT_FX);
  });

  it('clamps saved values and drops anything not a number', () => {
    expect(parseFx('{"filter":-3,"delay":0.5,"reverb":2,"crush":"x"}')).toEqual({
      filter: -1,
      delay: 0.5,
      reverb: 1,
      crush: 0,
    });
  });

  it('keeps each setting at or above its own floor', () => {
    expect(parseFx('{"delay":-0.4}').delay).toBe(0);
  });
});

describe('filterCutoffs', () => {
  it('leaves both filters wide open at center', () => {
    expect(filterCutoffs(0)).toEqual({ lowpassHz: 20000, highpassHz: 20 });
  });

  it('closes the low-pass fully at the darkest end', () => {
    const { lowpassHz, highpassHz } = filterCutoffs(-1);
    expect(lowpassHz).toBeCloseTo(200, 6);
    expect(highpassHz).toBe(20);
  });

  it('opens the high-pass fully at the thinnest end', () => {
    const { lowpassHz, highpassHz } = filterCutoffs(1);
    expect(highpassHz).toBeCloseTo(4000, 6);
    expect(lowpassHz).toBe(20000);
  });

  it('sweeps the low-pass halfway at half left', () => {
    expect(filterCutoffs(-0.5).lowpassHz).toBeCloseTo(2000, 6);
  });
});

describe('crushMix', () => {
  it('adds the user crush on top of the theme crush', () => {
    expect(crushMix(0.3, 0.5)).toBeCloseTo(0.8, 6);
  });

  it('never goes past fully crushed or below off', () => {
    expect(crushMix(0.7, 0.6)).toBe(1);
    expect(crushMix(0, 0)).toBe(0);
  });
});
