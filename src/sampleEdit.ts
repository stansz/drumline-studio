export const MAX_SAMPLE_SECONDS = 2;
const SILENCE = 0.02;
const FADE_SECONDS = 0.01;
const PEAK = 0.9;

// Averages channels into one.
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const length = Math.max(0, ...channels.map((channel) => channel.length));
  const mono = new Float32Array(length);
  if (channels.length === 0) return mono;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
  }
  return mono;
}

// The first and last sample louder than the silence threshold, or null if it's all silence.
export function soundBounds(data: Float32Array, threshold = SILENCE): { start: number; end: number } | null {
  let start = -1;
  let end = -1;
  for (let i = 0; i < data.length; i += 1) {
    if (Math.abs(data[i] ?? 0) >= threshold) {
      if (start === -1) start = i;
      end = i;
    }
  }
  return start === -1 ? null : { start, end: end + 1 };
}

// Trims silence, keeps at most MAX_SAMPLE_SECONDS, fades the end out, and normalizes the
// peak. Returns null when there is no sound.
export function prepareSample(channels: readonly Float32Array[], sampleRate: number): Float32Array | null {
  const mono = mixToMono(channels);
  const bounds = soundBounds(mono);
  if (!bounds) return null;
  const length = Math.min(bounds.end - bounds.start, Math.floor(MAX_SAMPLE_SECONDS * sampleRate));
  const result = mono.slice(bounds.start, bounds.start + length);
  const fade = Math.min(result.length, Math.floor(FADE_SECONDS * sampleRate));
  for (let i = 0; i < fade; i += 1) {
    const index = result.length - 1 - i;
    result[index] = (result[index] ?? 0) * (i / fade);
  }
  let max = 0;
  for (const value of result) max = Math.max(max, Math.abs(value));
  if (max > 0) for (let i = 0; i < result.length; i += 1) result[i] = (result[i] ?? 0) * (PEAK / max);
  return result;
}
