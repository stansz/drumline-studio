# Music themes

Each theme is one entry in `src/themes.ts`. It sets the arrangement, instrument sounds, space, and
tone. Themes never change the tempo or the pattern.

## Fields that matter for authors

- `blurb`: one line describing the backing music, shown on the Backing info screen. Keep it true to
  the theme's values and under 140 characters; `tests/themes.test.ts` checks the length.
- `chords`: the verse and loop progression, one chord per bar. `chorusChords` is the chorus
  progression. A chord's `pad` notes are what the backing pad and the arpeggio play, and `bass`
  is its bass note.
- `swing`: 0 is straight, and up to 0.3 delays the off-beat sixteenths by that fraction of a step.
  `describeSwing` in `src/song.ts` turns it into the `Straight` or `Swung 22%` text on the info
  screen.
- `space.trim`: the instruments' level against Neon.
- `space.musicTrim`: the backing music's level against Neon, independent of `trim`.

The rest of the theme shapes its sound: `chord`, `bass`, `arp`, `drums`, `drumLevels`, `drumKit`,
`kick`, `hat`, `synth`, and the other `space` values (`reverbSend`, `reverbSeconds`, `delaySend`,
`delayFeedback`, `toneHz`, `crush`), plus `crackle`, vinyl noise heard only while the beat plays.
The playable snare uses each theme's `drumKit.snareHz` and `drumKit.snareDecay`.

## The section form

`SONG_FORM` in `src/song.ts` is verse (8 bars), chorus (8), verse (8), chorus (8), break (4), which
loops every 36 bars. The last bar of each section is a fill: `FILL_STEPS` replace the regular
backing snare with a snare fill over the last four sixteenths.

- A verse plays the theme's `chords` and `layerLevels` as they are.
- A chorus uses `chorusChords` and raises the pad, bass, and arp levels without lowering any.
- A break keeps the pad only: the bass and arp drop out and no backing drums play.

With sections off, the backing is the steady verse loop, with the theme's `chords` and no fill.

## Keeping volume consistent

Neon is the loudness reference, and both of its levels stay at 1: `space.trim` for the instruments
and `space.musicTrim` for the backing music. Each theme sets the two levels separately.

`space.trim` sets the instruments' level. The instrument boards render with no backing music and
are compared with `NEON_BASELINE` in `tests/loudness-baseline.ts`, which holds Neon's average level
for each board. Each theme should land within 1 dB of Neon.

`space.musicTrim` sets the backing music's level on its own: the music bus goes through its own
trim, and `setTheme` divides the master trim back out, so the backing ends up at `musicTrim`
whatever `trim` is. The "backing quiet" and "backing full" boards render backing music only, with
no notes, with sections off (`sectionAt(step, false)`), so they measure the verse arrangement.
Each theme's backing is compared with Neon's backing rendered in the same run, so backing levels
need no baseline. Read `musicOffsets` and `suggestedMusicTrims` on the loudness page; the target is
again within 1 dB of Neon.

The target is an average level, not peak level, because short sounds can peak high and still sound
quiet. The limiter also absorbs part of any boost, so a trim of 2 adds less than 6 dB in practice.

The player's volume slider comes after the limiter and only turns the sound down, so it doesn't
change the mix. The loudness page renders at full volume and doesn't depend on the slider.

The FX panel sits after each theme's sound, so its filter, delay, reverb, and crush shape what the
theme already produces. The FX crush adds to the theme's `space.crush`, and loudness checks are run
with FX off.

## Adding or changing a theme

1. Add or edit the theme in `src/themes.ts`, and add it to `THEMES`.
2. Run `npm test`.
3. Run `npm run dev` and open `/tests/loudness.html?theme=funk`, using the theme's `id`. This takes
   about 20 seconds.
4. Read `offsets` at the top of the results for the instruments, and `musicOffsets` for the
   backing. Each shows the theme's difference from Neon in dB.
5. If either is outside the target, set `space.trim` or `space.musicTrim` to the matching value in
   `suggestedTrims` or `suggestedMusicTrims` and run the page again. The limiter's effect varies,
   so it may take a second try.

Open `/tests/loudness.html` with no theme to run every board and theme. This takes a few minutes
and also runs the worst-case Neon boards, so use it before a big audio change ships.

The page title shows `PASS` when nothing clips and both the instruments and the backing are within
1 dB of Neon. Otherwise it shows `FAIL`.

If you change Neon or the shared audio chain, open `/tests/loudness.html?theme=neon` and copy its
`baseline` output into `tests/loudness-baseline.ts`.

If a theme needs a very high trim, its sounds are probably too short or thin. Lengthening its
instrument decays will usually sound better than pushing the limiter harder.
