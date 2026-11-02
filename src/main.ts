import { Audio_, parseVolume } from './audio';
import { GRID_COLS, GRID_ROWS, INSTRUMENT_INFO, parseBpm } from './config';
import { intensity, layerLevels, pickVoices } from './music';
import { Renderer, drawIcon, drawLogo } from './render';
import { Scheduler } from './scheduler';
import { Sequencer, INSTRUMENTS, type Instrument, type NoteEvent, type PatternLength } from './sequencer';
import type { SpriteName } from './sprites';
import { DEFAULT_THEME, nextTheme, themeById, type Theme } from './themes';
import './style.css';

declare global {
  interface Window {
    __drumline: {
      sequencer: Sequencer;
      scheduler: Scheduler | null;
      audio: Audio_ | null;
    };
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = byId<HTMLCanvasElement>('game');
const notesEl = byId<HTMLSpanElement>('notes');
const stepEl = byId<HTMLSpanElement>('step');
const infoEl = byId<HTMLParagraphElement>('info');
const overlay = byId<HTMLDivElement>('overlay');
const overlayText = byId<HTMLDivElement>('overlay-text');
const overlayDetail = byId<HTMLDivElement>('overlay-detail');
const stepsEl = byId<HTMLDivElement>('steps');
const kickButton = byId<HTMLButtonElement>('tool-kick');
const hatButton = byId<HTMLButtonElement>('tool-hat');
const synthButton = byId<HTMLButtonElement>('tool-synth');
const snareButton = byId<HTMLButtonElement>('tool-snare');
const pageButton = byId<HTMLButtonElement>('page');
const lengthButton = byId<HTMLButtonElement>('length');
const playButton = byId<HTMLButtonElement>('play');
const backingButton = byId<HTMLButtonElement>('backing');
const bpmInput = byId<HTMLInputElement>('bpm');
const bpmDownButton = byId<HTMLButtonElement>('bpm-down');
const bpmUpButton = byId<HTMLButtonElement>('bpm-up');
const muteButton = byId<HTMLButtonElement>('mute');
const clearButton = byId<HTMLButtonElement>('clear');
const startButton = byId<HTMLButtonElement>('start');
const themeButton = byId<HTMLButtonElement>('theme');
const volumeSlider = byId<HTMLInputElement>('volume');

const THEME_KEY = 'drumline-theme';
const BACKING_KEY = 'drumline-backing';
const VOLUME_KEY = 'drumline-volume';
const BPM_KEY = 'drumline-bpm';
const renderer = new Renderer(canvas);

const sequencer = new Sequencer();
let scheduler: Scheduler | null = null;
let audio: Audio_ | null = null;
let audioContext: AudioContext | null = null;
let started = false;
let playing = false;
let muted = false;
let selected: Instrument = 'kick';
let hover: { col: number; row: number } | null = null;
let queued: Array<{ at: number; note: NoteEvent }> = [];
let musicStep = 0;
let stepMarks: Array<{ at: number; step: number }> = [];
let playhead = 0;
let theme = loadTheme();
let volume = loadVolume();
let backing = loadBacking();
let bpm = loadBpm();
const stepLeds: HTMLSpanElement[] = [];
let litStep = -1;
let shownPlayhead = -1;
let page = 0;
let paint: 'add' | 'erase' | null = null;

window.__drumline = { sequencer, scheduler, audio };

function updateHud(): void {
  notesEl.textContent = String(sequencer.activeCells().length);
  stepEl.textContent = `${String(playhead + 1).padStart(2, '0')}/${sequencer.length}`;
}

function updateStepHints(): void {
  const col = hover ? hover.col : null;
  stepLeds.forEach((led, step) => {
    led.classList.toggle('fires', col !== null && step === col);
  });
}

function setLength(length: PatternLength): void {
  sequencer.setLength(length);
  if (length === 16) setPage(0);
  lengthButton.textContent = `${length} steps`;
  lengthButton.classList.toggle('selected', length === 32);
  pageButton.hidden = length === 16;
  updateHud();
}

function setPage(next: number): void {
  page = next;
  pageButton.textContent = `Page ${page + 1}`;
  stepLeds.forEach((led, i) => {
    const number = led.querySelector('em');
    if (number) number.textContent = i % 4 === 0 ? String(page * GRID_COLS + i + 1) : '';
  });
  stepLeds[litStep]?.classList.remove('on');
  litStep = -1;
}

function updateSelection(): void {
  kickButton.classList.toggle('selected', selected === 'kick');
  hatButton.classList.toggle('selected', selected === 'hat');
  synthButton.classList.toggle('selected', selected === 'synth');
  snareButton.classList.toggle('selected', selected === 'snare');
}

function selectTool(tool: Instrument): void {
  selected = tool;
  updateSelection();
}

function updateBackingButton(): void {
  backingButton.classList.toggle('selected', backing);
  backingButton.setAttribute('aria-pressed', String(backing));
}

function loadBacking(): boolean {
  try {
    return localStorage.getItem(BACKING_KEY) !== '0';
  } catch {
    return true;
  }
}

function toggleBacking(): void {
  backing = !backing;
  updateBackingButton();
  try {
    localStorage.setItem(BACKING_KEY, backing ? '1' : '0');
  } catch {
    // The choice just lasts for this visit when storage is unavailable.
  }
}

function showStartOverlay(): void {
  overlayText.textContent = 'Paint a beat. Each column is one step.';
  overlayDetail.textContent = '';
  overlay.classList.remove('hidden', 'passive');
}

function hideOverlay(): void {
  overlay.classList.add('hidden');
  overlay.classList.remove('passive');
}

function onStep(time: number, duration: number): void {
  if (!audio) return;
  if (backing) {
    audio.playMusicStep(
      musicStep,
      time,
      duration,
      layerLevels(intensity(sequencer.activeCells().length, 5)),
    );
  }
  if (sequencer.activeCells().length === 0 && sequencer.stepIndex % 4 === 0) {
    audio.playMetronome(time, sequencer.stepIndex === 0);
  }
  audio.setTempo(duration);
  stepMarks.push({ at: time, step: sequencer.stepIndex });
  const notes = sequencer.step();
  const voices = pickVoices(notes);
  for (const voice of voices) {
    audio.playNote(voice.instrument, voice.row, time, voices.length);
  }
  for (const note of notes) {
    queued.push({ at: time, note });
  }
  musicStep += 1;
}

async function startAudio(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    audioContext = ctx;
    await ctx.resume();
    audio = new Audio_(ctx);
    audio.setTheme(theme);
    audio.setMuted(muted);
    audio.setVolume(volume);
    scheduler = new Scheduler(ctx, onStep);
    scheduler.bpm = bpm;
    window.__drumline = { sequencer, scheduler, audio };
    hideOverlay();
    play();
  } catch (error) {
    started = false;
    console.error(error);
    showStartOverlay();
  }
}

function loadBpm(): number {
  try {
    return parseBpm(localStorage.getItem(BPM_KEY));
  } catch {
    return parseBpm(null);
  }
}

function setBpm(value: number): void {
  bpm = parseBpm(String(value));
  if (scheduler) scheduler.bpm = bpm;
  bpmInput.value = String(bpm);
  try {
    localStorage.setItem(BPM_KEY, String(bpm));
  } catch {
    // The tempo still works for this visit.
  }
}

function nudgeBpm(direction: 1 | -1, big: boolean): void {
  setBpm(bpm + direction * (big ? 10 : 1));
}

function toggleMute(): void {
  muted = !muted;
  audio?.setMuted(muted);
  muteButton.classList.toggle('selected', muted);
}

function loadTheme(): Theme {
  try {
    return themeById(localStorage.getItem(THEME_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function updateThemeButton(): void {
  themeButton.textContent = `♪ ${theme.name}`;
}

function cycleTheme(): void {
  theme = nextTheme(theme);
  audio?.setTheme(theme);
  updateThemeButton();
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    // The choice just lasts for this visit when storage is unavailable.
  }
}

function loadVolume(): number {
  try {
    return parseVolume(localStorage.getItem(VOLUME_KEY));
  } catch {
    return parseVolume(null);
  }
}

function changeVolume(): void {
  volume = parseVolume(volumeSlider.value);
  audio?.setVolume(volume);
  if (muted) toggleMute();
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // The choice just lasts for this visit when storage is unavailable.
  }
}

function play(): void {
  if (!started) {
    void startAudio();
    return;
  }
  scheduler?.start();
  playing = true;
  playButton.textContent = 'Stop';
}

function stop(): void {
  scheduler?.stop();
  playing = false;
  sequencer.rewind();
  musicStep = 0;
  playhead = 0;
  queued = [];
  stepMarks = [];
  playButton.textContent = 'Play';
}

function togglePlay(): void {
  if (playing) {
    stop();
  } else {
    play();
  }
}

function clearPattern(): void {
  sequencer.clear();
  updateHud();
  updateStepHints();
}

function cellAt(event: PointerEvent | MouseEvent): { col: number; row: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const col = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_COLS);
  const row = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_ROWS);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

function applyPaint(col: number, row: number): void {
  if (paint === null) return;
  const step = page * GRID_COLS + col;
  if (paint === 'add') {
    sequencer.set(selected, step, row);
  } else {
    sequencer.erase(step, row);
  }
  updateHud();
  updateStepHints();
}

canvas.addEventListener('pointerdown', (event) => {
  const cell = cellAt(event);
  if (!cell) return;
  const step = page * GRID_COLS + cell.col;
  if (sequencer.cellAt(step, cell.row) || event.button === 2) {
    paint = 'erase';
  } else {
    paint = 'add';
  }
  applyPaint(cell.col, cell.row);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('pointermove', (event) => {
  hover = cellAt(event);
  updateStepHints();
  if (paint && hover) applyPaint(hover.col, hover.row);
});

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
  canvas.addEventListener(type, () => {
    paint = null;
  });
}

canvas.addEventListener('pointerleave', () => {
  hover = null;
  updateStepHints();
});

kickButton.addEventListener('click', () => selectTool('kick'));
hatButton.addEventListener('click', () => selectTool('hat'));
synthButton.addEventListener('click', () => selectTool('synth'));
snareButton.addEventListener('click', () => selectTool('snare'));
lengthButton.addEventListener('click', () => setLength(sequencer.length === 16 ? 32 : 16));
pageButton.addEventListener('click', () => setPage(page === 0 ? 1 : 0));

playButton.addEventListener('click', togglePlay);
backingButton.addEventListener('click', toggleBacking);
bpmDownButton.addEventListener('click', (event) => nudgeBpm(-1, event.shiftKey));
bpmUpButton.addEventListener('click', (event) => nudgeBpm(1, event.shiftKey));
bpmInput.addEventListener('change', () => setBpm(parseBpm(bpmInput.value)));
bpmInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') bpmInput.blur();
});
muteButton.addEventListener('click', toggleMute);
clearButton.addEventListener('click', clearPattern);
startButton.addEventListener('click', play);
themeButton.addEventListener('click', cycleTheme);
volumeSlider.addEventListener('input', changeVolume);

window.addEventListener('keydown', (event) => {
  // Typing a tempo must not trigger the shortcuts.
  if (event.target === bpmInput) return;
  if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
    nudgeBpm(-1, event.shiftKey);
    return;
  }
  if (event.code === 'Equal' || event.code === 'NumpadAdd') {
    nudgeBpm(1, event.shiftKey);
    return;
  }
  if (event.repeat) return;
  if (!overlay.classList.contains('hidden')) {
    if (event.key === 'Enter' || event.code === 'Space') play();
    if (event.key.toLowerCase() === 't') cycleTheme();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
    return;
  }
  switch (event.key.toLowerCase()) {
    case '1':
      selectTool('kick');
      break;
    case '2':
      selectTool('hat');
      break;
    case '3':
      selectTool('synth');
      break;
    case '4':
      selectTool('snare');
      break;
    case 'b':
      toggleBacking();
      break;
    case 'c':
      clearPattern();
      break;
    case 'l':
      setLength(sequencer.length === 16 ? 32 : 16);
      break;
    case 'm':
      toggleMute();
      break;
    case 'p':
      if (sequencer.length === 32) setPage(page === 0 ? 1 : 0);
      break;
    case 't':
      cycleTheme();
      break;
    default:
      break;
  }
});

function frame(): void {
  // Sound reaches the speakers after the audio clock, so draw at the time being heard.
  const latency = audioContext ? audioContext.outputLatency || audioContext.baseLatency || 0 : 0;
  const now = audioContext ? Math.max(0, audioContext.currentTime - latency) : 0;
  while (stepMarks.length > 0) {
    const mark = stepMarks[0];
    if (!mark || mark.at > now) break;
    stepMarks.shift();
    playhead = mark.step;
  }
  const lit = Math.floor(playhead / GRID_COLS) === page ? playhead % GRID_COLS : -1;
  if (lit !== litStep) {
    stepLeds[litStep]?.classList.remove('on');
    stepLeds[lit]?.classList.add('on');
    litStep = lit;
  }
  if (playhead !== shownPlayhead) {
    shownPlayhead = playhead;
    updateHud();
  }
  while (queued.length > 0) {
    const item = queued[0];
    if (!item || item.at > now) break;
    queued.shift();
    renderer.flash(item.note);
  }
  renderer.draw({ sequencer, now, playhead, selected, page, hover });
  requestAnimationFrame(frame);
}

document.querySelectorAll<HTMLCanvasElement>('canvas.logo').forEach((logo) => {
  drawLogo(logo);
});
document.querySelectorAll<HTMLCanvasElement>('canvas[data-sprite]').forEach((icon) => {
  drawIcon(icon, icon.dataset.sprite as SpriteName);
});

for (let i = 0; i < 16; i += 1) {
  const step = document.createElement('span');
  step.className = `g${Math.floor(i / 4)}`;
  const led = document.createElement('i');
  const number = document.createElement('em');
  number.textContent = i % 4 === 0 ? String(i + 1) : '';
  step.append(led, number);
  stepsEl.append(step);
  stepLeds.push(step);
}

setLength(16);
updateHud();
updateSelection();
infoEl.textContent =
  'Click or drag to paint. Click a note to remove it. Higher rows play higher.';
for (const name of INSTRUMENTS) {
  const button = byId<HTMLButtonElement>(`tool-${name}`);
  button.title = `${INSTRUMENT_INFO[name].name}: ${INSTRUMENT_INFO[name].description}`;
}
updateThemeButton();
bpmInput.value = String(bpm);
updateBackingButton();
volumeSlider.value = String(volume);
requestAnimationFrame(frame);
