import { Audio_, parseVolume } from './audio';
import { GRID_COLS, GRID_ROWS, INSTRUMENT_INFO, parseBpm } from './config';
import { DEFAULT_FX, parseFx, type FxSettings } from './fx';
import { liveRowForCode, nearestStep, nextLiveMode, type LiveMode } from './live';
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
const liveButton = byId<HTMLButtonElement>('live');
const startButton = byId<HTMLButtonElement>('start');
const themeButton = byId<HTMLButtonElement>('theme');
const volumeSlider = byId<HTMLInputElement>('volume');
const fxToggle = byId<HTMLButtonElement>('fx-toggle');
const fxPanel = byId<HTMLDivElement>('fx');
const fxFilter = byId<HTMLInputElement>('fx-filter');
const fxDelay = byId<HTMLInputElement>('fx-delay');
const fxReverb = byId<HTMLInputElement>('fx-reverb');
const fxCrush = byId<HTMLInputElement>('fx-crush');
const fxReset = byId<HTMLButtonElement>('fx-reset');

const THEME_KEY = 'drumline-theme';
const BACKING_KEY = 'drumline-backing';
const VOLUME_KEY = 'drumline-volume';
const BPM_KEY = 'drumline-bpm';
const FX_KEY = 'drumline-fx';
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
let fx: FxSettings = loadFx();
const stepLeds: HTMLSpanElement[] = [];
let litStep = -1;
let shownPlayhead = -1;
let page = 0;
let paint: 'add' | 'erase' | null = null;
let liveMode: LiveMode = 'paint';
let playheadAt = 0;
let loopDrag: number | null = null;

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
  updateLoopLeds();
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
  updateLoopLeds();
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
  sequencer.rewind();
  playhead = sequencer.stepIndex;
  playheadAt = 0;
}

// The audio clock time being heard right now, after output latency.
function heardTime(): number {
  if (!audioContext) return 0;
  const latency = audioContext.outputLatency || audioContext.baseLatency || 0;
  return Math.max(0, audioContext.currentTime - latency);
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
    audio.setFx(fx);
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

function loadFx(): FxSettings {
  try {
    return parseFx(localStorage.getItem(FX_KEY));
  } catch {
    return parseFx(null);
  }
}

function showFx(): void {
  fxFilter.value = String(Math.round(fx.filter * 100));
  fxDelay.value = String(Math.round(fx.delay * 100));
  fxReverb.value = String(Math.round(fx.reverb * 100));
  fxCrush.value = String(Math.round(fx.crush * 100));
  const active = fx.filter !== 0 || fx.delay > 0 || fx.reverb > 0 || fx.crush > 0;
  fxToggle.classList.toggle('selected', active);
}

function setFx(next: FxSettings): void {
  fx = next;
  audio?.setFx(fx);
  showFx();
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(fx));
  } catch {
    // The settings still apply for this visit.
  }
}

function readFxSliders(): FxSettings {
  return parseFx(
    JSON.stringify({
      filter: Number(fxFilter.value) / 100,
      delay: Number(fxDelay.value) / 100,
      reverb: Number(fxReverb.value) / 100,
      crush: Number(fxCrush.value) / 100,
    }),
  );
}

function toggleFxPanel(): void {
  fxPanel.hidden = !fxPanel.hidden;
  fxToggle.setAttribute('aria-expanded', String(!fxPanel.hidden));
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
  playhead = sequencer.stepIndex;
  playheadAt = 0;
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

function setLiveMode(mode: LiveMode): void {
  liveMode = mode;
  liveButton.textContent = mode === 'paint' ? 'Paint' : mode === 'live' ? 'Live' : 'Rec';
  liveButton.classList.toggle('selected', mode === 'live');
  liveButton.classList.toggle('rec', mode === 'rec');
  paint = null;
  hover = null;
}

function playLive(row: number): void {
  if (!audio || !audioContext) return;
  audio.playNote(selected, row, audioContext.currentTime, 1);
  if (liveMode !== 'rec' || !playing || !scheduler) return;
  const step = nearestStep(
    heardTime(),
    playheadAt,
    playhead,
    sequencer.stepAfter(playhead),
    scheduler.stepDuration,
  );
  if (!sequencer.set(selected, step, row)) return;
  if (step === sequencer.stepIndex) sequencer.skipOnce(step, row);
  renderer.flash({ instrument: selected, col: step, row });
  updateHud();
}

function stripStep(event: PointerEvent): number {
  const rect = stepsEl.getBoundingClientRect();
  const index = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_COLS);
  return page * GRID_COLS + Math.max(0, Math.min(GRID_COLS - 1, index));
}

function updateLoopLeds(preview: { start: number; end: number } | null = null): void {
  const range = preview ?? sequencer.loop;
  stepLeds.forEach((led, i) => {
    const step = page * GRID_COLS + i;
    led.classList.toggle('looped', range !== null && step >= range.start && step <= range.end);
  });
}

canvas.addEventListener('pointerdown', (event) => {
  const cell = cellAt(event);
  if (!cell) return;
  if (liveMode !== 'paint') {
    playLive(cell.row);
    return;
  }
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
  if (liveMode !== 'paint') {
    hover = null;
    return;
  }
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

stepsEl.addEventListener('pointerdown', (event) => {
  const start = stripStep(event);
  if (start >= sequencer.length) return;
  loopDrag = start;
  stepsEl.setPointerCapture(event.pointerId);
  updateLoopLeds({ start: loopDrag, end: loopDrag });
});

stepsEl.addEventListener('pointermove', (event) => {
  if (loopDrag === null) return;
  const end = Math.min(stripStep(event), sequencer.length - 1);
  updateLoopLeds({ start: Math.min(loopDrag, end), end: Math.max(loopDrag, end) });
});

stepsEl.addEventListener('pointerup', (event) => {
  if (loopDrag === null) return;
  const end = Math.min(stripStep(event), sequencer.length - 1);
  if (end === loopDrag) {
    sequencer.clearLoop();
  } else {
    sequencer.setLoop(loopDrag, end);
  }
  loopDrag = null;
  updateLoopLeds();
});

stepsEl.addEventListener('pointercancel', () => {
  loopDrag = null;
  updateLoopLeds();
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
liveButton.addEventListener('click', () => setLiveMode(nextLiveMode(liveMode)));
startButton.addEventListener('click', play);
themeButton.addEventListener('click', cycleTheme);
volumeSlider.addEventListener('input', changeVolume);
fxToggle.addEventListener('click', toggleFxPanel);
for (const slider of [fxFilter, fxDelay, fxReverb, fxCrush]) {
  slider.addEventListener('input', () => setFx(readFxSliders()));
}
fxReset.addEventListener('click', () => setFx({ ...DEFAULT_FX }));

window.addEventListener('keydown', (event) => {
  // Typing a tempo or moving an FX slider must not trigger the shortcuts.
  if (
    event.target === bpmInput ||
    event.target === fxFilter ||
    event.target === fxDelay ||
    event.target === fxReverb ||
    event.target === fxCrush
  ) {
    return;
  }
  if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
    nudgeBpm(-1, event.shiftKey);
    return;
  }
  if (event.code === 'Equal' || event.code === 'NumpadAdd') {
    nudgeBpm(1, event.shiftKey);
    return;
  }
  if (event.repeat) return;
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const liveRow = liveRowForCode(event.code);
    if (liveRow !== null) {
      playLive(liveRow);
      return;
    }
  }
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
    case 'v':
      setLiveMode(nextLiveMode(liveMode));
      break;
    case 'x':
      toggleFxPanel();
      break;
    default:
      break;
  }
});

function frame(): void {
  // Sound reaches the speakers after the audio clock, so draw at the time being heard.
  const now = heardTime();
  while (stepMarks.length > 0) {
    const mark = stepMarks[0];
    if (!mark || mark.at > now) break;
    stepMarks.shift();
    playhead = mark.step;
    playheadAt = mark.at;
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
  renderer.draw({ sequencer, now, playhead, selected, page, hover: liveMode === 'paint' ? hover : null });
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
setLiveMode('paint');
infoEl.textContent =
  'Click or drag to paint. Click a note to remove it. Drag the step lights to loop.';
for (const name of INSTRUMENTS) {
  const button = byId<HTMLButtonElement>(`tool-${name}`);
  button.title = `${INSTRUMENT_INFO[name].name}: ${INSTRUMENT_INFO[name].description}`;
}
updateThemeButton();
bpmInput.value = String(bpm);
updateBackingButton();
volumeSlider.value = String(volume);
showFx();
requestAnimationFrame(frame);
