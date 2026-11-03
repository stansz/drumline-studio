import { describe, expect, it } from 'vitest';
import { VOICE_LIMITS } from '../src/config';
import { pickVoices } from '../src/music';
import type { Instrument } from '../src/sequencer';

function notes(instrument: Instrument, count: number) {
  return Array.from({ length: count }, (_, row) => ({ instrument, row }));
}

describe('pickVoices', () => {
  it('keeps every note under the limits', () => {
    const chord = [
      ...notes('kick', 2),
      ...notes('hat', 1),
      ...notes('synth', 3),
      ...notes('snare', 2),
      ...notes('sample', 2),
    ];
    expect(pickVoices(chord)).toHaveLength(10);
  });

  it('limits each instrument on its own', () => {
    const chord = [
      ...notes('kick', 8),
      ...notes('hat', 8),
      ...notes('synth', 8),
      ...notes('snare', 8),
      ...notes('sample', 8),
    ];
    const voices = pickVoices(chord);
    for (const instrument of ['kick', 'hat', 'synth', 'snare', 'sample'] as const) {
      expect(voices.filter((voice) => voice.instrument === instrument)).toHaveLength(
        VOICE_LIMITS[instrument],
      );
    }
    expect(VOICE_LIMITS.snare).toBe(2);
    expect(VOICE_LIMITS.sample).toBe(2);
  });

  it('never returns a note twice', () => {
    const voices = pickVoices(notes('synth', 8));
    expect(new Set(voices).size).toBe(voices.length);
  });

  it('spreads a big chord across its pitches', () => {
    const rows = pickVoices(notes('synth', 9)).map((voice) => voice.row);
    expect(rows).toEqual([0, 3, 6]);
  });

  it('handles an empty step', () => {
    expect(pickVoices([])).toEqual([]);
  });
});
