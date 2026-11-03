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
