import type { Cell } from './sequencer';

export const MIDI_PPQ = 96;
export const TICKS_PER_STEP = MIDI_PPQ / 4;
const DRUM_NOTES = { kick: 36, snare: 38, hat: 42 } as const;
const DRUM_CHANNEL = 9;
const SYNTH_CHANNEL = 0;
const VELOCITY = 100;

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

// One pass of the pattern as a type-0 MIDI file. Drums and the sample use General MIDI channel
// 10, and the synth plays the theme's scale on channel 1. Each sample cell uses
// `sampleNoteFor` with its own sample id, so it gets that preset's General MIDI drum note. The
// track ends exactly at the pattern length, so it loops cleanly in a DAW.
export function patternToMidi(
  cells: readonly Cell[],
  length: number,
  bpm: number,
  synthScale: readonly number[],
  sampleNoteFor: (sample: string | undefined) => number,
): Uint8Array<ArrayBuffer> {
  type Event = { tick: number; order: number; data: number[] };
  const events: Event[] = [];
  for (const cell of cells) {
    if (cell.col >= length) continue;
    const start = cell.col * TICKS_PER_STEP;
    const end = start + TICKS_PER_STEP;
    const channel = cell.instrument === 'synth' ? SYNTH_CHANNEL : DRUM_CHANNEL;
    let note: number;
    if (cell.instrument === 'synth') {
      note = synthScale[7 - cell.row] ?? 60;
    } else if (cell.instrument === 'sample') {
      note = sampleNoteFor(cell.sample);
    } else {
      note = DRUM_NOTES[cell.instrument];
    }
    events.push({ tick: start, order: 1, data: [0x90 | channel, note, VELOCITY] });
    events.push({ tick: end, order: 0, data: [0x80 | channel, note, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const microseconds = Math.round(60000000 / bpm);
  const track: number[] = [
    0x00, 0xff, 0x51, 0x03, (microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff,
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
  ];
  let tick = 0;
  for (const event of events) {
    track.push(...variableLength(event.tick - tick), ...event.data);
    tick = event.tick;
  }
  track.push(...variableLength(length * TICKS_PER_STEP - tick), 0xff, 0x2f, 0x00);

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (MIDI_PPQ >> 8) & 0xff, MIDI_PPQ & 0xff];
  const size = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff];
  return Uint8Array.from([...header, ...trackHeader, ...track]);
}
