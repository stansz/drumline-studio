# Plan: 4 new grooves, 4 new tunes, 2 new carols, and 3 tunes extended to 64 steps

## Goal

Add 10 presets and replace 3 existing ones in `src/presets.ts`, using the exact preset objects in
`.handoff/new-presets.txt` (generated and checked already: no two notes share a position). Update
tests and docs to match.

## Files to touch

- `src/presets.ts`
- `tests/presets.test.ts`
- `docs/guide.md`
- `README.md`

## Steps

1. `src/presets.ts`, `SCALES`: add three entries after `'god-rest-ye'`, with comments in the same style:
   - `'d-major': [66, 67, 69, 71, 73, 74, 76, 78], // F#4 G4 A4 B4 C#5 D5 E5 F#5`
   - `'g-major-high': [74, 76, 78, 79, 81, 83, 84, 86], // D5 E5 F#5 G5 A5 B5 C6 D6`
   - `'g-major': [62, 64, 66, 67, 69, 71, 72, 74], // D4 E4 F#4 G4 A4 B4 C5 D5`
2. `src/presets.ts`, `PRESETS`. `.handoff/new-presets.txt` holds 13 preset object literals, each
   preceded by a `// <id>` marker line (do not copy the marker lines). Copy each object literal
   verbatim (you may reformat whitespace only, e.g. one `[col, row]` pair per line like the existing
   presets):
   - Insert `disco`, `lofi-groove`, `synthwave-drive`, `drum-and-bass` (in that order) right after the
     `funk` preset.
   - Insert `canon`, `swan-lake`, `eine-kleine`, `saints` (in that order) right after the `can-can`
     preset.
   - Insert `hark-the-herald`, `good-king-wenceslas` (in that order) right after the `god-rest-ye`
     preset.
   - Replace the existing `ode-to-joy`, `jingle-bells`, and `fur-elise` presets in place (same
     position in the array) with the versions from the file.
   - Update the comment above `PRESETS` so it names the sources: Korobeiniki (1861), Grieg (1875),
     Beethoven (1810, 1824), Offenbach (1858), Pachelbel (around 1680), Tchaikovsky (1876),
     Mozart (1787), and the traditional "When the Saints Go Marching In"; holiday tunes: Pierpont
     (1857), Mason (1839), Mendelssohn (1840), and traditional English and Welsh carols. Keep the line
     "Do not add copyrighted songs."
3. `tests/presets.test.ts`:
   - Replace the test "makes every preset 32 steps long" with: every `groove` is 32 steps; every
     `tune` and `holiday` preset is 32 or 64 steps.
   - In "writes the four new tunes", change `expect(preset?.length).toBe(32)` to
     `expect([32, 64]).toContain(preset?.length)`. Do the same in "writes the four holiday tunes".
   - Add a test "writes the new tunes and carols": for each of
     `['canon', 'tune', 0]`, `['swan-lake', 'tune', 0]`, `['eine-kleine', 'tune', 4]`,
     `['saints', 'tune', 3]`, `['hark-the-herald', 'holiday', 7]`,
     `['good-king-wenceslas', 'holiday', 4]` (id, kind, row of the synth note at column 0): the preset
     exists, has that kind, its `scale` is a key of `SCALES`, and its earliest synth cell is
     `{ instrument: 'synth', col: 0, row }`.
   - Add a test "adds four new grooves": `disco`, `lofi-groove`, `synthwave-drive`, `drum-and-bass`
     exist, are `kind: 'groove'`, 32 steps, `scale: null`, and each has at least one kick cell.
   - Add a test: `ode-to-joy`, `jingle-bells`, and `fur-elise` are 64 steps.
4. `docs/guide.md`: in the Beats section list, Grooves becomes: Four on the Floor, Boom Bap,
   Breakbeat, Trap, Dembow, Funk Groove, Disco, Lo-fi Groove, Synthwave Drive, Drum & Bass. Tunes:
   Korobeiniki, In the Hall of the Mountain King, Ode to Joy, Für Elise, Can-Can, Canon in D, Swan
   Lake, Eine kleine Nachtmusik, When the Saints Go Marching In. Holiday: Jingle Bells, Deck the
   Halls, Joy to the World, God Rest Ye Merry Gentlemen, Hark! The Herald Angels Sing, Good King
   Wenceslas. Add one sentence: grooves are 32 steps, and tunes are 32 or 64 steps.
5. `README.md`:
   - Features bullet: "ten ready-made grooves, nine public-domain tunes, and six Christmas carols,
     plus a random groove maker with undo."
   - Credits: after the Can-Can, add Canon in D (Pachelbel, around 1680), Swan Lake (Tchaikovsky,
     1876), Eine kleine Nachtmusik (Mozart, 1787), and When the Saints Go Marching In (traditional);
     the carol sentence adds Hark! The Herald Angels Sing (Mendelssohn, 1840) and Good King
     Wenceslas (traditional melody, words 1853).

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `grep -c "^    id: '" src/presets.ts` prints `25`.
- `grep -n "'d-major'\|'g-major-high'\|'g-major'" src/presets.ts` shows the three scales and their uses.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any note, row, step, bpm, theme, or blurb in the generated presets. If a test fails
  because of the data, stop and report it instead of editing the data.
- Do not change other presets.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- Follow `AGENTS.md`.

## Out of scope

- UI, audio, or theme changes. Screenshots.

## If blocked

Stop and write what failed and why to `.handoff/report.md`.
