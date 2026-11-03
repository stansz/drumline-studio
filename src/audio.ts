import { BPM, MIX, STEPS_PER_BAR, stepSeconds } from './config';
import {
  crushMix,
  DEFAULT_FX,
  filterCutoffs,
  FX_DELAY_SEND,
  FX_REVERB_SEND,
  type FxSettings,
} from './fx';
import { mixGain, MIX_CHANNELS, type MixChannel, type MixSettings } from './mix';
import { arpNote, chordForStep, midiToHz, type layerLevels } from './music';
import { renderSamples } from './sampler';
import { DEFAULT_SAMPLE, USER_SAMPLE, rateForRow } from './samples';
import { INSTRUMENTS, type Instrument } from './sequencer';
import {
  DEFAULT_THEME,
  DRUM_PARTS,
  type DrumPart,
  type NoiseKind,
  type Theme,
  type Wave,
} from './themes';

const CRUSH_STEPS = 24;
const CRUSH_POINTS = 4097;
const CHIP_NOISE_HOLD = 14;
const CRACKLE_SECONDS = 3;
const METAL_HZ = [80, 120, 166.4, 217.2, 271.6, 328.4];
const PULSE_DUTY = 0.125;
const PULSE_HARMONICS = 32;
const SOFT_CLIP_KNEE = 0.7;
const SOFT_CLIP_CEILING = 0.95;
const SOFT_CLIP_POINTS = 4097;

export const MAX_VOLUME = 100;

// Squared, because hearing is closer to logarithmic and a linear slider feels loud until the end.
export function volumeGain(percent: number): number {
  return (percent / MAX_VOLUME) ** 2;
}

export function parseVolume(stored: string | null): number {
  const value = stored === null || stored === '' ? Number.NaN : Number(stored);
  if (!Number.isFinite(value)) return MAX_VOLUME;
  return Math.max(0, Math.min(MAX_VOLUME, Math.round(value)));
}

// Linear below the knee, then eases toward the ceiling. A WaveShaper holds the last curve value
// for any louder input, so this caps the output however much the limiter lets through.
export function softClipCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(SOFT_CLIP_POINTS);
  const headroom = SOFT_CLIP_CEILING - SOFT_CLIP_KNEE;
  for (let i = 0; i < curve.length; i += 1) {
    const input = (i / (curve.length - 1)) * 2 - 1;
    const level = Math.abs(input);
    const shaped =
      level <= SOFT_CLIP_KNEE
        ? level
        : SOFT_CLIP_KNEE + headroom * Math.tanh((level - SOFT_CLIP_KNEE) / headroom);
    curve[i] = Math.sign(input) * shaped;
  }
  return curve;
}

export function crushCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(CRUSH_POINTS);
  for (let i = 0; i < curve.length; i += 1) {
    const input = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.round(input * CRUSH_STEPS) / CRUSH_STEPS;
  }
  return curve;
}

// Fixed seed, so the generated buffers never consume Math.random.
function seededNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function clampRow(row: number): number {
  return Math.max(0, Math.min(7, row));
}

export class Audio_ {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly fxLowpass: BiquadFilterNode;
  private readonly fxHighpass: BiquadFilterNode;
  private readonly towerBus: GainNode;
  private readonly musicBus: GainNode;
  private readonly musicTrim: GainNode;
  private readonly instrumentLevels: Record<Instrument, GainNode>;
  private readonly instrumentDelaySends: Record<Instrument, GainNode>;
  private readonly backingLevel: GainNode;
  private readonly backingDelaySend: GainNode;
  private readonly fxBus: GainNode;
  private readonly delay: DelayNode;
  private readonly delaySend: GainNode;
  private readonly fxDelaySend: GainNode;
  private readonly fxReverbSend: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly analyserData: Float32Array<ArrayBuffer>;
  private readonly noiseBuffers: Record<NoiseKind, AudioBuffer>;
  private readonly reverb: ConvolverNode;
  private readonly reverbImpulses = new Map<number, AudioBuffer>();
  private readonly musicReverbSend: GainNode;
  private readonly towerReverbSend: GainNode;
  private readonly delayFeedback: GainNode;
  private readonly crushDry: GainNode;
  private readonly crushWet: GainNode;
  private readonly trim: GainNode;
  private readonly volume: GainNode;
  private readonly crackleGain: GainNode;
  private readonly pulseWave: PeriodicWave;
  private readonly masterLevel = 0.8;
  private theme: Theme = DEFAULT_THEME;
  private fx: FxSettings = { ...DEFAULT_FX };
  private samples = new Map<string, AudioBuffer>();
  private sampleId: string = DEFAULT_SAMPLE;
  private muted = false;
  private lastDuckTime = -1;
  private lastStepDuration = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.masterLevel;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.7;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;

    const softClip = ctx.createWaveShaper();
    softClip.curve = softClipCurve();
    softClip.oversample = '4x';

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyserData = new Float32Array(this.analyser.fftSize);

    // A WaveShaper curve can only be set once, so themes crossfade this path in and out.
    const crusher = ctx.createWaveShaper();
    crusher.curve = crushCurve();
    this.crushDry = ctx.createGain();
    this.crushWet = ctx.createGain();
    this.crushDry.gain.value = 1;
    this.crushWet.gain.value = 0;
    this.trim = ctx.createGain();
    this.trim.gain.value = 1;
    this.master.connect(this.trim);
    this.trim.connect(this.crushDry);
    this.trim.connect(crusher);
    crusher.connect(this.crushWet);
    this.crushDry.connect(this.filter);
    this.crushWet.connect(this.filter);

    this.fxLowpass = ctx.createBiquadFilter();
    this.fxLowpass.type = 'lowpass';
    this.fxLowpass.frequency.value = 20000;
    this.fxLowpass.Q.value = 1.2;
    this.fxHighpass = ctx.createBiquadFilter();
    this.fxHighpass.type = 'highpass';
    this.fxHighpass.frequency.value = 20;
    this.fxHighpass.Q.value = 1.2;
    this.filter.connect(this.fxLowpass);
    this.fxLowpass.connect(this.fxHighpass);
    this.fxHighpass.connect(limiter);

    limiter.connect(softClip);
    softClip.connect(this.analyser);
    // After the limiter, so the slider changes the level without changing the mix.
    this.volume = ctx.createGain();
    this.analyser.connect(this.volume);
    this.volume.connect(ctx.destination);

    this.towerBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicTrim = ctx.createGain();
    this.fxBus = ctx.createGain();
    this.towerBus.gain.value = 1;
    this.musicBus.gain.value = 1;
    this.musicTrim.gain.value = 1;
    this.fxBus.gain.value = 1;
    this.towerBus.connect(this.master);
    this.musicBus.connect(this.musicTrim);
    this.fxBus.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.reverbImpulse(DEFAULT_THEME.space.reverbSeconds);
    this.reverb.connect(this.fxBus);
    this.musicReverbSend = ctx.createGain();
    this.towerReverbSend = ctx.createGain();
    this.musicReverbSend.gain.value = MIX.reverbSend;
    this.towerReverbSend.gain.value = MIX.reverbSend;
    this.musicReverbSend.connect(this.reverb);
    this.towerBus.connect(this.towerReverbSend);
    this.towerReverbSend.connect(this.reverb);

    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = stepSeconds(BPM) * 3;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = MIX.delayFeedback;
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.fxBus);
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = MIX.delaySend;
    this.delaySend.connect(this.delay);

    // The mixer scales each instrument and the backing before their buses, and each part's
    // delay send by the same amount, so turning a part down turns its echo down too.
    this.instrumentLevels = {} as Record<Instrument, GainNode>;
    this.instrumentDelaySends = {} as Record<Instrument, GainNode>;
    for (const instrument of INSTRUMENTS) {
      const level = ctx.createGain();
      level.gain.value = 1;
      level.connect(this.towerBus);
      this.instrumentLevels[instrument] = level;
      const send = ctx.createGain();
      send.gain.value = 1;
      send.connect(this.delaySend);
      this.instrumentDelaySends[instrument] = send;
    }
    this.backingLevel = ctx.createGain();
    this.backingLevel.gain.value = 1;
    this.musicTrim.connect(this.backingLevel);
    this.backingLevel.connect(this.master);
    this.backingLevel.connect(this.musicReverbSend);
    this.backingDelaySend = ctx.createGain();
    this.backingDelaySend.gain.value = 1;
    this.backingDelaySend.connect(this.delaySend);

    this.fxDelaySend = ctx.createGain();
    this.fxDelaySend.gain.value = 0;
    this.towerBus.connect(this.fxDelaySend);
    this.fxDelaySend.connect(this.delay);
    this.fxReverbSend = ctx.createGain();
    this.fxReverbSend.gain.value = 0;
    this.towerBus.connect(this.fxReverbSend);
    this.fxReverbSend.connect(this.reverb);

    const length = Math.max(1, Math.floor(ctx.sampleRate));
    const white = ctx.createBuffer(1, length, ctx.sampleRate);
    const whiteData = white.getChannelData(0);
    for (let i = 0; i < whiteData.length; i += 1) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    const chipRandom = seededNoise(7);
    const chip = ctx.createBuffer(1, length, ctx.sampleRate);
    const chipData = chip.getChannelData(0);
    let held = 0;
    for (let i = 0; i < chipData.length; i += 1) {
      if (i % CHIP_NOISE_HOLD === 0) held = chipRandom() * 2 - 1;
      chipData[i] = held;
    }

    const metal = ctx.createBuffer(1, length, ctx.sampleRate);
    const metalData = metal.getChannelData(0);
    for (let i = 0; i < metalData.length; i += 1) {
      let sum = 0;
      for (const hz of METAL_HZ) {
        sum += Math.sign(Math.sin((2 * Math.PI * hz * 16 * i) / ctx.sampleRate));
      }
      metalData[i] = sum / METAL_HZ.length;
    }
    this.noiseBuffers = { white, chip, metal };

    const real = new Float32Array(PULSE_HARMONICS + 1);
    const imag = new Float32Array(PULSE_HARMONICS + 1);
    for (let n = 1; n <= PULSE_HARMONICS; n += 1) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * PULSE_DUTY);
    }
    this.pulseWave = ctx.createPeriodicWave(real, imag);

    const crackleRandom = seededNoise(11);
    const crackle = ctx.createBuffer(
      1,
      Math.max(1, Math.floor(ctx.sampleRate * CRACKLE_SECONDS)),
      ctx.sampleRate,
    );
    const crackleData = crackle.getChannelData(0);
    for (let i = 0; i < crackleData.length; i += 1) {
      const hiss = (crackleRandom() * 2 - 1) * 0.02;
      const pop = crackleRandom() < 0.0004 ? (crackleRandom() * 2 - 1) * 0.7 : 0;
      crackleData[i] = hiss + pop;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackle;
    crackleSource.loop = true;
    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    crackleSource.connect(this.crackleGain);
    this.crackleGain.connect(this.master);
    crackleSource.start();
  }

  private createReverbImpulse(seconds: number): AudioBuffer {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        const decay = Math.exp((-4 * i) / data.length);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    return impulse;
  }

  private reverbImpulse(seconds: number): AudioBuffer {
    const cached = this.reverbImpulses.get(seconds);
    if (cached) return cached;
    const impulse = this.createReverbImpulse(seconds);
    this.reverbImpulses.set(seconds, impulse);
    return impulse;
  }

  private setWave(osc: OscillatorNode, wave: Wave): void {
    if (wave === 'pulse') {
      osc.setPeriodicWave(this.pulseWave);
    } else {
      osc.type = wave;
    }
  }

  private wobble(target: AudioParam, time: number, end: number): void {
    const cents = this.theme.chord.wobbleCents;
    if (cents <= 0) return;
    const lfo = this.ctx.createOscillator();
    const depth = this.ctx.createGain();
    lfo.frequency.value = 3.2;
    depth.gain.value = cents;
    lfo.connect(depth);
    depth.connect(target);
    lfo.start(time);
    lfo.stop(end);
  }

  async loadSamples(): Promise<void> {
    const rendered = await renderSamples(this.ctx.sampleRate);
    const user = this.samples.get(USER_SAMPLE.id);
    if (user) rendered.set(USER_SAMPLE.id, user);
    this.samples = rendered;
  }

  // Puts the player's own sample in the sample map under its id, or removes it.
  setUserSample(id: string, data: Float32Array | null, sampleRate: number): void {
    if (!data) {
      this.samples.delete(id);
      return;
    }
    const buffer = this.ctx.createBuffer(1, data.length, sampleRate);
    buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    this.samples.set(id, buffer);
  }

  decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
    return this.ctx.decodeAudioData(bytes);
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  setSample(id: string): void {
    this.sampleId = id;
  }

  // Plays the current sample at its recorded pitch right away, for the sampler panel.
  auditionSample(): void {
    this.playSample(7, this.ctx.currentTime, 1);
  }

  playNote(instrument: Instrument, row: number, time: number, voiceCount: number): void {
    const baseLevel = 1 / Math.sqrt(Math.max(1, voiceCount));
    const level = baseLevel * (0.9 + Math.random() * 0.2);
    if (instrument === 'kick') {
      if (time !== this.lastDuckTime) {
        this.lastDuckTime = time;
        this.musicBus.gain.setValueAtTime(1 - MIX.duckAmount, time);
        this.musicBus.gain.linearRampToValueAtTime(1, time + MIX.duckRelease);
      }
      this.playKick(row, time, level);
    } else if (instrument === 'hat') {
      this.playHat(row, time, level);
    } else if (instrument === 'snare') {
      this.playSnare(row, time, level);
    } else if (instrument === 'sample') {
      this.playSample(row, time, level);
    } else {
      this.playSynth(row, time, level);
    }
  }

  private playSample(row: number, time: number, level: number): void {
    const buffer = this.samples.get(this.sampleId);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rateForRow(row);
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(MIX.sample * level, 0.0001);
    source.connect(gain);
    gain.connect(this.instrumentLevels.sample);
    source.start(time);
  }

  private playKick(row: number, time: number, level: number): void {
    const kick = this.theme.kick;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const base = kick.baseHz + (7 - clampRow(row)) * 4;
    this.setWave(osc, kick.wave);
    osc.frequency.setValueAtTime(base * kick.sweep, time);
    osc.frequency.exponentialRampToValueAtTime(base, time + kick.sweepTime);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIX.kick * level, 0.0001), time + kick.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + kick.decay);
    osc.connect(gain);
    gain.connect(this.instrumentLevels.kick);
    osc.start(time);
    osc.stop(time + kick.decay + 0.02);
    if (kick.click > 0) this.playClick(time, kick.click * level);
  }

  private playClick(time: number, level: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffers.white;
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(level, 0.0001), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.instrumentLevels.kick);
    source.start(time);
    source.stop(time + 0.02);
  }

  private playHat(row: number, time: number, level: number): void {
    const hat = this.theme.hat;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffers[hat.noise];
    const filter = this.ctx.createBiquadFilter();
    filter.type = hat.filter;
    filter.frequency.value = hat.filterHz + (7 - clampRow(row)) * 450;
    filter.Q.value = hat.q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(MIX.hat * hat.level * level, 0.0001), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + hat.decay);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentLevels.hat);
    source.start(time);
    source.stop(time + hat.decay + 0.01);
  }

  private playSnare(row: number, time: number, level: number): void {
    const kit = this.theme.drumKit;
    const lift = 7 - clampRow(row);
    const decay = kit.snareDecay * 1.5;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffers.white;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kit.snareHz + lift * 180;
    filter.Q.value = 0.9;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.max(MIX.snare * level, 0.0001), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.instrumentLevels.snare);
    source.start(time);
    source.stop(time + decay + 0.01);

    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(190 + lift * 14, time);
    body.frequency.exponentialRampToValueAtTime(130 + lift * 10, time + 0.06);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(Math.max(MIX.snare * 0.7 * level, 0.0001), time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    body.connect(bodyGain);
    bodyGain.connect(this.instrumentLevels.snare);
    body.start(time);
    body.stop(time + 0.1);
  }

  private playSynth(row: number, time: number, level: number): void {
    const synth = this.theme.synth;
    const first = this.ctx.createOscillator();
    const second = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const frequency = midiToHz(synth.scale[7 - clampRow(row)] ?? 57);
    this.setWave(first, synth.waves[0]);
    first.frequency.setValueAtTime(frequency, time);
    this.setWave(second, synth.waves[1]);
    second.frequency.setValueAtTime(frequency * synth.secondRatio, time);
    filter.type = synth.filter;
    filter.frequency.setValueAtTime(synth.filterHz + (7 - clampRow(row)) * 160, time);
    if (synth.filterEndHz !== null) {
      filter.frequency.exponentialRampToValueAtTime(synth.filterEndHz, time + synth.decay);
    }
    filter.Q.value = synth.q;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIX.synth * level, 0.0001), time + synth.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + synth.decay);
    first.connect(filter);
    second.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentLevels.synth);
    gain.connect(this.instrumentDelaySends.synth);
    first.start(time);
    second.start(time);
    first.stop(time + synth.decay + 0.02);
    second.stop(time + synth.decay + 0.02);
  }

  playMetronome(time: number, accent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1700 : 1050, time);
    gain.gain.setValueAtTime(accent ? MIX.metronome : MIX.metronome / 2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  playMusicStep(
    musicStep: number,
    time: number,
    duration: number,
    levels: ReturnType<typeof layerLevels>,
  ): void {
    const theme = this.theme;
    const local = musicStep % STEPS_PER_BAR;
    const swung = time + (local % 2 === 1 ? duration * theme.swing : 0);
    const chord = chordForStep(musicStep, theme.chords);

    if (theme.chord.steps.includes(local)) {
      if (theme.chord.style === 'hold') {
        this.playPad(chord.pad, time, duration * STEPS_PER_BAR, levels.pad);
      } else if (theme.chord.style === 'stab') {
        this.playStab(chord.pad, swung, levels.pad);
      }
    }

    if (levels.bass > 0 && theme.bass.steps.includes(local)) {
      const note = chord.bass + (theme.bass.octaveSteps.includes(local) ? 12 : 0);
      const ghost = theme.bass.ghostSteps.includes(local) ? 0.45 : 1;
      const sweepSteps = theme.bass.sweepBars * STEPS_PER_BAR;
      const sweep = sweepSteps > 0 ? (musicStep % sweepSteps) / sweepSteps : 0;
      this.playBass(note, swung, levels.bass * ghost, sweep);
    }

    const arpLevel = Math.max(levels.arp, theme.arp.minLevel);
    if (arpLevel > 0 && theme.arp.steps.includes(local)) {
      this.playArp(arpNote(musicStep, theme.chords, theme.arp.rate), swung, arpLevel);
    }

    for (const part of DRUM_PARTS) {
      if (theme.drums[part].includes(local)) this.playBackingDrum(part, swung, levels.pad);
    }
  }

  private playPad(notes: number[], time: number, duration: number, level: number): void {
    if (notes.length === 0) return;
    const chord = this.theme.chord;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = chord.cutoffHz;
    filter.connect(this.musicBus);

    const perNote = (MIX.pad * chord.level * level) / notes.length;
    const peak = Math.max(perNote, 0.0001);
    const attackEnd = time + 0.4;
    const sustainStart = Math.max(attackEnd, time + duration);
    const releaseEnd = time + duration + 0.5;

    for (const note of notes) {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(peak, attackEnd);
      gain.gain.setValueAtTime(peak, sustainStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
      gain.connect(filter);
      for (const detune of [-6, 6]) {
        const osc = this.ctx.createOscillator();
        this.setWave(osc, chord.wave);
        osc.frequency.setValueAtTime(midiToHz(note), time);
        osc.detune.setValueAtTime(detune, time);
        osc.connect(gain);
        osc.start(time);
        osc.stop(releaseEnd + 0.02);
      }
    }
  }

  private playStab(notes: number[], time: number, level: number): void {
    if (notes.length === 0) return;
    const chord = this.theme.chord;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = chord.cutoffHz;
    filter.connect(this.musicBus);
    filter.connect(this.backingDelaySend);

    const peak = Math.max((MIX.pad * chord.level * level) / Math.sqrt(notes.length), 0.0001);
    const end = time + chord.decay;
    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      this.setWave(osc, chord.wave);
      osc.frequency.setValueAtTime(midiToHz(note), time);
      this.wobble(osc.detune, time, end + 0.02);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(peak, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(time);
      osc.stop(end + 0.02);
    }
  }

  private playBass(note: number, time: number, level: number, sweep: number): void {
    const bass = this.theme.bass;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    this.setWave(osc, bass.wave);
    osc.frequency.setValueAtTime(midiToHz(note), time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(MIX.bass * bass.level * level, 0.0001),
      time + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + bass.decay);
    if (bass.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = bass.filter.q;
      filter.frequency.setValueAtTime(bass.filter.startHz * (1 + 2 * sweep), time);
      filter.frequency.exponentialRampToValueAtTime(bass.filter.endHz, time + bass.decay);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + bass.decay + 0.02);
  }

  private playArp(note: number, time: number, level: number): void {
    const arp = this.theme.arp;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    this.setWave(osc, arp.wave);
    osc.frequency.setValueAtTime(midiToHz(note), time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(MIX.arp * arp.level * level, 0.0001),
      time + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + arp.decay);
    osc.connect(gain);
    gain.connect(this.musicBus);
    gain.connect(this.backingDelaySend);
    osc.start(time);
    osc.stop(time + arp.decay + 0.02);
  }

  private playBackingDrum(part: DrumPart, time: number, level: number): void {
    const theme = this.theme;
    const peak = Math.max(theme.drumLevels[part] * level, 0.0001);
    const gain = this.ctx.createGain();
    gain.connect(this.musicBus);
    if (part === 'kick') {
      const osc = this.ctx.createOscillator();
      const base = theme.kick.baseHz;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * 2, time);
      osc.frequency.exponentialRampToValueAtTime(base, time + 0.08);
      gain.gain.setValueAtTime(peak, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.18);
      return;
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const decay = part === 'snare' ? theme.drumKit.snareDecay : theme.drumKit.hatDecay;
    if (part === 'snare') {
      source.buffer = this.noiseBuffers.white;
      filter.type = 'bandpass';
      filter.frequency.value = theme.drumKit.snareHz;
    } else {
      source.buffer = this.noiseBuffers[theme.hat.noise];
      filter.type = theme.hat.filter;
      filter.frequency.value = theme.hat.filterHz;
    }
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    source.connect(filter);
    filter.connect(gain);
    source.start(time);
    source.stop(time + decay + 0.01);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    const now = this.ctx.currentTime;
    const space = theme.space;
    this.musicReverbSend.gain.setTargetAtTime(space.reverbSend, now, 0.02);
    this.towerReverbSend.gain.setTargetAtTime(space.reverbSend, now, 0.02);
    this.delaySend.gain.setTargetAtTime(space.delaySend, now, 0.02);
    this.delayFeedback.gain.setTargetAtTime(space.delayFeedback, now, 0.02);
    this.filter.frequency.setTargetAtTime(space.toneHz, now, 0.02);
    this.applyCrush(now);
    this.trim.gain.setTargetAtTime(space.trim, now, 0.02);
    // The master trim also scales the backing, so divide it back out: the backing ends up at
    // musicTrim whatever the instruments' trim is.
    this.musicTrim.gain.setTargetAtTime(space.musicTrim / space.trim, now, 0.02);
    this.crackleGain.gain.setTargetAtTime(theme.crackle, now, 0.02);
    this.reverb.buffer = this.reverbImpulse(space.reverbSeconds);
  }

  setFx(fx: FxSettings): void {
    this.fx = { ...fx };
    const now = this.ctx.currentTime;
    const { lowpassHz, highpassHz } = filterCutoffs(fx.filter);
    this.fxLowpass.frequency.setTargetAtTime(lowpassHz, now, 0.03);
    this.fxHighpass.frequency.setTargetAtTime(highpassHz, now, 0.03);
    this.fxDelaySend.gain.setTargetAtTime(fx.delay * FX_DELAY_SEND, now, 0.03);
    this.fxReverbSend.gain.setTargetAtTime(fx.reverb * FX_REVERB_SEND, now, 0.03);
    this.applyCrush(now);
  }

  setMix(mix: MixSettings): void {
    const now = this.ctx.currentTime;
    for (const channel of MIX_CHANNELS) {
      const gain = mixGain(mix[channel]);
      if (channel === 'backing') {
        this.backingLevel.gain.setTargetAtTime(gain, now, 0.03);
        this.backingDelaySend.gain.setTargetAtTime(gain, now, 0.03);
      } else {
        this.instrumentLevels[channel].gain.setTargetAtTime(gain, now, 0.03);
        this.instrumentDelaySends[channel].gain.setTargetAtTime(gain, now, 0.03);
      }
    }
  }

  private applyCrush(now: number): void {
    const wet = crushMix(this.theme.space.crush, this.fx.crush);
    this.crushDry.gain.setTargetAtTime(1 - wet, now, 0.02);
    this.crushWet.gain.setTargetAtTime(wet, now, 0.02);
  }

  setTempo(stepDuration: number): void {
    if (stepDuration === this.lastStepDuration) return;
    this.lastStepDuration = stepDuration;
    this.delay.delayTime.setTargetAtTime(stepDuration * 3, this.ctx.currentTime, 0.05);
  }

  // Records the full mix at a fixed level, before the volume slider.
  createRecordingStream(): MediaStream {
    const destination = this.ctx.createMediaStreamDestination();
    this.analyser.connect(destination);
    return destination.stream;
  }

  readPeak(): number {
    this.analyser.getFloatTimeDomainData(this.analyserData);
    let peak = 0;
    for (let i = 0; i < this.analyserData.length; i += 1) {
      const sample = Math.abs(this.analyserData[i] ?? 0);
      if (sample > peak) peak = sample;
    }
    return peak;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.master.gain.setTargetAtTime(
      this.muted ? 0 : this.masterLevel,
      this.ctx.currentTime,
      0.01,
    );
  }

  setVolume(percent: number): void {
    this.volume.gain.setTargetAtTime(volumeGain(percent), this.ctx.currentTime, 0.01);
  }

  // Silences the backing music, for loudness checks of the instruments alone.
  setMusicEnabled(enabled: boolean): void {
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.value = enabled ? 1 : 0;
  }
}
