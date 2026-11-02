import { describe, expect, it } from 'vitest';
import { liveRowForCode, nearestStep, nextLiveMode } from '../src/live';

describe('live modes', () => {
  it('cycles paint to live to rec and back to paint', () => {
    expect(nextLiveMode('paint')).toBe('live');
    expect(nextLiveMode('live')).toBe('rec');
    expect(nextLiveMode('rec')).toBe('paint');
  });
});

describe('live keys', () => {
  it('plays the bottom row from A and the top row from K', () => {
    expect(liveRowForCode('KeyA')).toBe(7);
    expect(liveRowForCode('KeyK')).toBe(0);
  });

  it('returns null for a key that is not a live key', () => {
    expect(liveRowForCode('KeyQ')).toBeNull();
  });
});

describe('nearestStep', () => {
  it('keeps a hit near the start of the step on that step', () => {
    expect(nearestStep(10.0, 10.0, 3, 4, 0.125)).toBe(3);
  });

  it('moves a hit in the second half of the step to the next step', () => {
    expect(nearestStep(10.07, 10.0, 3, 4, 0.125)).toBe(4);
  });

  it('wraps to the next step on the last step of the pattern', () => {
    expect(nearestStep(10.05, 10.0, 15, 0, 0.125)).toBe(15);
  });
});
