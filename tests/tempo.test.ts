import { describe, expect, it } from 'vitest';
import { BPM, MAX_BPM, MIN_BPM, parseBpm } from '../src/config';

describe('parseBpm', () => {
  it('falls back to the base tempo for missing or unreadable text', () => {
    expect(parseBpm(null)).toBe(BPM);
    expect(parseBpm('')).toBe(BPM);
    expect(parseBpm('  ')).toBe(BPM);
    expect(parseBpm('fast')).toBe(BPM);
  });

  it('rounds to a whole BPM', () => {
    expect(parseBpm('97.6')).toBe(98);
    expect(parseBpm(' 133 ')).toBe(133);
  });

  it('keeps the tempo between the minimum and maximum', () => {
    expect(MIN_BPM).toBe(40);
    expect(MAX_BPM).toBe(300);
    expect(parseBpm('5')).toBe(MIN_BPM);
    expect(parseBpm('-80')).toBe(MIN_BPM);
    expect(parseBpm('999')).toBe(MAX_BPM);
  });
});
