export interface SamplePreset {
  id: string;
  name: string;
  midiNote: number; // General MIDI drum note used for MIDI export
}

export const SAMPLE_PRESETS: readonly SamplePreset[] = [
  { id: 'clap', name: 'Clap', midiNote: 39 },
  { id: 'cowbell', name: 'Cowbell', midiNote: 56 },
  { id: 'rim', name: 'Rimshot', midiNote: 37 },
  { id: 'tom', name: 'Tom', midiNote: 45 },
  { id: 'shaker', name: 'Shaker', midiNote: 70 },
  { id: 'zap', name: 'Zap', midiNote: 81 },
];

export const DEFAULT_SAMPLE = 'clap';

export function sampleById(id: string | null): SamplePreset {
  return SAMPLE_PRESETS.find((preset) => preset.id === id) ?? (SAMPLE_PRESETS[0] as SamplePreset);
}

// Semitones above the recorded pitch, indexed by board row (row 7 is the bottom).
const ROW_SEMITONES = [12, 11, 9, 7, 5, 4, 2, 0];

export function rateForRow(row: number): number {
  const semitones = ROW_SEMITONES[Math.max(0, Math.min(7, Math.round(row)))] ?? 0;
  return Math.pow(2, semitones / 12);
}
