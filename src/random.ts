import type { Cell } from './sequencer';

export type Rng = () => number; // 0 <= value < 1

// A seeded generator for tests and repeatable results.
export function seededRng(seed: number): Rng {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const STEPS = 16;
const EVERY_STEP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const EVEN_STEPS = [0, 2, 4, 6, 8, 10, 12, 14];
const OFFBEATS = [2, 6, 10, 14];
const ODD_STEPS = [1, 3, 5, 7, 9, 11, 13, 15];

// A musical random 16-step groove: kick on the downbeat, snare on 2 and 4, a hat pattern,
// a bass line that follows the kick, and a few synth notes in key (rows are scale degrees).
export function randomPattern(rng: Rng): Cell[] {
  const cells: Cell[] = [];
  const used = new Set<string>();
  const add = (cell: Cell): void => {
    const key = `${cell.col},${cell.row}`;
    if (used.has(key)) return;
    used.add(key);
    cells.push(cell);
  };

  // Kick: always the downbeat, on 8 with a high chance, and sparser on the other steps.
  const kickSteps: number[] = [];
  for (let col = 0; col < STEPS; col += 1) {
    let hit: boolean;
    if (col === 0) {
      hit = true;
    } else if (col === 8) {
      hit = rng() < 0.8;
    } else if (col % 2 === 0) {
      hit = rng() < 0.2;
    } else {
      hit = rng() < 0.08;
    }
    if (hit) kickSteps.push(col);
  }
  for (const col of kickSteps) add({ instrument: 'kick', col, row: 6 });

  // Snare: the backbeat, plus the odd ghost.
  add({ instrument: 'snare', col: 4, row: 5 });
  add({ instrument: 'snare', col: 12, row: 5 });
  if (rng() < 0.4) {
    add({ instrument: 'snare', col: ODD_STEPS[Math.floor(rng() * ODD_STEPS.length)] ?? 1, row: 1 });
  }

  // Hat: one row, one of three patterns.
  const hatRow = rng() < 0.5 ? 2 : 3;
  const hatPattern = Math.floor(rng() * 3);
  const hatSteps = hatPattern === 0 ? EVEN_STEPS : hatPattern === 1 ? EVERY_STEP : OFFBEATS;
  for (const col of hatSteps) add({ instrument: 'hat', col, row: hatRow });

  // Bass: follows the kick closely, mostly on the root.
  const bassRows = [7, 7, 5, 4, 3];
  for (const col of kickSteps) {
    if (rng() >= 0.85) continue;
    add({ instrument: 'bass', col, row: bassRows[Math.floor(rng() * bassRows.length)] ?? 7 });
  }

  // Synth: a few notes on separate steps, in the scale rows above the bass.
  const synthCount = 3 + Math.floor(rng() * 4);
  const openSteps = [...EVERY_STEP];
  for (let i = 0; i < synthCount; i += 1) {
    const [col = 0] = openSteps.splice(Math.floor(rng() * openSteps.length), 1);
    const freeRows = [1, 2, 3, 4, 5, 6].filter((row) => !used.has(`${col},${row}`));
    const row = freeRows[Math.floor(rng() * freeRows.length)] ?? 1;
    add({ instrument: 'synth', col, row });
  }

  // Sample: a clap on the backbeat, half the time.
  if (rng() < 0.5) {
    add({ instrument: 'sample', col: 4, row: 7, sample: 'clap' });
    add({ instrument: 'sample', col: 12, row: 7, sample: 'clap' });
  }

  return cells;
}
