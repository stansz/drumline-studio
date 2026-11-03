// Neon's average level in dB for the instrument boards, rendered without backing music. Refresh
// from the loudness page's `baseline` output whenever Neon, the shared audio chain, or the way
// boards are rendered changes. Backing levels need no baseline: each run renders Neon's backing.
export const NEON_BASELINE: Record<string, Record<number, number>> = {
  'spread 12': { 120: -20.6, 240: -18.2 },
  'kick line': { 120: -13.7, 240: -11.7 },
  'full board': { 120: -17.8, 240: -15.5 },
};
