import { GRID_ROWS, MAX_STEPS } from './config';

export type Instrument = 'kick' | 'hat' | 'synth' | 'snare';
export const INSTRUMENTS: readonly Instrument[] = ['kick', 'hat', 'synth', 'snare'];
export type PatternLength = 16 | 32;

export interface Cell {
  instrument: Instrument;
  col: number;
  row: number;
}

export interface NoteEvent {
  instrument: Instrument;
  col: number;
  row: number;
}

export class Sequencer {
  cells: Cell[] = [];
  stepIndex = 0;
  length: PatternLength = 16;
  loop: { start: number; end: number } | null = null;

  private skips = new Set<string>();

  inGrid(col: number, row: number): boolean {
    return (
      Number.isInteger(col) &&
      Number.isInteger(row) &&
      col >= 0 &&
      col < MAX_STEPS &&
      row >= 0 &&
      row < GRID_ROWS
    );
  }

  cellAt(col: number, row: number): Cell | null {
    return this.cells.find((cell) => cell.col === col && cell.row === row) ?? null;
  }

  set(instrument: Instrument, col: number, row: number): boolean {
    if (!this.inGrid(col, row)) return false;
    const cell = this.cellAt(col, row);
    if (cell) {
      if (cell.instrument === instrument) return false;
      cell.instrument = instrument;
      return true;
    }
    this.cells.push({ instrument, col, row });
    return true;
  }

  erase(col: number, row: number): boolean {
    const index = this.cells.findIndex((cell) => cell.col === col && cell.row === row);
    if (index === -1) return false;
    this.cells.splice(index, 1);
    return true;
  }

  clear(): void {
    this.cells = [];
    this.skips.clear();
  }

  rewind(): void {
    this.stepIndex = this.loop?.start ?? 0;
    this.skips.clear();
  }

  // Notes past the length are kept, so switching back to 32 steps brings them back.
  setLength(length: PatternLength): void {
    this.length = length;
    if (this.loop && this.loop.end >= length) this.loop = null;
    if (this.stepIndex >= length) this.stepIndex = this.loop?.start ?? 0;
  }

  // The loop needs at least two steps inside the pattern length.
  setLoop(start: number, end: number): boolean {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    if (!Number.isInteger(low) || !Number.isInteger(high)) return false;
    if (low < 0 || high >= this.length || low === high) return false;
    this.loop = { start: low, end: high };
    return true;
  }

  clearLoop(): void {
    this.loop = null;
  }

  stepAfter(step: number): number {
    if (this.loop) {
      return step >= this.loop.start && step < this.loop.end ? step + 1 : this.loop.start;
    }
    return (step + 1) % this.length;
  }

  // A note recorded live has already sounded, so it skips the next time its step plays.
  skipOnce(col: number, row: number): void {
    this.skips.add(`${col},${row}`);
  }

  activeCells(): Cell[] {
    return this.cells.filter((cell) => cell.col < this.length);
  }

  step(): NoteEvent[] {
    const notes: NoteEvent[] = [];
    for (const cell of this.cells) {
      if (cell.col !== this.stepIndex) continue;
      const key = `${cell.col},${cell.row}`;
      if (this.skips.has(key)) {
        this.skips.delete(key);
        continue;
      }
      notes.push({ instrument: cell.instrument, col: cell.col, row: cell.row });
    }
    this.stepIndex = this.stepAfter(this.stepIndex);
    return notes;
  }
}
