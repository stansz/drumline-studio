import { GRID_COLS, GRID_ROWS, STEPS_PER_BAR } from './config';

export type Instrument = 'kick' | 'hat' | 'synth';
export const INSTRUMENTS: readonly Instrument[] = ['kick', 'hat', 'synth'];

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

  inGrid(col: number, row: number): boolean {
    return (
      Number.isInteger(col) &&
      Number.isInteger(row) &&
      col >= 0 &&
      col < GRID_COLS &&
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

  step(): NoteEvent[] {
    const notes = this.cells
      .filter((cell) => cell.col === this.stepIndex)
      .map((cell) => ({ instrument: cell.instrument, col: cell.col, row: cell.row }));
    this.stepIndex = (this.stepIndex + 1) % STEPS_PER_BAR;
    return notes;
  }
}
