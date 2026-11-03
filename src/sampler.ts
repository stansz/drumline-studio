import { SAMPLE_PRESETS } from './samples';

const SAMPLE_SECONDS = 0.6;

type Recipe = (ctx: OfflineAudioContext, noise: AudioBuffer) => void;

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * SAMPLE_SECONDS), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function burst(
  ctx: OfflineAudioContext,
  noise: AudioBuffer,
  start: number,
  decay: number,
  type: BiquadFilterType,
  hz: number,
  q: number,
  level: number,
): void {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, 0);
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + decay + 0.01);
}

function tone(
  ctx: OfflineAudioContext,
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  sweep: number,
  decay: number,
  level: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, 0);
  osc.frequency.exponentialRampToValueAtTime(toHz, sweep);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, 0);
  gain.gain.exponentialRampToValueAtTime(0.0001, decay);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(decay + 0.01);
}

const RECIPES: Record<string, Recipe> = {
  clap: (ctx, noise) => {
    for (const start of [0, 0.011, 0.022]) burst(ctx, noise, start, 0.012, 'bandpass', 1500, 1.5, 0.9);
    burst(ctx, noise, 0.03, 0.18, 'bandpass', 1300, 1.2, 0.6);
  },
  cowbell: (ctx) => {
    for (const hz of [540, 800]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = hz;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, 0);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.35);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.36);
    }
  },
  rim: (ctx, noise) => {
    tone(ctx, 'triangle', 1700, 1600, 0.02, 0.04, 0.9);
    burst(ctx, noise, 0, 0.012, 'highpass', 3000, 0.7, 0.5);
  },
  tom: (ctx) => {
    tone(ctx, 'sine', 170, 105, 0.25, 0.4, 1);
  },
  shaker: (ctx, noise) => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.1);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    source.stop(0.11);
  },
  zap: (ctx) => {
    tone(ctx, 'sine', 1200, 60, 0.15, 0.18, 0.9);
  },
};

// Scales a buffer so its loudest sample is at `peak`.
function normalize(buffer: AudioBuffer, peak = 0.9): AudioBuffer {
  const data = buffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i] ?? 0));
  if (max > 0) {
    const scale = peak / max;
    for (let i = 0; i < data.length; i += 1) data[i] = (data[i] ?? 0) * scale;
  }
  return buffer;
}

export async function renderSamples(sampleRate: number): Promise<Map<string, AudioBuffer>> {
  const result = new Map<string, AudioBuffer>();
  for (const preset of SAMPLE_PRESETS) {
    const recipe = RECIPES[preset.id];
    if (!recipe) continue;
    const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * SAMPLE_SECONDS), sampleRate);
    recipe(ctx, noiseBuffer(ctx));
    result.set(preset.id, normalize(await ctx.startRendering()));
  }
  return result;
}
