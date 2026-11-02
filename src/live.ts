import { GRID_ROWS } from './config';

export type LiveMode = 'paint' | 'live' | 'rec';

const MODES: readonly LiveMode[] = ['paint', 'live', 'rec'];

export function nextLiveMode(mode: LiveMode): LiveMode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? 'paint';
}

// A plays the bottom row and K the top row.
export const LIVE_KEY_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'] as const;

export function liveRowForCode(code: string): number | null {
  const index = (LIVE_KEY_CODES as readonly string[]).indexOf(code);
  return index === -1 ? null : GRID_ROWS - 1 - index;
}

// Picks the step a live hit belongs to: the step being heard, or the next one when the hit
// lands in the second half of the step.
export function nearestStep(
  hitTime: number,
  markTime: number,
  markStep: number,
  nextStep: number,
  stepDuration: number,
): number {
  return hitTime - markTime >= stepDuration / 2 ? nextStep : markStep;
}
