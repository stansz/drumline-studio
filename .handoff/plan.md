# Plan: 48-step patterns (v7 share links), Ride of the Valkyries, and three waltz-time carols

## Goal

Allow a 48-step pattern length (three pages), write share links as `v7` (same layout as v6, allows
48), and add four presets from `.handoff/new-presets.txt` (already generated and checked: no two
notes share a position). Update tests and docs to match.

## Files to touch

- `src/sequencer.ts`
- `src/pattern.ts`
- `src/main.ts`
- `src/presets.ts`
- `tests/pattern.test.ts`
- `tests/presets.test.ts`
- `tests/sequencer.test.ts` (only if it asserts the set of lengths)
- `docs/guide.md`
- `docs/references.md`
- `README.md`
- `AGENTS.md`

## Steps

1. `src/sequencer.ts`: `export type PatternLength = 16 | 32 | 48 | 64;`.
2. `src/pattern.ts`:
   - Change `parseLength(text: string, allow64: boolean)` to
     `parseLength(text: string, allowed: readonly PatternLength[])`, returning the length if `text`
     is `'16'`, `'32'`, `'48'`, or `'64'` and that number is in `allowed`, else `null`.
   - Callers: v1, v2, v3, v4, v5 pass `[16, 32]`; v6 passes `[16, 32, 64]`; v7 passes
     `[16, 32, 48, 64]`.
   - Decode `v7` exactly like v5/v6 (same 8 parts): change the branch condition to
     `parts[0] === 'v5' || parts[0] === 'v6' || parts[0] === 'v7'`.
   - `encodeShare` writes `'v7'` instead of `'v6'`.
   - Format comment: add the line `// v7 is the same as v6, except the length may be 48. New links
     are written as v7.` and change the v6 line to end at "the length may be 64."
   - `parsePattern`: length is `record.length` if it is 32, 48, or 64, else 16.
3. `src/main.ts`:
   - `nextLength`: 16 → 32 → 48 → 64 → 16.
   - Nothing else should assume 16/32/64 only; `pageCount()` already returns `length / GRID_COLS`
     (3 for 48). Check `setLength`, the page button, Follow, and the loop for code that only works
     with 32 or 64 and fix it the same way.
4. `src/presets.ts`:
   - `SCALES`: add after `'g-major'`, same comment style:
     - `'b-minor': [66, 69, 71, 73, 74, 76, 78, 81], // F#4 A4 B4 C#5 D5 E5 F#5 A5`
     - `'we-wish': [60, 62, 64, 66, 67, 69, 71, 72], // C4 D4 E4 F#4 G4 A4 B4 C5`
   - `.handoff/new-presets.txt` holds 4 preset object literals, each preceded by a `// <id>` marker
     line (do not copy the marker lines). Copy each verbatim (whitespace reformatting only, e.g. one
     `[col, row]` pair per line like the existing presets):
     - Insert `valkyries` right after the `saints` preset (last tune).
     - Insert `we-wish`, `o-christmas-tree`, `silent-night` (in that order) right after the
       `good-king-wenceslas` preset (last holiday preset).
   - The comment above `PRESETS`: add Wagner (1870) to the tune sources and Gruber (1818) to the
     holiday sources; add "German" so it reads "traditional English, Welsh, and German carols".
     Keep "Do not add copyrighted songs."
5. `tests/pattern.test.ts`:
   - Change the "produces a v6 link" test to "produces a v7 link", with the regex starting
     `^v7\.(16|32|48|64)\.`.
   - In "writes a 64-step pattern as v6.64 and reads it back", rename to v7.64 and expect
     `link.startsWith('v7.64.')`.
   - In "returns null for a v5 link with length 64" and "still decodes a v5 link with length 32",
     replace `'v6.32.'` (or whatever `v6.` prefix they replace) with the `v7.` equivalent so they
     still build a v5 link.
   - Any other test that expects a `v6.` prefix from `encodeShare` now expects `v7.`.
   - Add: "writes a 48-step pattern as v7.48 and reads it back" (bass cell at col 47, row 0).
   - Add: "returns null for a v6 link with length 48" (take a v7.32 link, replace `'v7.32.'` with
     `'v6.48.'`).
   - Add: "still decodes a v6 link with length 64" (take a v7.64 link, replace `'v7.64.'` with
     `'v6.64.'`; decoded length is 64).
   - Add: `parsePattern` of `JSON.stringify({ v: 1, length: 48, cells: [] })` has length 48.
6. `tests/presets.test.ts`:
   - "uses a known theme, a sane tempo, and a valid length": `[16, 32, 48, 64]`.
   - Rename "makes every groove 32 steps and every tune 32 or 64 steps" to "... every tune 32, 48,
     or 64 steps" and use `[32, 48, 64]`.
   - In "writes the four new tunes", "writes the four holiday tunes", and "writes the new tunes and
     carols", any `[32, 64]` length check becomes `[32, 48, 64]`.
   - Add "adds Ride of the Valkyries and three waltz carols": for each of
     `['valkyries', 'tune', 64, 5]`, `['we-wish', 'holiday', 48, 3]`,
     `['o-christmas-tree', 'holiday', 48, 4]`, `['silent-night', 'holiday', 48, 4]`
     (id, kind, length, row of the synth note at column 0): the preset exists with that kind and
     length, its `scale` is a key of `SCALES`, and its synth cell at col 0 has that row.
7. `tests/sequencer.test.ts`: only if a test lists the valid lengths, add 48.
8. `docs/guide.md`:
   - Header bullet: Length (16, 32, 48, or 64 steps); Page and Follow (with 32, 48, or 64 steps).
   - Length section: "**Length** cycles 16 → 32 → 48 → 64 → 16 steps. With 32 steps, **Page** flips
     the board between steps 1–16 and 17–32; with 48 steps it steps through three pages (1–16, 17–32,
     33–48), and with 64 steps through four: 1–16, 17–32, 33–48, and 49–64. **Follow** appears with
     32, 48, or 64 steps." (keep the rest of the paragraph).
   - Keys table: L = "16, 32, 48, or 64 steps"; P and F = "(32, 48, or 64 steps)".
   - Beats page list: Tunes add "Ride of the Valkyries" at the end; Holiday add "We Wish You a Merry
     Christmas, O Christmas Tree, Silent Night" at the end. The length sentence becomes: "Grooves are
     32 steps, and tunes are 32, 48, or 64 steps. The 48-step carols are in waltz time: four bars of
     3/4, or eight with one step per eighth note."
9. `docs/references.md`:
   - "With 32 or 64 steps, the board shows one page of 16 at a time, up to 4 pages." → "With 32, 48,
     or 64 steps, the board shows one page of 16 at a time, up to 4 pages."
   - Share links: after "v6 is the same as v5, except the length may be 64;" say "v7 is the same as
     v6, except the length may be 48; new links are written as v7." (remove "new links are written
     as v6"). Change any other `v6` = newest statements to `v7`.
10. `README.md`:
    - Instruments bullet: "on a 16-, 32-, 48-, or 64-step grid".
    - Features bullet: "ten ready-made grooves, ten public-domain tunes, and nine Christmas carols,
      plus a random groove maker with undo." (keep any wording after that as it is).
    - Credits: add Ride of the Valkyries (Wagner, 1870) after When the Saints Go Marching In
      (adjust the "and"); the carol sentence adds We Wish You a Merry Christmas and O Christmas Tree
      (traditional) and Silent Night (Gruber, 1818).
11. `AGENTS.md`: "a 16-, 32-, 48-, or 64-step pattern"; share-link list adds `v7.`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `grep -c "^    id: '" src/presets.ts` prints `29`.
- `grep -n "'v7'" src/pattern.ts` shows the encoder.
- `grep -rn "32 or 64" docs README.md AGENTS.md src` prints nothing.

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
- Do not change how v1–v6 links decode, except that v6 is read through the shared v5/v6/v7 branch.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- Follow `AGENTS.md`.

## Out of scope

- UI layout, audio, or theme changes. Screenshots. Time signatures or bar lines.

## If blocked

Stop and write what failed and why to `.handoff/report.md`.
