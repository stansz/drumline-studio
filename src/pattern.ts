import { GRID_ROWS, MAX_STEPS, parseBpm } from './config';
import { DEFAULT_SAMPLE } from './samples';
import { INSTRUMENTS, type Cell, type Instrument, type PatternLength } from './sequencer';

export interface SavedPattern {
  length: PatternLength;
  cells: Cell[];
}

export interface SharedBeat extends SavedPattern {
  bpm: number;
  themeId: string;
  sampleId: string;
}

function validCell(instrument: unknown, col: unknown, row: unknown): Cell | null {
  if (typeof instrument !== 'string' || !(INSTRUMENTS as readonly string[]).includes(instrument)) {
    return null;
  }
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  const c = col as number;
  const r = row as number;
  if (c < 0 || c >= MAX_STEPS || r < 0 || r >= GRID_ROWS) return null;
  return { instrument: instrument as Instrument, col: c, row: r };
}

// Keeps the first note on each cell and drops anything invalid.
function cleanCells(cells: Array<Cell | null>): Cell[] {
  const seen = new Set<string>();
  const result: Cell[] = [];
  for (const cell of cells) {
    if (!cell) continue;
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cell);
  }
  return result;
}

export function serializePattern(pattern: SavedPattern): string {
  return JSON.stringify({
    v: 1,
    length: pattern.length,
    cells: pattern.cells.map((cell) => [cell.instrument, cell.col, cell.row]),
  });
}

export function parsePattern(text: string | null): SavedPattern | null {
  if (text === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.v !== 1 || !Array.isArray(record.cells)) return null;
  const length: PatternLength = record.length === 32 ? 32 : 16;
  const cells = cleanCells(
    record.cells.map((entry) =>
      Array.isArray(entry) ? validCell(entry[0], entry[1], entry[2]) : null,
    ),
  );
  return { length, cells };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

// Link formats:
// v1.<length>.<bpm>.<theme id>.<cells>, where each cell is two bytes: the step, then
// row * 4 + instrument index.
// v2.<length>.<bpm>.<theme id>.<sample id>.<cells>, where each cell is two bytes: the step,
// then row * 5 + instrument index.
export function encodeShare(beat: SharedBeat): string {
  const bytes = new Uint8Array(beat.cells.length * 2);
  beat.cells.forEach((cell, i) => {
    bytes[i * 2] = cell.col;
    bytes[i * 2 + 1] = cell.row * 5 + INSTRUMENTS.indexOf(cell.instrument);
  });
  return [
    'v2',
    beat.length,
    parseBpm(String(beat.bpm)),
    beat.themeId,
    beat.sampleId,
    toBase64Url(bytes),
  ].join('.');
}

function decodeCells(bytes: Uint8Array, instrumentCount: number): Cell[] {
  const cells: Array<Cell | null> = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const packed = bytes[i + 1] ?? 0;
    cells.push(
      validCell(
        INSTRUMENTS[packed % instrumentCount],
        bytes[i],
        Math.floor(packed / instrumentCount),
      ),
    );
  }
  return cleanCells(cells);
}

export function decodeShare(text: string): SharedBeat | null {
  const parts = text.split('.');
  if (parts[0] === 'v1') {
    if (parts.length !== 5) return null;
    const [, lengthText, bpmText, themeId, cellText] = parts as [
      string,
      string,
      string,
      string,
      string,
    ];
    if (lengthText !== '16' && lengthText !== '32') return null;
    if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
    const bytes = fromBase64Url(cellText);
    if (!bytes || bytes.length % 2 !== 0) return null;
    return {
      length: lengthText === '32' ? 32 : 16,
      bpm: parseBpm(bpmText),
      themeId,
      sampleId: DEFAULT_SAMPLE,
      cells: decodeCells(bytes, 4),
    };
  }
  if (parts[0] !== 'v2') return null;
  if (parts.length !== 6) return null;
  const [, lengthText, bpmText, themeId, sampleId, cellText] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (lengthText !== '16' && lengthText !== '32') return null;
  if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
  if (!/^[a-z0-9-]{1,24}$/.test(sampleId)) return null;
  const bytes = fromBase64Url(cellText);
  if (!bytes || bytes.length % 2 !== 0) return null;
  return {
    length: lengthText === '32' ? 32 : 16,
    bpm: parseBpm(bpmText),
    themeId,
    sampleId,
    cells: decodeCells(bytes, 5),
  };
}
