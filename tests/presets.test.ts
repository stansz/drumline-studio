import { describe, expect, it } from 'vitest';
import { GRID_ROWS } from '../src/config';
import { PRESETS, SCALES } from '../src/presets';
import { SAMPLE_PRESETS } from '../src/samples';
import { INSTRUMENTS } from '../src/sequencer';
import { THEMES } from '../src/themes';

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));
const SAMPLE_IDS = new Set(SAMPLE_PRESETS.map((sample) => sample.id));

function position(cell: { col: number; row: number }): string {
  return `${cell.col},${cell.row}`;
}

describe('presets', () => {
  it('gives every preset a unique id', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses a known theme, a sane tempo, and a valid length', () => {
    for (const preset of PRESETS) {
      expect(THEME_IDS.has(preset.themeId)).toBe(true);
      expect(preset.bpm).toBeGreaterThanOrEqual(40);
      expect(preset.bpm).toBeLessThanOrEqual(300);
      expect([16, 32]).toContain(preset.length);
      expect(['song', 'loop', 'off']).toContain(preset.backing);
    }
  });

  it('keeps every cell inside the grid with a known instrument', () => {
    for (const preset of PRESETS) {
      for (const cell of preset.cells) {
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(preset.length);
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(GRID_ROWS);
        expect(INSTRUMENTS).toContain(cell.instrument);
      }
    }
  });

  it('keeps at most one note on a position', () => {
    for (const preset of PRESETS) {
      const positions = preset.cells.map(position);
      expect(new Set(positions).size).toBe(positions.length);
    }
  });

  it('gives every sample cell a preset sample id', () => {
    for (const preset of PRESETS) {
      for (const cell of preset.cells) {
        if (cell.instrument !== 'sample') {
          expect(cell.sample).toBeUndefined();
          continue;
        }
        expect(cell.sample).toBeDefined();
        expect(SAMPLE_IDS.has(cell.sample ?? '')).toBe(true);
      }
    }
  });

  it('only names scales the app knows', () => {
    for (const preset of PRESETS) {
      if (preset.scale !== null) expect(SCALES[preset.scale]).toBeDefined();
    }
  });

  it('gives the a-minor scale eight rising notes', () => {
    const scale = SCALES['a-minor'] ?? [];
    expect(scale).toHaveLength(8);
    for (let i = 1; i < scale.length; i += 1) {
      expect(scale[i] ?? 0).toBeGreaterThan(scale[i - 1] ?? 0);
    }
  });

  it('writes the Korobeiniki melody', () => {
    const preset = PRESETS.find((entry) => entry.id === 'korobeiniki');
    expect(preset).toBeDefined();
    const synth = (preset?.cells ?? []).filter((cell) => cell.instrument === 'synth');
    expect(synth).toHaveLength(19);
    expect(synth[0]).toEqual({ instrument: 'synth', col: 0, row: 3 });
    expect(preset?.scale).toBe('a-minor');
  });
});
