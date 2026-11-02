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
  }

  rewind(): void {
    this.stepIndex = 0;
  }

  // Notes past the length are kept, so switching back to 32 steps brings them back.
  setLength(length: PatternLength): void {
    this.length = length;
    if (this.stepIndex >= length) this.stepIndex = 0;
  }

  activeCells(): Cell[] {
    return this.cells.filter((cell) => cell.col < this.length);
  }

  step(): NoteEvent[] {
    const notes = this.cells
      .filter((cell) => cell.col === this.stepIndex)
      .map((cell) => ({ instrument: cell.instrument, col: cell.col, row: cell.row }));
    this.stepIndex = (this.stepIndex + 1) % this.length;
    return notes;
  }
}
