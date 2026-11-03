# Plan: allow 64-step patterns

## Goal

Patterns can be 16, 32, or 64 steps long. The Length button and **L** key cycle 16 → 32 → 64 → 16.
With 64 steps the board has 4 pages of 16. Share links get a new version, `v6`, that carries 64;
every older version still decodes exactly as before.

## Files to touch

- `src/config.ts`
- `src/sequencer.ts`
- `src/pattern.ts`
- `src/main.ts`
- `tests/sequencer.test.ts`
- `tests/pattern.test.ts`
- `tests/presets.test.ts`
- `tests/midi.test.ts`
- `README.md`
- `docs/guide.md`
- `docs/references.md`
- `AGENTS.md`

## Steps

1. `src/config.ts`: `MAX_STEPS = 64`.
2. `src/sequencer.ts`: `export type PatternLength = 16 | 32 | 64;`. Update the comment on
   `setLength` ("switching back to 32 steps" → "switching back to a longer length").
3. `src/pattern.ts`:
   - Add `function parseLength(text: string, allow64: boolean): PatternLength | null` returning 16,
     32, or (only when `allow64`) 64 for the strings `'16'`, `'32'`, `'64'`, else `null`. Use it in
     the v1–v5 decoders with `allow64 = false` (behaviour unchanged: `'64'` is rejected there).
   - `parsePattern` (the local save, `v: 1`): length is `64` if `record.length === 64`, `32` if
     `record.length === 32`, else `16`.
   - `encodeShare` writes `'v6'` instead of `'v5'`. The v6 layout is identical to v5 (8 dot-separated
     parts: version, length, bpm, theme, sample, scale, sample table, cells).
   - `decodeShare`: keep the v5 branch exactly as it is (16 or 32 only). Add a v6 branch identical to
     v5 except it uses `parseLength(lengthText, true)`. Simplest: make the v5 branch handle both
     `parts[0] === 'v5' || parts[0] === 'v6'` and pass `allow64 = parts[0] === 'v6'`.
   - Update the comment listing share-link versions if there is one.
4. `src/main.ts`:
   - Add `function nextLength(length: PatternLength): PatternLength` → 16→32, 32→64, 64→16. Use it
     for the Length button click and the `l` key.
   - Add `function pageCount(): number { return sequencer.length / GRID_COLS; }`.
   - `setLength`: `if (page >= sequencer.length / GRID_COLS) setPage(0);` (replaces
     `if (length === 16) setPage(0);`); `lengthButton.classList.toggle('selected', length > 16)`;
     `pageButton.hidden = length === 16`.
   - Page button click and the `p` key: `setPage((page + 1) % pageCount())` when the length is over 16
     (the `p` key keeps its `setFollow(false)` and its guard, changed from `=== 32` to `> 16`).
   - `updateFollowButton`: unchanged (`hidden = sequencer.length === 16`).
   - `frame()`: follow check `sequencer.length === 32` → `sequencer.length > 16`.
   - `randomize()`: `if (sequencer.length === 32) setLength(16);` → `if (sequencer.length !== 16)`.
   - Search `main.ts` for any other `=== 32`, `32 ?`, or two-page assumption (`page === 0 ? 1 : 0`)
     and convert it the same way.
5. Tests:
   - `tests/sequencer.test.ts`: the "outside the grid" and "keeps columns up to 31" tests become
     column 63 allowed, 64 rejected (rename the second test to "keeps columns up to 63 in the
     grid"). Add a test: `setLength(64)` then stepping 64 times from 0 returns to step 0, passing
     through step 63.
   - `tests/pattern.test.ts`:
     - The invalid-cell test's `['kick', 32, 0]` becomes `['kick', 64, 0]`.
     - Add: a 64-step pattern round-trips through `serializePattern`/`parsePattern`.
     - Add: `encodeShare` of a 64-step beat with a cell at column 63 starts with `v6.64.` and
       `decodeShare` returns length 64 and that cell.
     - Add: a v5 link with length `64` (build it by taking an `encodeShare` result for a 32-step beat
       and replacing the prefix `v6.32.` with `v5.64.`) decodes to `null`.
     - Add: a v5 link (same trick: `v6.32.` → `v5.32.`) still decodes to length 32.
     - Update the existing format regex expecting `v5\.(16|32)` to `v6\.(16|32|64)`.
   - `tests/presets.test.ts`: the length check `[16, 32]` → `[16, 32, 64]`. Keep the
     "makes every preset 32 steps long" test as is.
   - `tests/midi.test.ts`: the `for (const length of [16, 32])` loop → `[16, 32, 64]`, if the test's
     body works for 64; otherwise leave it and say why in the report.
6. Docs (describe only what the code now does):
   - `README.md`: "on a 16-, 32-, or 64-step grid".
   - `docs/guide.md`: header line ("**Length** (16, 32, or 64 steps), **Page** and **Follow** (with
     32 or 64 steps)"); the Length paragraph (16 → 32 → 64; with 32 steps Page flips between steps
     1–16 and 17–32, with 64 steps it steps through 4 pages: 1–16, 17–32, 33–48, 49–64; notes past
     the length are kept but silent); the shortcut table (**L** "16, 32, or 64 steps", **P** "Next
     page (32 or 64 steps)", **F** "Follow on or off (32 or 64 steps)").
   - `docs/references.md`: the paging paragraph near "With 32 steps, the board shows one page" (pages
     of 16, offset `page * 16`, up to 4 pages); the share-link section gets v6 (same as v5 but allows
     length 64; new links are written as v6).
   - `AGENTS.md`: first line "a 16-, 32-, or 64-step pattern"; share-link rule lists `v6.` too.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `grep -n "MAX_STEPS = 64" src/config.ts` matches.
- `grep -n "'v6'" src/pattern.ts` matches.
- `grep -n "page === 0 ? 1 : 0" src/main.ts` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change how v1–v5 links decode. Do not change `src/presets.ts`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- Follow `AGENTS.md`.

## Out of scope

- New or changed presets.
- Random stays 16 steps.
- No layout or CSS changes; no screenshots.

## If blocked

Stop and write what failed and why to `.handoff/report.md`.
