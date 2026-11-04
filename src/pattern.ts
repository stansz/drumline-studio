import { GRID_ROWS, MAX_STEPS, parseBpm } from './config';
import { DEFAULT_SAMPLE } from './samples';
import { INSTRUMENTS, type Cell, type Instrument, type PatternLength } from './sequencer';

export interface SavedPattern {
  length: PatternLength;
  cells: Cell[];
  scale?: string;
}

export interface SharedBeat extends SavedPattern {
  bpm: number;
  themeId: string;
  sampleId: string;
}

function validSample(sample: unknown): string | undefined {
  return typeof sample === 'string' && /^[a-z0-9-]{1,24}$/.test(sample) ? sample : undefined;
}

function validScale(scale: unknown): string | undefined {
  return typeof scale === 'string' && /^[a-z0-9-]{1,24}$/.test(scale) ? scale : undefined;
}

function parseLength(text: string, allowed: readonly PatternLength[]): PatternLength | null {
  if (text === '16') return allowed.includes(16) ? 16 : null;
  if (text === '32') return allowed.includes(32) ? 32 : null;
  if (text === '48') return allowed.includes(48) ? 48 : null;
  if (text === '64') return allowed.includes(64) ? 64 : null;
  return null;
}

function validCell(instrument: unknown, col: unknown, row: unknown, sample?: unknown): Cell | null {
  if (typeof instrument !== 'string' || !(INSTRUMENTS as readonly string[]).includes(instrument)) {
    return null;
  }
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  const c = col as number;
  const r = row as number;
  if (c < 0 || c >= MAX_STEPS || r < 0 || r >= GRID_ROWS) return null;
  const cell: Cell = { instrument: instrument as Instrument, col: c, row: r };
  if (instrument === 'sample') {
    const id = validSample(sample);
    if (id !== undefined) cell.sample = id;
  }
  return cell;
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
  const data: Record<string, unknown> = {
    v: 1,
    length: pattern.length,
    cells: pattern.cells.map((cell) =>
      cell.instrument === 'sample' && cell.sample !== undefined
        ? [cell.instrument, cell.col, cell.row, cell.sample]
        : [cell.instrument, cell.col, cell.row],
    ),
  };
  if (pattern.scale !== undefined) data.scale = pattern.scale;
  return JSON.stringify(data);
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
  const length: PatternLength =
    record.length === 64 ? 64 : record.length === 48 ? 48 : record.length === 32 ? 32 : 16;
  const cells = cleanCells(
    record.cells.map((entry) =>
      Array.isArray(entry) ? validCell(entry[0], entry[1], entry[2], entry[3]) : null,
    ),
  );
  const scale = validScale(record.scale);
  return scale === undefined ? { length, cells } : { length, cells, scale };
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
// v3.<length>.<bpm>.<theme id>.<picked sample id>.<sample table>.<cells>, where the sample table
// lists the distinct sample ids the sample cells use, in first-use order, joined with '_'. Each
// cell is three bytes: the step, then row * 5 + instrument index, then the sample-table index.
// v4 is the same as v3, except the instrument index is one of six, so the second byte is
// row * 6 + instrument index.
// v5 is the same as v4, plus a scale id after the sample id, empty for the theme's own scale:
// v5.<length>.<bpm>.<theme id>.<picked sample id>.<scale id>.<sample table>.<cells>.
// v6 is the same as v5, except the length may be 64.
// v7 is the same as v6, except the length may be 48. New links are written as v7.
const MAX_SAMPLE_TABLE = 16;

export function encodeShare(beat: SharedBeat): string {
  const sampleTable: string[] = [];
  const bytes = new Uint8Array(beat.cells.length * 3);
  beat.cells.forEach((cell, i) => {
    let sampleIndex = 0;
    if (cell.instrument === 'sample' && cell.sample !== undefined) {
      const existing = sampleTable.indexOf(cell.sample);
      if (existing >= 0) {
        sampleIndex = existing;
      } else if (sampleTable.length < MAX_SAMPLE_TABLE) {
        sampleIndex = sampleTable.length;
        sampleTable.push(cell.sample);
      }
    }
    bytes[i * 3] = cell.col;
    bytes[i * 3 + 1] = cell.row * 6 + INSTRUMENTS.indexOf(cell.instrument);
    bytes[i * 3 + 2] = sampleIndex;
  });
  return [
    'v7',
    beat.length,
    parseBpm(String(beat.bpm)),
    beat.themeId,
    beat.sampleId,
    beat.scale ?? '',
    sampleTable.join('_'),
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

function decodeV3Cells(
  bytes: Uint8Array,
  instrumentCount: number,
  sampleTable: readonly string[],
): Cell[] {
  const cells: Array<Cell | null> = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const packed = bytes[i + 1] ?? 0;
    cells.push(
      validCell(
        INSTRUMENTS[packed % instrumentCount],
        bytes[i],
        Math.floor(packed / instrumentCount),
        sampleTable[bytes[i + 2] ?? 0],
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
    const length = parseLength(lengthText, [16, 32]);
    if (length === null) return null;
    if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
    const bytes = fromBase64Url(cellText);
    if (!bytes || bytes.length % 2 !== 0) return null;
    return {
      length,
      bpm: parseBpm(bpmText),
      themeId,
      sampleId: DEFAULT_SAMPLE,
      cells: decodeCells(bytes, 4),
    };
  }
  if (parts[0] === 'v2') {
    if (parts.length !== 6) return null;
    const [, lengthText, bpmText, themeId, sampleId, cellText] = parts as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const length = parseLength(lengthText, [16, 32]);
    if (length === null) return null;
    if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
    if (!/^[a-z0-9-]{1,24}$/.test(sampleId)) return null;
    const bytes = fromBase64Url(cellText);
    if (!bytes || bytes.length % 2 !== 0) return null;
    const cells = decodeCells(bytes, 5).map((cell) =>
      cell.instrument === 'sample' ? { ...cell, sample: sampleId } : cell,
    );
    return {
      length,
      bpm: parseBpm(bpmText),
      themeId,
      sampleId,
      cells,
    };
  }
  if (parts[0] === 'v5' || parts[0] === 'v6' || parts[0] === 'v7') {
    if (parts.length !== 8) return null;
    const [, lengthText, bpmText, themeId, sampleId, scaleText, tableText, cellText] = parts as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const length = parseLength(
      lengthText,
      parts[0] === 'v5' ? [16, 32] : parts[0] === 'v6' ? [16, 32, 64] : [16, 32, 48, 64],
    );
    if (length === null) return null;
    if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
    if (!/^[a-z0-9-]{1,24}$/.test(sampleId)) return null;
    const scale = scaleText === '' ? undefined : validScale(scaleText);
    if (scaleText !== '' && scale === undefined) return null;
    const sampleTable = tableText === '' ? [] : tableText.split('_');
    for (const id of sampleTable) {
      if (!/^[a-z0-9-]{1,24}$/.test(id)) return null;
    }
    const bytes = fromBase64Url(cellText);
    if (!bytes || bytes.length % 3 !== 0) return null;
    return {
      length,
      bpm: parseBpm(bpmText),
      themeId,
      sampleId,
      ...(scale === undefined ? {} : { scale }),
      cells: decodeV3Cells(bytes, 6, sampleTable),
    };
  }
  if (parts[0] !== 'v3' && parts[0] !== 'v4') return null;
  const instrumentCount = parts[0] === 'v4' ? 6 : 5;
  if (parts.length !== 7) return null;
  const [, lengthText, bpmText, themeId, sampleId, tableText, cellText] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const length = parseLength(lengthText, [16, 32]);
  if (length === null) return null;
  if (!/^[a-z0-9-]{1,24}$/.test(themeId)) return null;
  if (!/^[a-z0-9-]{1,24}$/.test(sampleId)) return null;
  const sampleTable = tableText === '' ? [] : tableText.split('_');
  for (const id of sampleTable) {
    if (!/^[a-z0-9-]{1,24}$/.test(id)) return null;
  }
  const bytes = fromBase64Url(cellText);
  if (!bytes || bytes.length % 3 !== 0) return null;
  return {
    length,
    bpm: parseBpm(bpmText),
    themeId,
    sampleId,
    cells: decodeV3Cells(bytes, instrumentCount, sampleTable),
  };
}
