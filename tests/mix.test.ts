import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX, MIX_CHANNELS, mixGain, parseMix } from '../src/mix';
import { INSTRUMENTS } from '../src/sequencer';

describe('parseMix', () => {
  it('falls back to full volume for missing or unreadable settings', () => {
    expect(parseMix(null)).toEqual(DEFAULT_MIX);
    expect(parseMix('')).toEqual(DEFAULT_MIX);
    expect(parseMix('x')).toEqual(DEFAULT_MIX);
    expect(parseMix('[1]')).toEqual(DEFAULT_MIX);
  });

  it('clamps saved values and drops anything not a number', () => {
    expect(parseMix('{"kick":0.5,"hat":-1,"synth":3,"snare":"x"}')).toEqual({
      kick: 0.5,
      hat: 0,
      synth: 1,
      snare: 1,
      sample: 1,
      bass: 1,
      backing: 1,
    });
  });
});

describe('MIX_CHANNELS', () => {
  it('lists the instruments in order, then the backing', () => {
    expect(MIX_CHANNELS).toEqual([...INSTRUMENTS, 'backing']);
  });

  it('starts Bass at full volume', () => {
    expect(DEFAULT_MIX.bass).toBe(1);
  });
});

describe('mixGain', () => {
  it('passes full level through unchanged and silences zero', () => {
    expect(mixGain(1)).toBe(1);
    expect(mixGain(0)).toBe(0);
  });

  it('follows a squared curve', () => {
    expect(mixGain(0.5)).toBeCloseTo(0.25, 6);
  });

  it('clamps values outside the slider range', () => {
    expect(mixGain(-2)).toBe(0);
    expect(mixGain(2)).toBe(1);
  });
});
