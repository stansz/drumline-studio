import { Audio_, parseVolume } from './audio';
import { LIVE_TOOLS, GRID_COLS, GRID_ROWS, INSTRUMENT_INFO, parseBpm } from './config';
import { DEFAULT_FX, parseFx, type FxSettings } from './fx';
import { liveRowForCode, nearestStep, nextLiveMode, type LiveMode } from './live';
import { patternToMidi } from './midi';
import { DEFAULT_MIX, MIX_CHANNELS, parseMix, type MixSettings } from './mix';
import { intensity, layerLevels, pickVoices } from './music';
import { decodeShare, encodeShare, parsePattern, serializePattern } from './pattern';
import { PRESETS, scaleNotes, type Preset } from './presets';
import { randomPattern } from './random';
import { extensionFor, fileStamp, formatElapsed, pickRecordingType } from './recording';
import { Renderer, drawIcon, drawLogo } from './render';
import { MAX_SAMPLE_SECONDS, prepareSample } from './sampleEdit';
import {
  SAMPLE_PRESETS,
  USER_SAMPLE,
  sampleById,
  sampleForNote,
  type SamplePreset,
} from './samples';
import { loadUserSample, saveUserSample } from './sampleStore';
import { Scheduler } from './scheduler';
import { SECTION_NAMES, describeSwing, sectionAt, sectionIndexAt, songMap } from './song';
import {
  Sequencer,
  INSTRUMENTS,
  type Cell,
  type Instrument,
  type NoteEvent,
  type PatternLength,
} from './sequencer';
import { PIXEL_COLORS, type SpriteName } from './sprites';
import { DEFAULT_THEME, nextTheme, previousTheme, themeById, type Theme } from './themes';
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
const overlay = byId<HTMLDivElement>('overlay');
const overlayText = byId<HTMLDivElement>('overlay-text');
const overlayDetail = byId<HTMLDivElement>('overlay-detail');
const stepsEl = byId<HTMLDivElement>('steps');
const kickButton = byId<HTMLButtonElement>('tool-kick');
const hatButton = byId<HTMLButtonElement>('tool-hat');
const synthButton = byId<HTMLButtonElement>('tool-synth');
const snareButton = byId<HTMLButtonElement>('tool-snare');
const sampleButton = byId<HTMLButtonElement>('tool-sample');
const bassButton = byId<HTMLButtonElement>('tool-bass');
const samplerPanel = byId<HTMLDivElement>('sampler');
const samplePick = byId<HTMLButtonElement>('sample-pick');
const sampleList = byId<HTMLDivElement>('sample-list');
const micButton = byId<HTMLButtonElement>('sample-mic');
const fileButton = byId<HTMLButtonElement>('sample-file');
const fileInput = byId<HTMLInputElement>('sample-file-input');
const pageButton = byId<HTMLButtonElement>('page');
const lengthButton = byId<HTMLButtonElement>('length');
const followButton = byId<HTMLButtonElement>('follow');
const beatsToggle = byId<HTMLButtonElement>('beats-toggle');
const playButton = byId<HTMLButtonElement>('play');
const stopButton = byId<HTMLButtonElement>('stop');
const backingButton = byId<HTMLButtonElement>('backing');
const backingValue = byId<HTMLSpanElement>('backing-value');
const bpmInput = byId<HTMLInputElement>('bpm');
const bpmDownButton = byId<HTMLButtonElement>('bpm-down');
const bpmUpButton = byId<HTMLButtonElement>('bpm-up');
const muteButton = byId<HTMLButtonElement>('mute');
const clearButton = byId<HTMLButtonElement>('clear');
const liveButton = byId<HTMLButtonElement>('live');
const startButton = byId<HTMLButtonElement>('start');
const themeButton = byId<HTMLButtonElement>('theme');
const infoTitle = byId<HTMLHeadingElement>('info-title');
const infoBlurb = byId<HTMLParagraphElement>('info-blurb');
const infoMode = byId<HTMLParagraphElement>('info-mode');
const infoMap = byId<HTMLDivElement>('info-map');
const infoPosition = byId<HTMLParagraphElement>('info-position');
const infoVerse = byId<HTMLElement>('info-verse');
const infoChorus = byId<HTMLElement>('info-chorus');
const infoFeel = byId<HTMLElement>('info-feel');
const infoTempo = byId<HTMLElement>('info-tempo');
const volumeSlider = byId<HTMLInputElement>('volume');
const fxToggle = byId<HTMLButtonElement>('fx-toggle');
const fxPanel = byId<HTMLDivElement>('fx');
const fxFilter = byId<HTMLInputElement>('fx-filter');
const fxDelay = byId<HTMLInputElement>('fx-delay');
const fxReverb = byId<HTMLInputElement>('fx-reverb');
const fxCrush = byId<HTMLInputElement>('fx-crush');
const fxReset = byId<HTMLButtonElement>('fx-reset');
const shareToggle = byId<HTMLButtonElement>('share-toggle');
const sharePanel = byId<HTMLDivElement>('share');
const shareLinkButton = byId<HTMLButtonElement>('share-link');
const recordButton = byId<HTMLButtonElement>('record');
const midiButton = byId<HTMLButtonElement>('midi');
const shareStatus = byId<HTMLSpanElement>('share-status');
const mixPanel = byId<HTMLDivElement>('mix');
const mixAllPanel = byId<HTMLDivElement>('mix-all');
const beatsScreen = byId<HTMLDivElement>('beats-screen');
const screenBeats = byId<HTMLButtonElement>('screen-beats');
const screenBacking = byId<HTMLButtonElement>('screen-backing');
const screenSounds = byId<HTMLButtonElement>('screen-sounds');
const beatsPage = byId<HTMLDivElement>('beats-page');
const backingPage = byId<HTMLDivElement>('backing-page');
const soundsPage = byId<HTMLDivElement>('sounds-page');
const musicPrev = byId<HTMLButtonElement>('music-prev');
const musicNext = byId<HTMLButtonElement>('music-next');
const musicTheme = byId<HTMLSpanElement>('music-theme');
const musicSong = byId<HTMLButtonElement>('music-song');
const musicLoop = byId<HTMLButtonElement>('music-loop');
const musicOff = byId<HTMLButtonElement>('music-off');
const musicModeButtons = [musicSong, musicLoop, musicOff];
const beatsClose = byId<HTMLButtonElement>('beats-close');
const beatsList = byId<HTMLDivElement>('beats-list');
const beatsName = byId<HTMLParagraphElement>('beats-name');
const beatsMeta = byId<HTMLParagraphElement>('beats-meta');
const beatsBlurb = byId<HTMLParagraphElement>('beats-blurb');
const beatsUp = byId<HTMLButtonElement>('beats-up');
const beatsDown = byId<HTMLButtonElement>('beats-down');
const beatsLoad = byId<HTMLButtonElement>('beats-load');
const beatRandom = byId<HTMLButtonElement>('beat-random');
const beatUndo = byId<HTMLButtonElement>('beat-undo');
const mixToggle = byId<HTMLButtonElement>('mix-toggle');
const mixInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-mix-channel]'));

const THEME_KEY = 'drumline-theme';
const BACKING_KEY = 'drumline-backing';
const SECTIONS_KEY = 'drumline-sections';
const VOLUME_KEY = 'drumline-volume';
const BPM_KEY = 'drumline-bpm';
const FX_KEY = 'drumline-fx';
const MIX_KEY = 'drumline-mix';
const PATTERN_KEY = 'drumline-pattern';
const SAMPLE_KEY = 'drumline-sample';
const FOLLOW_KEY = 'drumline-follow';
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
let heardMusicStep = 0;
let stepMarks: Array<{ at: number; step: number; musicStep: number }> = [];
let playhead = 0;
let theme = loadTheme();
let scaleId: string | null = null;
let volume = loadVolume();
let backing = loadBacking();
let sections = loadSections();
let follow = loadFollow();
let bpm = loadBpm();
let fx: FxSettings = loadFx();
let mix: MixSettings = loadMix();
let sample: SamplePreset = loadSample();
let hasUserSample = false;
// Whether the player picked a sound since the page loaded; the saved user sample only takes
// over when they haven't.
let sampleChosenThisVisit = false;
const storedSampleId = (() => {
  try {
    return localStorage.getItem(SAMPLE_KEY);
  } catch {
    return null;
  }
})();
const stepLeds: HTMLSpanElement[] = [];
let litStep = -1;
let shownPlayhead = -1;
let page = 0;
let paint: 'add' | 'erase' | null = null;
let liveMode: LiveMode = 'paint';
let playheadAt = 0;
let loopDrag: number | null = null;
let openPanel: 'fx' | 'share' | 'mixall' | null = null;
const infoSections: HTMLSpanElement[] = [];
let infoShownKey = '';
let beatsCursor = 0;
let loadedPresetId: string | null = null;
let screenPage: 'beats' | 'backing' | 'sounds' = 'beats';

// One level of undo: the pattern and the settings the last preset or Random changed.
interface Snapshot {
  cells: Cell[];
  length: PatternLength;
  bpm: number;
  themeId: string;
  backing: boolean;
  sections: boolean;
  scaleId: string | null;
}

let undoSnapshot: Snapshot | null = null;

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

function savePattern(): void {
  try {
    localStorage.setItem(
      PATTERN_KEY,
      serializePattern({
        length: sequencer.length,
        cells: sequencer.cells,
        scale: scaleId ?? undefined,
      }),
    );
  } catch {
    // The pattern still lasts for this visit.
  }
}

function loadCells(cells: readonly Cell[]): void {
  sequencer.clear();
  for (const cell of cells) {
    // Old saves have no sample on a sample cell, so it keeps the picked sound it sounded with.
    const sampleId =
      cell.instrument === 'sample' && cell.sample === undefined ? sample.id : cell.sample;
    sequencer.set(cell.instrument, cell.col, cell.row, sampleId);
  }
}

function nextLength(length: PatternLength): PatternLength {
  return length === 16 ? 32 : length === 32 ? 64 : 16;
}

function pageCount(): number {
  return sequencer.length / GRID_COLS;
}

function setLength(length: PatternLength): void {
  sequencer.setLength(length);
  if (page >= sequencer.length / GRID_COLS) setPage(0);
  lengthButton.textContent = `${length} steps`;
  lengthButton.classList.toggle('selected', length > 16);
  pageButton.hidden = length === 16;
  updateFollowButton();
  updateHud();
  updateLoopLeds();
  savePattern();
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

// The mixer view shows only the selected instrument's slider.
function updateMixView(): void {
  mixPanel.querySelectorAll<HTMLElement>('.mix-channel').forEach((label) => {
    label.hidden = label.dataset.channel !== selected;
  });
}

function updateSelection(): void {
  kickButton.classList.toggle('selected', selected === 'kick');
  hatButton.classList.toggle('selected', selected === 'hat');
  synthButton.classList.toggle('selected', selected === 'synth');
  snareButton.classList.toggle('selected', selected === 'snare');
  sampleButton.classList.toggle('selected', selected === 'sample');
  bassButton.classList.toggle('selected', selected === 'bass');
  updateSampler();
  updateMixView();
}

function updateSampler(): void {
  sampleList.querySelectorAll<HTMLButtonElement>('.sound-item').forEach((button) => {
    const active = button.dataset.sample === sample.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function addSampleButton(name: string, id: string): void {
  const button = document.createElement('button');
  button.className = 'beats-item sound-item';
  button.type = 'button';
  button.setAttribute('role', 'option');
  button.dataset.sample = id;
  button.textContent = name;
  button.style.setProperty('--c', PIXEL_COLORS[sampleById(id, hasUserSample).color] ?? '');
  button.addEventListener('click', () => {
    sampleChosenThisVisit = true;
    pickSample(id);
  });
  sampleList.append(button);
}

function renderSampleButtons(): void {
  sampleList.replaceChildren();
  for (const preset of SAMPLE_PRESETS) addSampleButton(preset.name, preset.id);
  if (hasUserSample) addSampleButton(USER_SAMPLE.name, USER_SAMPLE.id);
  updateSampler();
}

function renderBeatsList(): void {
  beatsList.replaceChildren();
  for (const [kind, label] of [
    ['groove', 'Grooves'],
    ['tune', 'Tunes'],
    ['holiday', 'Holiday'],
  ] as const) {
    const group = document.createElement('div');
    group.className = 'beats-group';
    group.setAttribute('role', 'presentation');
    group.textContent = label;
    beatsList.append(group);
    PRESETS.forEach((preset, index) => {
      if (preset.kind !== kind) return;
      const button = document.createElement('button');
      button.className = 'beats-item';
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      button.textContent = preset.name;
      button.addEventListener('click', () => {
        beatsCursor = index;
        loadPreset(preset);
        updateBeatsScreen();
      });
      beatsList.append(button);
    });
  }
}

function updateBeatsScreen(): void {
  const BACKING_LABEL = { song: 'Song', loop: 'Loop', off: 'Off' } as const;
  beatsList.querySelectorAll<HTMLElement>('.beats-item').forEach((item) => {
    const index = Number(item.dataset.index);
    item.classList.toggle('active', index === beatsCursor);
    item.setAttribute('aria-selected', String(index === beatsCursor));
    item.classList.toggle('loaded', PRESETS[index]?.id === loadedPresetId);
  });
  const preset = PRESETS[beatsCursor];
  if (!preset) return;
  beatsName.textContent = preset.name;
  beatsMeta.textContent = `${preset.bpm} BPM · ${themeById(preset.themeId).name} · ${preset.length} steps · Backing ${BACKING_LABEL[preset.backing]}`;
  beatsBlurb.textContent = preset.blurb;
  beatsList
    .querySelector<HTMLElement>(`.beats-item[data-index="${beatsCursor}"]`)
    ?.scrollIntoView({ block: 'nearest' });
}

function moveBeatsCursor(delta: number): void {
  beatsCursor = (beatsCursor + delta + PRESETS.length) % PRESETS.length;
  updateBeatsScreen();
}

function backingShown(): boolean {
  return !beatsScreen.hidden && screenPage === 'backing';
}

function showPage(page: 'beats' | 'backing' | 'sounds'): void {
  screenPage = page;
  beatsPage.hidden = page !== 'beats';
  backingPage.hidden = page !== 'backing';
  soundsPage.hidden = page !== 'sounds';
  screenBeats.classList.toggle('selected', page === 'beats');
  screenBeats.setAttribute('aria-selected', String(page === 'beats'));
  screenBacking.classList.toggle('selected', page === 'backing');
  screenBacking.setAttribute('aria-selected', String(page === 'backing'));
  screenSounds.classList.toggle('selected', page === 'sounds');
  screenSounds.setAttribute('aria-selected', String(page === 'sounds'));
  if (page === 'beats') {
    updateBeatsScreen();
    beatsList.querySelector<HTMLElement>(`.beats-item[data-index="${beatsCursor}"]`)?.focus();
  } else if (page === 'backing') {
    renderInfo();
    infoShownKey = '';
    updateInfoPosition();
    screenBacking.focus();
  } else {
    updateSampler();
    const active = sampleList.querySelector<HTMLButtonElement>('.sound-item.active');
    (active ?? screenSounds).focus();
  }
}

function openScreen(page: 'beats' | 'backing' | 'sounds'): void {
  if (page === 'beats') {
    const index = PRESETS.findIndex((preset) => preset.id === loadedPresetId);
    if (index >= 0) beatsCursor = index;
  }
  beatsScreen.hidden = false;
  showPage(page);
}

function closeScreen(): void {
  beatsScreen.hidden = true;
  beatsToggle.focus();
}

function loadHighlighted(): void {
  const preset = PRESETS[beatsCursor];
  if (preset) loadPreset(preset);
  closeScreen();
}

// The dock shows one view at a time: an opened panel, else the sampler while Sample is
// selected, else the mixer.
function updateDock(): void {
  const view = openPanel ?? (selected === 'sample' ? 'sampler' : 'mix');
  mixPanel.hidden = view !== 'mix';
  fxPanel.hidden = view !== 'fx';
  sharePanel.hidden = view !== 'share';
  mixAllPanel.hidden = view !== 'mixall';
  samplerPanel.hidden = view !== 'sampler';
  fxToggle.setAttribute('aria-expanded', String(view === 'fx'));
  shareToggle.setAttribute('aria-expanded', String(view === 'share'));
  mixToggle.setAttribute('aria-expanded', String(view === 'mixall'));
  mixToggle.classList.toggle('selected', view === 'mixall');
}

// Only scales the app knows can be saved or restored.
function knownScaleId(id: string | null | undefined): string | null {
  return id && scaleNotes(id) ? id : null;
}

function setScale(id: string | null): void {
  scaleId = id;
  audio?.setScale(scaleNotes(scaleId));
}

function pickSample(id: string, audition = true): void {
  sample = sampleById(id, hasUserSample);
  audio?.setSample(sample.id);
  try {
    localStorage.setItem(SAMPLE_KEY, sample.id);
  } catch {
    // The choice still applies for this visit.
  }
  updateSampler();
  updateSampleLook();
  if (audition) audio?.auditionSample();
}

function updateSampleLook(): void {
  sampleButton.style.setProperty('--c', PIXEL_COLORS[sample.color] ?? '');
  samplerPanel.querySelector<HTMLElement>('.sampler-volume')?.style.setProperty('--c', PIXEL_COLORS[sample.color] ?? '');
  mixAllPanel.querySelector<HTMLElement>('.mix-all-sample')?.style.setProperty('--c', PIXEL_COLORS[sample.color] ?? '');
  samplePick.textContent = `♪ ${sample.name}`;
  const icon = sampleButton.querySelector('canvas');
  if (icon) drawIcon(icon, 'sample', sample.color);
}

function selectTool(tool: Instrument): void {
  selected = tool;
  if (openPanel === 'mixall') openPanel = null;
  if (tool === 'sample') openPanel = null;
  updateSelection();
  updateDock();
}

function updateBackingButton(): void {
  const label = !backing ? 'Off' : sections ? 'Song' : 'Loop';
  const title = !backing
    ? 'Backing music off'
    : sections
      ? 'Backing music: song with sections'
      : 'Backing music: steady loop';
  backingValue.textContent = label;
  backingButton.title = title;
  backingButton.classList.toggle('selected', backing);
  backingButton.setAttribute('aria-pressed', String(backing));
  const mode = backingMode();
  for (const button of musicModeButtons) {
    const active = button.dataset.mode === mode;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-checked', String(active));
  }
}

function loadBacking(): boolean {
  try {
    return localStorage.getItem(BACKING_KEY) !== '0';
  } catch {
    return true;
  }
}

function loadSections(): boolean {
  try {
    return localStorage.getItem(SECTIONS_KEY) !== '0';
  } catch {
    return true;
  }
}

function loadFollow(): boolean {
  try {
    return localStorage.getItem(FOLLOW_KEY) !== '0';
  } catch {
    return true;
  }
}

function updateFollowButton(): void {
  followButton.hidden = sequencer.length === 16;
  followButton.classList.toggle('selected', follow);
  followButton.setAttribute('aria-pressed', String(follow));
}

function setFollow(on: boolean): void {
  follow = on;
  try {
    localStorage.setItem(FOLLOW_KEY, on ? '1' : '0');
  } catch {
    // The choice still applies for this visit.
  }
  updateFollowButton();
}

type BackingMode = 'song' | 'loop' | 'off';

function backingMode(): BackingMode {
  if (!backing) return 'off';
  return sections ? 'song' : 'loop';
}

function setBacking(mode: BackingMode): void {
  backing = mode !== 'off';
  sections = mode === 'song';
  updateBackingButton();
  if (backingShown()) renderInfo();
  saveBackingSettings();
}

function cycleBacking(): void {
  const next: Record<BackingMode, BackingMode> = { off: 'song', song: 'loop', loop: 'off' };
  setBacking(next[backingMode()]);
}

function saveBackingSettings(): void {
  try {
    localStorage.setItem(BACKING_KEY, backing ? '1' : '0');
    localStorage.setItem(SECTIONS_KEY, sections ? '1' : '0');
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
  const userBass = sequencer.activeCells().some((cell) => cell.instrument === 'bass');
  if (backing) {
    audio.playMusicStep(
      musicStep,
      time,
      duration,
      layerLevels(intensity(sequencer.activeCells().length, 5)),
      sectionAt(musicStep, sections),
      { backingBass: !userBass },
    );
  }
  if (sequencer.activeCells().length === 0 && sequencer.stepIndex % 4 === 0) {
    audio.playMetronome(time, sequencer.stepIndex === 0);
  }
  audio.setTempo(duration);
  stepMarks.push({ at: time, step: sequencer.stepIndex, musicStep });
  const notes = sequencer.step();
  const voices = pickVoices(notes);
  for (const voice of voices) {
    audio.playNote(voice.instrument, voice.row, time, voices.length, voice.sample);
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
    audio.setScale(scaleNotes(scaleId));
    audio.setMuted(muted);
    audio.setVolume(volume);
    audio.setFx(fx);
    audio.setMix(mix);
    audio.setSample(sample.id);
    void audio.loadSamples();
    void loadUserSample().then((stored) => {
      if (!stored || !audio) return;
      audio.setUserSample(USER_SAMPLE.id, stored.data, stored.sampleRate);
      hasUserSample = true;
      renderSampleButtons();
      // Switch to Mine only if the player hasn't picked another sound since the page loaded.
      if (storedSampleId === USER_SAMPLE.id && !sampleChosenThisVisit) {
        pickSample(USER_SAMPLE.id, false);
      }
    });
    scheduler = new Scheduler(ctx, onStep);
    scheduler.bpm = bpm;
    window.__drumline = { sequencer, scheduler, audio };
    hideOverlay();
    recordButton.disabled = false;
    micButton.disabled = false;
    fileButton.disabled = false;
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
  if (backingShown()) renderInfo();
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

function loadSample(): SamplePreset {
  try {
    return sampleById(localStorage.getItem(SAMPLE_KEY));
  } catch {
    return sampleById(null);
  }
}

function updateThemeButton(): void {
  themeButton.textContent = `♪ ${theme.name}`;
  themeButton.title = `${theme.name}: ${theme.blurb} Tap for the next theme (T).`;
  musicTheme.textContent = theme.name;
  musicTheme.title = theme.blurb;
}

function applyTheme(next: Theme): void {
  theme = next;
  audio?.setTheme(theme);
  updateThemeButton();
  if (backingShown()) renderInfo();
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    // The choice just lasts for this visit when storage is unavailable.
  }
}

function cycleTheme(): void {
  applyTheme(nextTheme(theme));
}

function previousThemeStep(): void {
  applyTheme(previousTheme(theme));
}

function buildInfoMap(): void {
  for (const entry of songMap()) {
    const span = document.createElement('span');
    span.className = `info-section info-${entry.kind}`;
    span.textContent = `${SECTION_NAMES[entry.kind]} ${entry.bars}`;
    span.style.flexGrow = String(entry.bars);
    infoMap.append(span);
    infoSections.push(span);
  }
}

function renderInfo(): void {
  infoTitle.textContent = `♪ ${theme.name} backing`;
  infoBlurb.textContent = theme.blurb;
  infoMode.textContent = !backing
    ? 'Off: no backing music.'
    : sections
      ? 'Song: verse, chorus, verse, chorus, then a break, with a snare fill before each change.'
      : 'Loop: the verse chords on repeat.';
  infoVerse.textContent = theme.chords.map((chord) => chord.name).join(' · ');
  infoChorus.textContent = theme.chorusChords.map((chord) => chord.name).join(' · ');
  infoFeel.textContent = describeSwing(theme.swing);
  infoTempo.textContent = `${bpm} BPM`;
}

// The song map's highlight and the "Now:" line, refreshed cheaply while the screen is open.
function updateInfoPosition(): void {
  const songOn = backing && sections;
  let key: string;
  let text: string;
  let current = -1;
  if (songOn && playing) {
    const section = sectionAt(heardMusicStep, true);
    current = sectionIndexAt(heardMusicStep);
    text = `Now: ${SECTION_NAMES[section.kind]}, bar ${section.bar + 1} of ${section.bars}`;
    key = `song:${current}:${section.bar}`;
  } else if (songOn) {
    text = 'Press Play to hear the song.';
    key = 'song:paused';
  } else if (backing) {
    text = 'Sections are off.';
    key = 'loop';
  } else {
    text = '';
    key = 'off';
  }
  if (key === infoShownKey) return;
  infoShownKey = key;
  infoSections.forEach((span, index) => span.classList.toggle('current', index === current));
  infoMap.classList.toggle('dim', !songOn);
  infoPosition.textContent = text;
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

function loadMix(): MixSettings {
  try {
    return parseMix(localStorage.getItem(MIX_KEY));
  } catch {
    return { ...DEFAULT_MIX };
  }
}

function showMix(): void {
  for (const input of mixInputs) {
    const channel = MIX_CHANNELS.find((name) => name === input.dataset.mixChannel);
    if (!channel) continue;
    input.value = String(Math.round(mix[channel] * 100));
  }
}

function setMix(next: MixSettings): void {
  mix = next;
  audio?.setMix(mix);
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    // The settings still apply for this visit.
  }
  showMix();
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
  openPanel = openPanel === 'fx' ? null : 'fx';
  updateDock();
}

function toggleSharePanel(): void {
  openPanel = openPanel === 'share' ? null : 'share';
  updateDock();
}

function toggleMixAll(): void {
  openPanel = openPanel === 'mixall' ? null : 'mixall';
  updateDock();
}

function shareUrl(): string {
  const code = encodeShare({
    length: sequencer.length,
    cells: sequencer.cells,
    bpm,
    themeId: theme.id,
    sampleId: sample.id,
    scale: scaleId ?? '',
  });
  return `${location.origin}${location.pathname}#${code}`;
}

async function copyShareLink(): Promise<void> {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
    shareStatus.textContent = 'Link copied.';
  } catch {
    window.prompt('Copy this link:', url);
    shareStatus.textContent = '';
  }
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportMidi(): void {
  const bytes = patternToMidi(
    sequencer.cells,
    sequencer.length,
    bpm,
    scaleNotes(scaleId) ?? theme.synth.scale,
    (id) => sampleForNote(id ?? sample.id).midiNote,
  );
  download(new Blob([bytes], { type: 'audio/midi' }), `${fileStamp(new Date())}.mid`);
  shareStatus.textContent = 'MIDI saved.';
}

let recorder: MediaRecorder | null = null;
let recordStream: MediaStream | null = null;
let recordChunks: Blob[] = [];
let recordStartedAt = 0;
let recordTimer: ReturnType<typeof setInterval> | null = null;
const recordingType =
  typeof MediaRecorder === 'undefined'
    ? null
    : pickRecordingType((type) => MediaRecorder.isTypeSupported(type));

function updateRecordLabel(): void {
  const label = recorder ? `● ${formatElapsed((Date.now() - recordStartedAt) / 1000)}` : 'Record';
  recordButton.textContent = recorder ? `Stop ${label}` : label;
  recordButton.classList.toggle('rec', recorder !== null);
  shareToggle.classList.toggle('rec', recorder !== null);
  shareToggle.textContent = recorder ? label : 'Share';
}

function toggleRecording(): void {
  if (!audio || !recordingType) return;
  if (recorder) {
    recorder.stop();
    return;
  }
  recordStream ??= audio.createRecordingStream();
  recordChunks = [];
  const type = recordingType;
  const next = new MediaRecorder(recordStream, { mimeType: type });
  next.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) recordChunks.push(event.data);
  });
  next.addEventListener('stop', () => {
    download(new Blob(recordChunks, { type }), `${fileStamp(new Date())}.${extensionFor(type)}`);
    recorder = null;
    if (recordTimer !== null) clearInterval(recordTimer);
    recordTimer = null;
    shareStatus.textContent = 'Recording saved.';
    updateRecordLabel();
  });
  recorder = next;
  recordStartedAt = Date.now();
  next.start(1000);
  recordTimer = setInterval(updateRecordLabel, 500);
  shareStatus.textContent = 'Recording. Everything you hear is captured.';
  if (!playing) play();
  updateRecordLabel();
}

async function useUserSample(channels: Float32Array[], sampleRate: number): Promise<boolean> {
  if (!audio) return false;
  const data = prepareSample(channels, sampleRate);
  if (!data) return false;
  audio.setUserSample(USER_SAMPLE.id, data, sampleRate);
  hasUserSample = true;
  renderSampleButtons();
  pickSample(USER_SAMPLE.id);
  await saveUserSample({ sampleRate, data });
  return true;
}

function channelsOf(buffer: AudioBuffer): Float32Array[] {
  return Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
}

let micRecorder: MediaRecorder | null = null;
let micStopTimer: ReturnType<typeof setTimeout> | null = null;

async function toggleMic(): Promise<void> {
  const current = audio;
  if (!current || !recordingType) return;
  if (micRecorder) {
    micRecorder.stop();
    return;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    micButton.textContent = 'Mic blocked';
    return;
  }
  const chunks: Blob[] = [];
  const type = recordingType;
  const next = new MediaRecorder(stream, { mimeType: type });
  next.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  next.addEventListener('stop', () => {
    stream.getTracks().forEach((track) => track.stop());
    if (micStopTimer !== null) clearTimeout(micStopTimer);
    micStopTimer = null;
    micRecorder = null;
    micButton.classList.remove('rec');
    micButton.textContent = '● Mic';
    void (async () => {
      try {
        const decoded = await current.decode(await new Blob(chunks, { type }).arrayBuffer());
        if (!(await useUserSample(channelsOf(decoded), decoded.sampleRate))) {
          micButton.textContent = 'No sound';
        }
      } catch {
        micButton.textContent = 'Mic failed';
      }
    })();
  });
  micRecorder = next;
  next.start();
  micButton.classList.add('rec');
  micButton.textContent = '■ Stop';
  // A little longer than the kept length, so trimming has room at the start.
  micStopTimer = setTimeout(() => next.stop(), (MAX_SAMPLE_SECONDS + 0.5) * 1000);
}

function loadSampleFile(): void {
  void (async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const current = audio;
    if (!current) return;
    let used = false;
    try {
      const decoded = await current.decode(await file.arrayBuffer());
      used = await useUserSample(channelsOf(decoded), decoded.sampleRate);
    } catch {
      used = false;
    }
    fileInput.value = '';
    if (!used) {
      fileButton.textContent = 'Not audio';
      setTimeout(() => {
        fileButton.textContent = 'File';
      }, 2000);
    }
  })();
}

function play(): void {
  if (!started) {
    void startAudio().then(() => {
      if (started) play();
    });
    return;
  }
  scheduler?.start();
  audio?.setRunning(true);
  playing = true;
  playButton.textContent = 'Pause';
}

// Holds the position so Play carries on from the same step.
function pause(): void {
  scheduler?.stop();
  audio?.setRunning(false);
  playing = false;
  queued = [];
  stepMarks = [];
  playButton.textContent = 'Play';
}

function stop(): void {
  pause();
  sequencer.rewind();
  musicStep = 0;
  heardMusicStep = 0;
  playhead = sequencer.stepIndex;
  playheadAt = 0;
}

function togglePlay(): void {
  if (playing) {
    pause();
  } else {
    play();
  }
}

function clearPattern(): void {
  sequencer.clear();
  setScale(null);
  updateHud();
  updateStepHints();
  savePattern();
}

function takeSnapshot(): void {
  undoSnapshot = {
    cells: sequencer.cells.map((cell) => ({ ...cell })),
    length: sequencer.length,
    bpm,
    themeId: theme.id,
    backing,
    sections,
    scaleId,
  };
}

function restoreSnapshot(snapshot: Snapshot): void {
  loadCells(snapshot.cells);
  setLength(snapshot.length);
  setBpm(snapshot.bpm);
  applyTheme(themeById(snapshot.themeId));
  backing = snapshot.backing;
  sections = snapshot.sections;
  saveBackingSettings();
  updateBackingButton();
  setScale(snapshot.scaleId);
  savePattern();
  updateHud();
  updateStepHints();
  if (backingShown()) renderInfo();
}

function loadPreset(preset: Preset): void {
  takeSnapshot();
  loadCells(preset.cells);
  setLength(preset.length);
  setBpm(preset.bpm);
  applyTheme(themeById(preset.themeId));
  backing = preset.backing !== 'off';
  sections = preset.backing === 'song';
  saveBackingSettings();
  updateBackingButton();
  setScale(preset.scale);
  savePattern();
  updateHud();
  updateStepHints();
  beatUndo.disabled = false;
  loadedPresetId = preset.id;
  if (!beatsScreen.hidden && screenPage === 'beats') updateBeatsScreen();
  if (backingShown()) renderInfo();
}

function randomize(): void {
  takeSnapshot();
  loadCells(randomPattern(Math.random));
  if (sequencer.length !== 16) setLength(16);
  savePattern();
  updateHud();
  updateStepHints();
  beatUndo.disabled = false;
  loadedPresetId = null;
  if (!beatsScreen.hidden && screenPage === 'beats') updateBeatsScreen();
}

function undo(): void {
  if (!undoSnapshot) return;
  const snapshot = undoSnapshot;
  undoSnapshot = null;
  restoreSnapshot(snapshot);
  beatUndo.disabled = true;
  loadedPresetId = null;
  if (!beatsScreen.hidden && screenPage === 'beats') updateBeatsScreen();
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
  let changed: boolean;
  if (paint === 'add') {
    changed = sequencer.set(selected, step, row, selected === 'sample' ? sample.id : undefined);
  } else {
    changed = sequencer.erase(step, row);
  }
  updateHud();
  updateStepHints();
  if (changed) savePattern();
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
  audio.playNote(
    selected,
    row,
    audioContext.currentTime,
    1,
    selected === 'sample' ? sample.id : undefined,
  );
  if (liveMode !== 'rec' || !playing || !scheduler) return;
  const step = nearestStep(
    heardTime(),
    playheadAt,
    playhead,
    sequencer.stepAfter(playhead),
    scheduler.stepDuration,
  );
  if (!sequencer.set(selected, step, row, selected === 'sample' ? sample.id : undefined)) return;
  savePattern();
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
  if (!LIVE_TOOLS) return;
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
sampleButton.addEventListener('click', () => selectTool('sample'));
bassButton.addEventListener('click', () => selectTool('bass'));
lengthButton.addEventListener('click', () => setLength(nextLength(sequencer.length)));
pageButton.addEventListener('click', () => {
  setFollow(false);
  if (sequencer.length > 16) setPage((page + 1) % pageCount());
});
followButton.addEventListener('click', () => setFollow(!follow));

playButton.addEventListener('click', togglePlay);
stopButton.addEventListener('click', stop);
backingButton.addEventListener('click', cycleBacking);
bpmDownButton.addEventListener('click', (event) => nudgeBpm(-1, event.shiftKey));
bpmUpButton.addEventListener('click', (event) => nudgeBpm(1, event.shiftKey));
bpmInput.addEventListener('change', () => setBpm(parseBpm(bpmInput.value)));
bpmInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') bpmInput.blur();
});
muteButton.addEventListener('click', toggleMute);
clearButton.addEventListener('click', clearPattern);
liveButton.addEventListener('click', () => setLiveMode(nextLiveMode(liveMode)));
startButton.addEventListener('click', () => void startAudio());
themeButton.addEventListener('click', cycleTheme);
musicPrev.addEventListener('click', previousThemeStep);
musicNext.addEventListener('click', cycleTheme);
for (const button of musicModeButtons) {
  button.addEventListener('click', () => setBacking(button.dataset.mode as BackingMode));
}
volumeSlider.addEventListener('input', changeVolume);
fxToggle.addEventListener('click', toggleFxPanel);
for (const slider of [fxFilter, fxDelay, fxReverb, fxCrush]) {
  slider.addEventListener('input', () => setFx(readFxSliders()));
}
fxReset.addEventListener('click', () => setFx({ ...DEFAULT_FX }));
for (const input of mixInputs) {
  const channel = MIX_CHANNELS.find((name) => name === input.dataset.mixChannel);
  if (!channel) continue;
  input.addEventListener('input', () => {
    const next: MixSettings = { ...mix };
    next[channel] = Number(input.value) / 100;
    setMix(next);
  });
}
shareToggle.addEventListener('click', toggleSharePanel);
mixToggle.addEventListener('click', toggleMixAll);
beatsToggle.addEventListener('click', () => openScreen('beats'));
screenBeats.addEventListener('click', () => showPage('beats'));
screenBacking.addEventListener('click', () => showPage('backing'));
screenSounds.addEventListener('click', () => showPage('sounds'));
samplePick.addEventListener('click', () => openScreen('sounds'));
beatsClose.addEventListener('click', closeScreen);
beatsScreen.addEventListener('click', (event) => {
  if (event.target === beatsScreen) closeScreen();
});
beatsUp.addEventListener('click', () => moveBeatsCursor(-1));
beatsDown.addEventListener('click', () => moveBeatsCursor(1));
beatsLoad.addEventListener('click', loadHighlighted);
beatRandom.addEventListener('click', randomize);
beatUndo.addEventListener('click', undo);
shareLinkButton.addEventListener('click', () => void copyShareLink());
recordButton.addEventListener('click', toggleRecording);
midiButton.addEventListener('click', exportMidi);
micButton.addEventListener('click', () => void toggleMic());
fileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', loadSampleFile);

window.addEventListener('keydown', (event) => {
  // The Menu screen takes the keyboard while it is open.
  if (!beatsScreen.hidden) {
    if (event.key === 'Escape') {
      closeScreen();
    } else if (event.key.toLowerCase() === 'i') {
      if (screenPage === 'backing') closeScreen();
      else showPage('backing');
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) togglePlay();
    } else if (event.key.toLowerCase() === 't') {
      if (!event.repeat) cycleTheme();
    } else if (event.key.toLowerCase() === 'b') {
      if (!event.repeat) cycleBacking();
    } else if (screenPage === 'beats') {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveBeatsCursor(-1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveBeatsCursor(1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        loadHighlighted();
      }
    } else if (screenPage === 'sounds') {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const buttons = Array.from(sampleList.querySelectorAll<HTMLButtonElement>('.sound-item'));
        const current = buttons.findIndex((button) => button.dataset.sample === sample.id);
        const step = event.key === 'ArrowUp' ? -1 : 1;
        const next = buttons[(current + step + buttons.length) % buttons.length];
        const id = next?.dataset.sample;
        if (id) {
          sampleChosenThisVisit = true;
          pickSample(id);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        closeScreen();
      }
    } else if (screenPage === 'backing') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousThemeStep();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycleTheme();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const modes: BackingMode[] = ['song', 'loop', 'off'];
        const index = modes.indexOf(backingMode());
        const step = event.key === 'ArrowUp' ? -1 : 1;
        const next = modes[(index + step + modes.length) % modes.length] ?? 'song';
        setBacking(next);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        closeScreen();
      }
    }
    return;
  }
  // Typing a tempo or moving a slider must not trigger the shortcuts.
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
    nudgeBpm(-1, event.shiftKey);
    return;
  }
  if (event.code === 'Equal' || event.code === 'NumpadAdd') {
    nudgeBpm(1, event.shiftKey);
    return;
  }
  if (event.repeat) return;
  if (LIVE_TOOLS && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const liveRow = liveRowForCode(event.code);
    if (liveRow !== null) {
      playLive(liveRow);
      return;
    }
  }
  if (!overlay.classList.contains('hidden')) {
    if (event.key === 'Enter' || event.code === 'Space') void startAudio();
    if (event.key.toLowerCase() === 't') cycleTheme();
    return;
  }
  if (event.key === 'Escape') {
    stop();
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
    case '5':
      selectTool('bass');
      break;
    case '6':
      selectTool('sample');
      break;
    case 'b':
      cycleBacking();
      break;
    case 'c':
      clearPattern();
      break;
    case 'e':
      toggleSharePanel();
      break;
    case 'f':
      setFollow(!follow);
      break;
    case 'i':
      openScreen('backing');
      break;
    case 'l':
      setLength(nextLength(sequencer.length));
      break;
    case 'm':
      toggleMute();
      break;
    case 'p':
      if (sequencer.length > 16) {
        setFollow(false);
        setPage((page + 1) % pageCount());
      }
      break;
    case 'r':
      toggleRecording();
      break;
    case 't':
      cycleTheme();
      break;
    case 'v':
      if (LIVE_TOOLS) setLiveMode(nextLiveMode(liveMode));
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
    heardMusicStep = mark.musicStep;
  }
  if (follow && playing && sequencer.length > 16) {
    const playPage = Math.floor(playhead / GRID_COLS);
    if (playPage !== page) setPage(playPage);
  }
  if (backingShown()) updateInfoPosition();
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
  renderer.draw({
    sequencer,
    now,
    playhead,
    selected,
    page,
    hover: liveMode === 'paint' ? hover : null,
    sampleColor: sample.color,
  });
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

renderSampleButtons();
renderBeatsList();
buildInfoMap();

const shared = (() => {
  try {
    return decodeShare(decodeURIComponent(location.hash.replace(/^#/, '')));
  } catch {
    return null;
  }
})();
if (shared) {
  // A shared beat never plays the recipient's own Mine; it falls back to Clap.
  loadCells(
    shared.cells.map((cell) =>
      cell.instrument === 'sample'
        ? { ...cell, sample: sampleById(cell.sample ?? null).id }
        : cell,
    ),
  );
  setScale(knownScaleId(shared.scale));
  setLength(shared.length);
  setBpm(shared.bpm);
  theme = themeById(shared.themeId);
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    // The theme still applies for this visit.
  }
  sample = sampleById(shared.sampleId);
  try {
    localStorage.setItem(SAMPLE_KEY, sample.id);
  } catch {
    // The sample still applies for this visit.
  }
  updateSampler();
  sampleChosenThisVisit = true;
  updateSampleLook();
  history.replaceState(null, '', location.pathname + location.search);
  overlayDetail.textContent = 'Loaded a shared beat.';
} else {
  const saved = (() => {
    try {
      return parsePattern(localStorage.getItem(PATTERN_KEY));
    } catch {
      return null;
    }
  })();
  if (saved) loadCells(saved.cells);
  setScale(knownScaleId(saved?.scale));
  setLength(saved?.length ?? 16);
}
updateHud();
updateSelection();
updateSampleLook();
updateDock();
setLiveMode('paint');
liveButton.hidden = !LIVE_TOOLS;
stepsEl.classList.toggle('loopable', LIVE_TOOLS);
for (const name of INSTRUMENTS) {
  const button = byId<HTMLButtonElement>(`tool-${name}`);
  button.title = `${INSTRUMENT_INFO[name].name}: ${INSTRUMENT_INFO[name].description}`;
}
updateThemeButton();
bpmInput.value = String(bpm);
updateBackingButton();
updateFollowButton();
volumeSlider.value = String(volume);
showFx();
showMix();
recordButton.disabled = true;
if (!recordingType) recordButton.hidden = true;
micButton.disabled = true;
fileButton.disabled = true;
if (!recordingType || !navigator.mediaDevices?.getUserMedia) micButton.hidden = true;
updateRecordLabel();
requestAnimationFrame(frame);
