import type { Instrument } from './sequencer';

export type MixChannel = Instrument | 'backing';
export const MIX_CHANNELS: readonly MixChannel[] = [
  'kick', 'hat', 'synth', 'snare', 'sample', 'bass', 'backing',
];
export type MixSettings = Record<MixChannel, number>; // each 0 to 1

export const DEFAULT_MIX: Readonly<MixSettings> = {
  kick: 1, hat: 1, synth: 1, snare: 1, sample: 1, bass: 1, backing: 1,
};

// Reads saved settings. Missing or unreadable values fall back to full volume.
export function parseMix(stored: string | null): MixSettings {
  let data: unknown = null;
  try {
    data = stored === null ? null : JSON.parse(stored);
  } catch {
    data = null;
  }
  const source = (typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_MIX };
  for (const channel of MIX_CHANNELS) {
    const value = source[channel];
    if (typeof value === 'number' && Number.isFinite(value)) result[channel] = Math.max(0, Math.min(1, value));
  }
  return result;
}

// Slider position to gain. Squared, so the slider feels even to the ear; 1 stays 1.
export function mixGain(level: number): number {
  const clamped = Math.max(0, Math.min(1, level));
  return clamped * clamped;
}
