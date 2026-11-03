import { GRID_COLS, GRID_ROWS } from './config';
import { bayer } from './pixel';
import { sampleForNote } from './samples';
import type { Instrument, NoteEvent, Sequencer } from './sequencer';
import {
  LOGO_GLYPHS,
  PIXEL_COLORS,
  SPRITES,
  STEP_GROUP_COLORS,
  type SpriteName,
} from './sprites';

export const ART_CELL = 16;
export const ART_WIDTH = GRID_COLS * ART_CELL; // 256
export const ART_HEIGHT = GRID_ROWS * ART_CELL; // 128

const NOTE_FLASH = 0.1;

const NOTE_OUTLINE: Record<Instrument, string> = {
  kick: PIXEL_COLORS['7'],
  hat: PIXEL_COLORS.a,
  synth: PIXEL_COLORS.c,
  snare: PIXEL_COLORS.g,
  sample: PIXEL_COLORS['9'],
  bass: PIXEL_COLORS.p,
};

export interface RenderState {
  sequencer: Sequencer;
  now: number;
  playhead: number;
  selected: Instrument;
  page: number;
  hover: { col: number; row: number } | null;
  sampleColor: string;
}

interface BakedSprites {
  normal: readonly [HTMLCanvasElement, HTMLCanvasElement];
  hit: readonly [HTMLCanvasElement, HTMLCanvasElement];
}

// Turns one frame of sprite data into a canvas. '.' is transparent, and every other
// character is a key in PIXEL_COLORS unless the caller maps it to a different color.
function bake(rows: readonly string[], map?: (character: string) => string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0]?.length ?? 0;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      if (character === '.') return;
      const color = map ? map(character) : PIXEL_COLORS[character];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

// The hit variant keeps the ink outline and turns every other color white.
function hitColor(character: string): string {
  return character === '0' ? PIXEL_COLORS['0'] : PIXEL_COLORS['6'];
}

const BAKED = new Map<SpriteName, BakedSprites>();
for (const name of Object.keys(SPRITES) as SpriteName[]) {
  const [first, second] = SPRITES[name];
  BAKED.set(name, {
    normal: [bake(first), bake(second)],
    hit: [bake(first, hitColor), bake(second, hitColor)],
  });
}

// The Sample sprite in each sound's color: only its body color ('9') changes.
const SAMPLE_VARIANTS = new Map<string, BakedSprites>();
function sampleFrames(color: string): BakedSprites | undefined {
  const cached = SAMPLE_VARIANTS.get(color);
  if (cached) return cached;
  const body = PIXEL_COLORS[color];
  if (!body) return BAKED.get('sample');
  const map = (character: string): string =>
    character === '9' ? body : (PIXEL_COLORS[character] ?? body);
  const [first, second] = SPRITES.sample;
  const baked: BakedSprites = {
    normal: [bake(first, map), bake(second, map)],
    hit: [bake(first, hitColor), bake(second, hitColor)],
  };
  SAMPLE_VARIANTS.set(color, baked);
  return baked;
}

function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (part: number): number => Math.min(255, Math.round(part * factor));
  return `rgb(${channel(value >> 16)}, ${channel((value >> 8) & 255)}, ${channel(value & 255)})`;
}

export function drawLogo(canvas: HTMLCanvasElement): void {
  const word = 'DRUMLINE';
  const letters = [...word].map((character) => LOGO_GLYPHS[character] ?? []);
  let width = 0;
  for (const rows of letters) width += (rows[0]?.length ?? 0) + 1;
  canvas.width = width + 2;
  canvas.height = 11;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const plot = (rows: readonly string[], left: number, top: number, color: string): void => {
    ctx.fillStyle = color;
    rows.forEach((row, y) => {
      [...row].forEach((filled, i) => {
        if (filled === '#') ctx.fillRect(left + i, top + y, 1, 1);
      });
    });
  };

  let x = 1;
  letters.forEach((rows, index) => {
    const color =
      STEP_GROUP_COLORS[Math.floor(index / 2) % STEP_GROUP_COLORS.length] ??
      STEP_GROUP_COLORS[0];
    // The two lower layers give the letters a chunky drop shadow.
    plot(rows, x, 3, '#000');
    plot(rows, x, 2, shade(color, 0.55));
    plot(rows, x, 1, color);
    x += (rows[0]?.length ?? 0) + 1;
  });
}

export function drawIcon(canvas: HTMLCanvasElement, name: SpriteName, color?: string): void {
  const frames =
    name === 'sample' && color ? (sampleFrames(color) ?? BAKED.get(name)) : BAKED.get(name);
  if (!frames) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frames.normal[0], 0, 0);
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly display: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly board: HTMLCanvasElement;
  private readonly head: HTMLCanvasElement;
  private readonly flashes = new Map<string, number>();
  private lastNow = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const display = canvas.getContext('2d');
    if (!display) throw new Error('Canvas 2D context is unavailable');
    this.display = display;
    this.buffer = document.createElement('canvas');
    this.buffer.width = ART_WIDTH;
    this.buffer.height = ART_HEIGHT;
    const ctx = this.buffer.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable');
    this.ctx = ctx;
    this.board = this.bakeBoard();
    this.head = this.bakePlayhead();
  }

  flash(note: NoteEvent): void {
    this.flashes.set(`${note.col},${note.row}`, this.lastNow);
  }

  private bakeBoard(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = ART_WIDTH;
    canvas.height = ART_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable');
    const base = ['#2d2830', '#2e2a2d', '#2e2c2b', '#2c2b30'];
    const high = ['#4a3634', '#4c3c2f', '#4c432f', '#47434a'];

    ctx.fillStyle = '#17161c';
    ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const x = col * ART_CELL;
        const y = row * ART_CELL;
        const group = Math.floor(col / 4);
        ctx.fillStyle = base[group] ?? base[0] ?? '#2d2830';
        ctx.fillRect(x + 1, y + 1, ART_CELL - 2, ART_CELL - 2);
        ctx.fillStyle = '#3a3540';
        ctx.fillRect(x + 1, y + 1, ART_CELL - 2, 1);
        ctx.fillStyle = '#211f27';
        ctx.fillRect(x + 1, y + ART_CELL - 2, ART_CELL - 2, 1);
        ctx.fillStyle = high[group] ?? high[0] ?? '#4a3634';
        ctx.fillRect(x + 3, y + 3, ART_CELL - 6, 1);
      }
    }

    for (let group = 1; group < 4; group += 1) {
      const x = group * 4 * ART_CELL - 1;
      ctx.fillStyle = '#55505e';
      for (let y = 0; y < ART_HEIGHT; y += 2) {
        ctx.fillRect(x + (y % 4 ? 1 : 0), y, 1, 1);
      }
    }

    return canvas;
  }

  private bakePlayhead(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = ART_CELL;
    canvas.height = ART_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable');
    ctx.fillStyle = '#fffaf0';
    for (let y = 0; y < ART_HEIGHT; y += 1) {
      for (let x = 0; x < ART_CELL; x += 1) {
        if (bayer(x, y) < 0.07) ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  private pl(x: number, y: number, color: string, alpha = 1): void {
    if (alpha < 1 && bayer(x, y) >= alpha) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.trunc(x), Math.trunc(y), 1, 1);
  }

  private strokeTile(col: number, row: number, color: string): void {
    const x = col * ART_CELL;
    const y = row * ART_CELL;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, ART_CELL, 1);
    this.ctx.fillRect(x, y + ART_CELL - 1, ART_CELL, 1);
    this.ctx.fillRect(x, y, 1, ART_CELL);
    this.ctx.fillRect(x + ART_CELL - 1, y, 1, ART_CELL);
  }

  private strokeInset(col: number, row: number, color: string): void {
    const x = col * ART_CELL + 1;
    const y = row * ART_CELL + 1;
    const size = ART_CELL - 2;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, 1);
    this.ctx.fillRect(x, y + size - 1, size, 1);
    this.ctx.fillRect(x, y, 1, size);
    this.ctx.fillRect(x + size - 1, y, 1, size);
  }

  private drawPlayhead(playhead: number, page: number): void {
    if (Math.floor(playhead / GRID_COLS) !== page) return;
    const column = playhead % GRID_COLS;
    const x = column * ART_CELL;
    const color =
      STEP_GROUP_COLORS[Math.floor(column / 4) % STEP_GROUP_COLORS.length] ??
      STEP_GROUP_COLORS[0];
    this.ctx.drawImage(this.head, x, 0);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, 0, 1, ART_HEIGHT);
    this.ctx.fillRect(x + ART_CELL - 1, 0, 1, ART_HEIGHT);
    for (let row = 0; row < GRID_ROWS; row += 1) {
      this.ctx.fillRect(x + 3, row * ART_CELL + 3, 10, 1);
    }
  }

  private drawPreview(state: RenderState): void {
    const { sequencer, selected, hover } = state;
    if (!hover) return;
    const offset = state.page * GRID_COLS;
    if (sequencer.cellAt(offset + hover.col, hover.row)) {
      // Clicking a note removes it, so show that instead of the preview.
      this.strokeTile(hover.col, hover.row, PIXEL_COLORS.r);
      return;
    }
    const x = hover.col * ART_CELL;
    const y = hover.row * ART_CELL;
    const colorOf = (character: string): string | undefined =>
      selected === 'sample' && character === '9'
        ? (PIXEL_COLORS[state.sampleColor] ?? PIXEL_COLORS[character])
        : PIXEL_COLORS[character];
    for (const [j, row] of SPRITES[selected][0].entries()) {
      [...row].forEach((character, i) => {
        if (character === '.') return;
        if (bayer(x + i, y + j) >= 0.5) return;
        const color = colorOf(character);
        if (color) this.pl(x + i, y + j, color);
      });
    }
  }

  private drawNotes(state: RenderState): void {
    const offset = state.page * GRID_COLS;
    const cells = [...state.sequencer.cells].sort((a, b) => a.row - b.row);
    for (const cell of cells) {
      if (Math.floor(cell.col / GRID_COLS) !== state.page) continue;
      const flashedAt = this.flashes.get(`${cell.col},${cell.row}`);
      const frame = flashedAt !== undefined && state.now - flashedAt < NOTE_FLASH ? 1 : 0;
      const sampleColor = cell.instrument === 'sample' ? sampleForNote(cell.sample).color : null;
      if (frame === 1) {
        const outline =
          sampleColor !== null
            ? (PIXEL_COLORS[sampleColor] ?? NOTE_OUTLINE.sample)
            : NOTE_OUTLINE[cell.instrument];
        this.strokeInset(cell.col - offset, cell.row, outline);
      }
      const frames =
        sampleColor !== null ? sampleFrames(sampleColor) : BAKED.get(cell.instrument);
      if (!frames) continue;
      this.ctx.drawImage(
        frames.normal[frame],
        (cell.col - offset) * ART_CELL,
        cell.row * ART_CELL,
      );
    }
  }

  private present(): void {
    const clientWidth = this.canvas.clientWidth;
    if (clientWidth === 0) return;
    const ratio = window.devicePixelRatio || 1;
    const scale = Math.max(1, Math.ceil((clientWidth * ratio) / ART_WIDTH));
    const width = ART_WIDTH * scale;
    const height = ART_HEIGHT * scale;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.display.imageSmoothingEnabled = false;
    this.display.drawImage(this.buffer, 0, 0, width, height);
  }

  draw(state: RenderState): void {
    this.lastNow = state.now;
    this.ctx.drawImage(this.board, 0, 0);
    this.drawPlayhead(state.playhead, state.page);
    this.drawPreview(state);
    this.drawNotes(state);
    this.present();
  }
}
