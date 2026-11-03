export interface SamplePreset {
  id: string;
  name: string;
  midiNote: number; // General MIDI drum note used for MIDI export
  color: string; // PIXEL_COLORS key for the Sample icon and notes
}

export const SAMPLE_PRESETS: readonly SamplePreset[] = [
  { id: 'clap', name: 'Clap', midiNote: 39, color: '9' },
  { id: 'cowbell', name: 'Cowbell', midiNote: 56, color: 'a' },
  { id: 'rim', name: 'Rimshot', midiNote: 37, color: '7' },
  { id: 'tom', name: 'Tom', midiNote: 45, color: 'c' },
  { id: 'shaker', name: 'Shaker', midiNote: 70, color: 'g' },
  { id: 'zap', name: 'Zap', midiNote: 81, color: 'e' },
];

export const DEFAULT_SAMPLE = 'clap';

// The sound the player records or loads. It is not one of SAMPLE_PRESETS and is never
// chosen by a share link.
export const USER_SAMPLE: SamplePreset = { id: 'mine', name: 'Mine', midiNote: 39, color: '5' };

export function sampleById(id: string | null, hasUserSample = false): SamplePreset {
  if (hasUserSample && id === USER_SAMPLE.id) return USER_SAMPLE;
  return SAMPLE_PRESETS.find((preset) => preset.id === id) ?? (SAMPLE_PRESETS[0] as SamplePreset);
}

// The preset or user sample a note's id refers to. Unknown ids fall back to Clap; 'mine'
// always resolves to USER_SAMPLE, so its notes keep their color before the sound loads.
export function sampleForNote(id: string | undefined): SamplePreset {
  return id === USER_SAMPLE.id ? USER_SAMPLE : sampleById(id ?? null);
}

// Semitones above the recorded pitch, indexed by board row (row 7 is the bottom).
const ROW_SEMITONES = [12, 11, 9, 7, 5, 4, 2, 0];

export function rateForRow(row: number): number {
  const semitones = ROW_SEMITONES[Math.max(0, Math.min(7, Math.round(row)))] ?? 0;
  return Math.pow(2, semitones / 12);
}
