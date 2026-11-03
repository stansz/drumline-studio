import { STEPS_PER_BAR } from './config';
import type { layerLevels } from './music';

export type SectionKind = 'verse' | 'chorus' | 'break';

export interface Section {
  kind: SectionKind;
  bar: number; // bar within the section, from 0
  bars: number; // length of the section in bars
  fill: boolean; // true in the section's last bar while sections are on
}

export const SONG_FORM: ReadonlyArray<{ kind: SectionKind; bars: number }> = [
  { kind: 'verse', bars: 8 },
  { kind: 'chorus', bars: 8 },
  { kind: 'verse', bars: 8 },
  { kind: 'chorus', bars: 8 },
  { kind: 'break', bars: 4 },
];

const SONG_BARS = SONG_FORM.reduce((sum, part) => sum + part.bars, 0);

// Each section with the bar it starts on, for drawing the song map.
export function songMap(): Array<{ kind: SectionKind; bars: number; startBar: number }> {
  let startBar = 0;
  return SONG_FORM.map((part) => {
    const entry = { kind: part.kind, bars: part.bars, startBar };
    startBar += part.bars;
    return entry;
  });
}

// Index into SONG_FORM of the section playing at this step (sections on).
export function sectionIndexAt(musicStep: number): number {
  let bar = Math.floor(Math.max(0, musicStep) / STEPS_PER_BAR) % SONG_BARS;
  for (let i = 0; i < SONG_FORM.length; i += 1) {
    const part = SONG_FORM[i];
    if (!part) break;
    if (bar < part.bars) return i;
    bar -= part.bars;
  }
  return 0;
}

export function describeSwing(swing: number): string {
  return swing <= 0 ? 'Straight' : `Swung ${Math.round(swing * 100)}%`;
}

export const SECTION_NAMES: Record<SectionKind, string> = {
  verse: 'Verse',
  chorus: 'Chorus',
  break: 'Break',
};

// With sections off the backing is today's loop: always a verse, never a fill.
export function sectionAt(musicStep: number, sectionsOn: boolean): Section {
  if (!sectionsOn) return { kind: 'verse', bar: 0, bars: 1, fill: false };
  let bar = Math.floor(Math.max(0, musicStep) / STEPS_PER_BAR) % SONG_BARS;
  for (const part of SONG_FORM) {
    if (bar < part.bars) return { kind: part.kind, bar, bars: part.bars, fill: bar === part.bars - 1 };
    bar -= part.bars;
  }
  return { kind: 'verse', bar: 0, bars: 1, fill: false };
}

type Levels = ReturnType<typeof layerLevels>;

// How each section changes the layer levels. Verse leaves them as they are.
export function sectionLevels(levels: Levels, kind: SectionKind): Levels {
  if (kind === 'break') return { pad: levels.pad, bass: 0, arp: 0 };
  if (kind === 'chorus') {
    return {
      pad: Math.min(1, levels.pad + 0.15),
      bass: Math.max(levels.bass, 0.6),
      arp: Math.max(levels.arp, 0.6),
    };
  }
  return levels;
}

export const FILL_STEPS: readonly number[] = [12, 13, 14, 15];
