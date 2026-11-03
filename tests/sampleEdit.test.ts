import { describe, expect, it } from 'vitest';
import { MAX_SAMPLE_SECONDS, mixToMono, prepareSample, soundBounds } from '../src/sampleEdit';

function signal(parts: readonly [number, number][]): Float32Array {
  const length = parts.reduce((total, [count]) => total + count, 0);
  const data = new Float32Array(length);
  let index = 0;
  for (const [count, value] of parts) {
    data.fill(value, index, index + count);
    index += count;
  }
  return data;
}

describe('sampleEdit', () => {
  it('averages channels into one', () => {
    const left = new Float32Array([1, 0, -1]);
    const right = new Float32Array([0, 1, 1]);
    expect(Array.from(mixToMono([left, right]))).toEqual([0.5, 0.5, 0]);
  });

  it('returns an empty array for no channels', () => {
    expect(Array.from(mixToMono([]))).toEqual([]);
  });

  it('finds the first and last sound', () => {
    expect(soundBounds(new Float32Array(8))).toBeNull();
    const data = new Float32Array([0, 0, 0.5, 0, -0.3, 0, 0]);
    expect(soundBounds(data)).toEqual({ start: 2, end: 5 });
  });

  it('returns null for silence', () => {
    expect(prepareSample([new Float32Array(100)], 1000)).toBeNull();
  });

  it('trims silence, fades the end, and normalizes the peak', () => {
    const data = signal([
      [100, 0],
      [500, 0.25],
      [100, 0],
    ]);
    const prepared = prepareSample([data], 1000);
    expect(prepared).not.toBeNull();
    const result = prepared as Float32Array;
    expect(result.length).toBe(500);
    let peak = 0;
    for (const value of result) peak = Math.max(peak, Math.abs(value));
    expect(peak).toBeCloseTo(0.9, 6);
    expect(result[result.length - 1]).toBe(0);
  });

  it('caps the kept length at MAX_SAMPLE_SECONDS', () => {
    const data = new Float32Array(1000).fill(0.5);
    const result = prepareSample([data], 100);
    expect(result).not.toBeNull();
    expect((result as Float32Array).length).toBe(MAX_SAMPLE_SECONDS * 100);
  });

  it('mixes stereo before trimming', () => {
    const left = new Float32Array([0.5, 0, 0, 0]);
    const right = new Float32Array([0, 0, 0, 0.5]);
    const result = prepareSample([left, right], 1000);
    expect(result).not.toBeNull();
    const data = result as Float32Array;
    expect(data.length).toBe(4);
    expect(data[0]).toBeCloseTo(0.9, 6);
  });
});
