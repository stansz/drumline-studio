// Browser-only harness: Web Audio is unavailable in vitest. With `npm run dev` running, open
// /tests/loudness.html. It renders each board through the real audio chain, faster than real time.
// Instrument boards have no backing music and are checked against NEON_BASELINE; backing boards
// have no notes and are checked against Neon rendered in the same run. Add ?theme=funk, for
// example, to render only that theme.
import { Audio_ } from '../src/audio';
import { GRID_COLS, GRID_ROWS, STEPS_PER_BAR, stepSeconds } from '../src/config';
import { intensity, layerLevels, pickVoices } from '../src/music';
import { Sequencer, type Instrument } from '../src/sequencer';
import { DEFAULT_THEME, THEMES, type Theme } from '../src/themes';
import { NEON_BASELINE } from './loudness-baseline';

const SAMPLE_RATE = 48000;
const BARS = 8;
const TAIL_SECONDS = 3;
const CLIP_LEVEL = 1;
const INSTRUMENTS: Instrument[] = ['kick', 'hat', 'synth', 'snare'];

type Board = Array<[Instrument, number, number]>;

interface Result {
  board: string;
  theme: string;
  bpm: number;
  notes: number;
  peak: number;
  peakDb: number;
  clippedSamples: number;
  rmsDb: number;
}

function column(instrument: Instrument, col: number, count: number): Board {
  const rows = [0, 2, 3, 5, 7];
  return rows.slice(0, count).map((row) => [instrument, col, row]);
}

function fullBoard(instrument?: Instrument): Board {
  const board: Board = [];
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      board.push([
        instrument ?? INSTRUMENTS[board.length % INSTRUMENTS.length] ?? 'kick',
        col,
        row,
      ]);
    }
  }
  return board;
}

// One kick per column: chords never attenuate these, and the tails overlap.
function kickLine(): Board {
  const seen = new Set<number>();
  return fullBoard('kick').filter(([, col]) => {
    if (seen.has(col)) return false;
    seen.add(col);
    return true;
  });
}

const BOARDS: Record<string, Board> = {
  solo: [['kick', 0, 0]],
  'spread 12': Array.from({ length: 12 }, (_, i): [Instrument, number, number] => [
    INSTRUMENTS[i % INSTRUMENTS.length] ?? 'kick',
    i,
    i % 2 === 0 ? 0 : 7,
  ]),
  'stack 12': [...column('kick', 0, 5), ...column('hat', 4, 5), ...column('hat', 8, 2)],
  'kick stacks 12': [...column('kick', 0, 4), ...column('kick', 4, 4), ...column('kick', 8, 4)],
  'synth stacks 12': [...column('synth', 0, 4), ...column('synth', 4, 4), ...column('synth', 8, 4)],
  'kick line': kickLine(),
  'full board': fullBoard(),
  'all kicks': fullBoard('kick'),
};

const THEME_BOARDS = ['spread 12', 'kick line', 'full board'];
// Backing music alone, at the level an empty grid gets and at the fullest it gets.
const BACKING_BOARDS: Record<string, number> = {
  'backing quiet': intensity(0, 5),
  'backing full': 1,
};
const LOUDNESS_BPMS = [120, 240];
const LOUDNESS_TOLERANCE_DB = 1;
// Measured on Chiptune: the limiter lets through about 0.4 dB for each 1 dB of trim.
const LIMITER_RESPONSE = 0.4;
// Backing alone stays under the limiter, so a music trim change comes through in full.
const MUSIC_RESPONSE = 1;

function seedRandom(seed: number): () => void {
  const original = Math.random;
  let state = seed;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return () => {
    Math.random = original;
  };
}

async function renderBoard(
  name: string,
  board: Board,
  bpm: number,
  mode: 'notes' | 'backing',
  theme: Theme,
  intensityLevel?: number,
): Promise<Result> {
  const restoreRandom = seedRandom(1);
  const duration = stepSeconds(bpm);
  const seconds = duration * STEPS_PER_BAR * BARS + TAIL_SECONDS;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const audio = new Audio_(ctx as unknown as AudioContext);
  audio.setTheme(theme);
  audio.setTempo(duration);

  const sequencer = new Sequencer();
  if (mode === 'notes') {
    for (const [instrument, col, row] of board) {
      if (!sequencer.set(instrument, col, row)) {
        throw new Error(`${name}: cannot place at ${col},${row}`);
      }
    }
  }

  const levels = layerLevels(intensityLevel ?? intensity(0, 5));
  for (let musicStep = 0; musicStep < STEPS_PER_BAR * BARS; musicStep += 1) {
    const time = musicStep * duration;
    if (mode === 'backing') {
      audio.playMusicStep(musicStep, time, duration, levels);
      continue;
    }
    const notes = sequencer.step();
    const voices = pickVoices(notes);
    for (const voice of voices) {
      audio.playNote(voice.instrument, voice.row, time, voices.length);
    }
  }

  const rendered = await ctx.startRendering();
  restoreRandom();

  let peak = 0;
  let clippedSamples = 0;
  let energy = 0;
  for (let channel = 0; channel < rendered.numberOfChannels; channel += 1) {
    for (const sample of rendered.getChannelData(channel)) {
      const level = Math.abs(sample);
      if (level > peak) peak = level;
      if (level >= CLIP_LEVEL) clippedSamples += 1;
      energy += sample * sample;
    }
  }
  const rms = Math.sqrt(energy / (rendered.length * rendered.numberOfChannels));
  return {
    board: name,
    theme: theme.name,
    bpm,
    notes: board.length,
    peak: Number(peak.toFixed(3)),
    peakDb: Number((20 * Math.log10(peak)).toFixed(1)),
    clippedSamples,
    rmsDb: Number((20 * Math.log10(rms)).toFixed(1)),
  };
}

export async function runLoudness(): Promise<Result[]> {
  const only = new URLSearchParams(location.search).get('theme');
  const results: Result[] = [];
  for (const [name, board] of only ? [] : Object.entries(BOARDS)) {
    for (const bpm of LOUDNESS_BPMS) {
      results.push(await renderBoard(name, board, bpm, 'notes', DEFAULT_THEME));
    }
  }
  for (const theme of THEMES) {
    if (only ? theme.id !== only : theme === DEFAULT_THEME) continue;
    for (const name of THEME_BOARDS) {
      for (const bpm of LOUDNESS_BPMS) {
        results.push(await renderBoard(name, BOARDS[name] ?? [], bpm, 'notes', theme));
      }
    }
  }
  // Neon is always in the backing pass, even when `?theme=` names another theme, so every run has
  // its own Neon backing reference.
  for (const theme of THEMES) {
    if (only ? theme.id !== only && theme !== DEFAULT_THEME : false) continue;
    for (const [name, intensityLevel] of Object.entries(BACKING_BOARDS)) {
      for (const bpm of LOUDNESS_BPMS) {
        results.push(await renderBoard(name, [], bpm, 'backing', theme, intensityLevel));
      }
    }
  }
  return results;
}

// Each theme's average loudness compared with NEON_BASELINE. Set `space.trim` in src/themes.ts to
// bring a theme back within LOUDNESS_TOLERANCE_DB.
function themeOffsets(results: Result[]): Record<string, number> {
  const offsets: Record<string, number> = {};
  for (const theme of THEMES) {
    const differences: number[] = [];
    for (const result of results) {
      const neon = NEON_BASELINE[result.board]?.[result.bpm];
      if (result.theme === theme.name && neon !== undefined) {
        differences.push(result.rmsDb - neon);
      }
    }
    if (differences.length === 0) continue;
    const mean = differences.reduce((sum, value) => sum + value, 0) / differences.length;
    offsets[theme.name] = Number(mean.toFixed(1));
  }
  return offsets;
}

function suggestedTrims(offsets: Record<string, number>): Record<string, number> {
  const trims: Record<string, number> = {};
  for (const theme of THEMES) {
    const offset = offsets[theme.name];
    if (offset === undefined || theme === DEFAULT_THEME) continue;
    const trim = theme.space.trim * 10 ** (-offset / LIMITER_RESPONSE / 20);
    trims[theme.name] = Number(trim.toFixed(2));
  }
  return trims;
}

function neonBackingLevels(results: Result[]): Record<string, Record<number, number>> {
  const levels: Record<string, Record<number, number>> = {};
  for (const result of results) {
    if (result.theme !== DEFAULT_THEME.name || !(result.board in BACKING_BOARDS)) continue;
    levels[result.board] = { ...levels[result.board], [result.bpm]: result.rmsDb };
  }
  return levels;
}

// Each theme's average backing level compared with Neon's backing in the same run. Set
// `space.musicTrim` in src/themes.ts to bring a theme back within LOUDNESS_TOLERANCE_DB.
function musicOffsets(results: Result[]): Record<string, number> {
  const neonBacking = neonBackingLevels(results);
  const offsets: Record<string, number> = {};
  for (const theme of THEMES) {
    if (theme === DEFAULT_THEME) continue;
    const differences: number[] = [];
    for (const result of results) {
      if (result.theme !== theme.name) continue;
      const neon = neonBacking[result.board]?.[result.bpm];
      if (neon !== undefined) differences.push(result.rmsDb - neon);
    }
    if (differences.length === 0) continue;
    const mean = differences.reduce((sum, value) => sum + value, 0) / differences.length;
    offsets[theme.name] = Number(mean.toFixed(1));
  }
  return offsets;
}

function suggestedMusicTrims(offsets: Record<string, number>): Record<string, number> {
  const trims: Record<string, number> = {};
  for (const theme of THEMES) {
    const offset = offsets[theme.name];
    if (offset === undefined || theme === DEFAULT_THEME) continue;
    const trim = theme.space.musicTrim * 10 ** (-offset / MUSIC_RESPONSE / 20);
    trims[theme.name] = Number(trim.toFixed(2));
  }
  return trims;
}

function neonLevels(results: Result[]): Record<string, Record<number, number>> {
  const levels: Record<string, Record<number, number>> = {};
  for (const result of results) {
    if (result.theme !== DEFAULT_THEME.name || !NEON_BASELINE[result.board]) continue;
    levels[result.board] = { ...levels[result.board], [result.bpm]: result.rmsDb };
  }
  return levels;
}

const output = document.querySelector('#results');
void runLoudness().then((results) => {
  const offsets = themeOffsets(results);
  const music = musicOffsets(results);
  const balanced = Object.values(offsets).every(
    (offset) => Math.abs(offset) <= LOUDNESS_TOLERANCE_DB,
  );
  const musicBalanced = Object.values(music).every(
    (offset) => Math.abs(offset) <= LOUDNESS_TOLERANCE_DB,
  );
  const report = {
    offsets,
    suggestedTrims: suggestedTrims(offsets),
    musicOffsets: music,
    suggestedMusicTrims: suggestedMusicTrims(music),
    baseline: neonLevels(results),
    results,
  };
  if (output) output.textContent = JSON.stringify(report, null, 1);
  const clean = results.every((result) => result.clippedSamples === 0);
  document.title = clean && balanced && musicBalanced ? 'PASS' : 'FAIL';
});
