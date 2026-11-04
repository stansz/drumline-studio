# MIDI support: project brief

Start-here notes for a new Claude session. **This is a plan. None of it is built yet.** Unlike the
files in `docs/`, it describes future work. Delete or update it once the work ships.

## The idea

Let Drumline Studio talk to hardware over Web MIDI, starting with the user's Arturia MicroFreak.
Twisting real knobs beats dragging sliders with a mouse.

- The MicroFreak is 4-voice paraphonic: its voices share one analog filter. It suits one melody or
  bass track, not chords.
- The user sees it as an instrument, not a replacement for the browser synth.

Build it here first, then copy it into Drumline Radio (`stansz/drumline-radio`), the same way Radio
grew out of Studio.

## Design (agreed in principle)

The design has three layers. The first two know nothing about Studio, so Radio can reuse them
unchanged.

1. **`src/webmidi/` connection.** `src/midi.ts` already exists: it exports the pattern as a `.mid`
   file. Keep the live code separate, but reuse that file's channel and drum-note choices so a track
   lands on the same channel either way.

   The connection layer is a small wrapper around `navigator.requestMIDIAccess`. It:
   - lists devices and notices when one is plugged in or out;
   - turns raw bytes into events (note on and off, CC/knob, clock);
   - sends notes and clock out.

   It has no app code.
2. **Mapping.** The app registers named controls with ranges, such as `tempo`, `filter`, and
   `track1.volume`.
   - "MIDI learn": click a control, turn a knob, and they are linked.
   - Mappings are saved in localStorage, inside `try`/`catch`.
   - It is pure logic, so Vitest can test it.
3. **App glue.** The only Studio-specific part, kept thin.

## Order

1. **Knobs in, plus MIDI learn.** This is the first release, and it builds the base for the rest.
2. **Notes out.** A sequencer track plays on the MicroFreak, so its analog filter is in the beat.
3. **Clock sync.** Studio sends MIDI clock, so the MicroFreak's arpeggiator follows its tempo, or
   the other way round.
4. **Notes in.** Play keys to enter steps or audition sounds.

## Later, in Drumline Radio

- **Send a track to MIDI.** A per-track setting sends that track's notes to the synth and mutes it in
  the browser. It works best for bass or lead, because of the 4-note limit.
  - Use the engine's lookahead (about 0.1 s) to send notes with timestamps for exact timing.
  - Add a latency offset to line up the synth with the browser's audio.
  - Send all-notes-off on pause, seek, or a song change.
- **Knobs** control the master filter, echo, crush, volume, and track volumes. The volumes tie in to
  the per-track mixer idea parked in Radio.

## Limits

- Web MIDI works in Chrome, Edge, and recent Firefox, but not in Safari or on iOS.
- The browser asks for MIDI permission once per site. GitHub Pages serves over HTTPS, which Web MIDI
  needs.
- Timing is solid for clock and notes, but not as tight as a hardware MIDI cable.

## How to start

1. Read the current code (`src/audio.ts`, the sequencer timing, and the UI controls) to find where
   the controls live and how they would register.
2. Give options with a recommendation, then wait for "go".
3. Hand the code to dsh (`dsh --profile headless`), as in `AGENTS.md`.
