import type { Instrument } from './sequencer';

export const GRID_COLS = 16;
export const GRID_ROWS = 8;
export const STEPS_PER_BAR = 16;
export const MAX_STEPS = 32;

export const BPM = 120;
export const stepSeconds = (bpm: number): number => 60 / bpm / 4;
export const MIN_BPM = 40;
export const MAX_BPM = 300;

// Reads a tempo from text such as a saved setting or the tempo field. Anything unreadable
// falls back to the base tempo; anything else is rounded and kept within range.
export function parseBpm(text: string | null): number {
  const value = text === null || text.trim() === '' ? Number.NaN : Number(text);
  if (!Number.isFinite(value)) return BPM;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value)));
}

// How many of each sound can start on one step, because each one costs audio CPU.
// Notes past the limit are skipped.
export const VOICE_LIMITS: Record<Instrument, number> = { kick: 2, hat: 2, snare: 2, synth: 3 };

export const INSTRUMENT_INFO: Record<Instrument, { name: string; description: string }> = {
  kick: { name: 'Kick', description: 'Low drum. Higher rows tune it up.' },
  hat: { name: 'Hat', description: 'Noise tick. Higher rows sound brighter.' },
  snare: { name: 'Snare', description: 'Noise crack with a short body. Higher rows sound tighter.' },
  synth: { name: 'Synth', description: "Plays the theme's scale. Higher rows play higher notes." },
};

export const MUSIC_CHORDS = [
  { name: 'Am7', pad: [57, 60, 64, 67], bass: 45 },
  { name: 'Fmaj7', pad: [53, 57, 60, 64], bass: 41 },
  { name: 'Cadd9', pad: [55, 60, 62, 64], bass: 48 },
  { name: 'Gsus', pad: [55, 60, 62, 67], bass: 43 },
];

export const BASS_STEPS = [0, 6, 10];
export const ARP_STEPS = [0, 2, 4, 6, 8, 10, 12, 14];

export const MIX = {
  pad: 0.16,
  bass: 0.3,
  arp: 0.08,
  kick: 0.85,
  hat: 0.2,
  snare: 0.32,
  synth: 0.2,
  metronome: 0.04,
  reverbSend: 0.3,
  delaySend: 0.22,
  delayFeedback: 0.35,
  duckAmount: 0.45,
  duckRelease: 0.18,
} as const;
