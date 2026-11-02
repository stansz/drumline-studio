export interface FxSettings {
  filter: number; // -1 (low-pass, darkest) to 1 (high-pass, thinnest); 0 is off
  delay: number; // 0 to 1
  reverb: number; // 0 to 1
  crush: number; // 0 to 1
}

export const DEFAULT_FX: Readonly<FxSettings> = { filter: 0, delay: 0, reverb: 0, crush: 0 };

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

// Reads saved settings. Anything missing or unreadable falls back to off.
export function parseFx(stored: string | null): FxSettings {
  let data: unknown = null;
  try {
    data = stored === null ? null : JSON.parse(stored);
  } catch {
    data = null;
  }
  const source = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const read = (key: keyof FxSettings, low: number): number => {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value) ? clamp(value, low, 1) : 0;
  };
  return {
    filter: read('filter', -1),
    delay: read('delay', 0),
    reverb: read('reverb', 0),
    crush: read('crush', 0),
  };
}

// Both filters stay in the chain; each is wide open unless the knob leans its way.
export function filterCutoffs(filter: number): { lowpassHz: number; highpassHz: number } {
  const amount = clamp(filter, -1, 1);
  return {
    lowpassHz: amount < 0 ? 20000 * Math.pow(0.01, -amount) : 20000,
    highpassHz: amount > 0 ? 20 * Math.pow(200, amount) : 20,
  };
}

export function crushMix(themeCrush: number, userCrush: number): number {
  return clamp(themeCrush + userCrush, 0, 1);
}

export const FX_DELAY_SEND = 0.5;
export const FX_REVERB_SEND = 0.8;
