/**
 * suspense.js: Suspense duration helpers
 *
 * Returns the total animation duration (in seconds) based on mode and round.
 */

import { SUSPENSE_STANDUP_RANGE, SUSPENSE_ICEBREAKER_RANGE, SUSPENSE_HOTSEAT_RANGE, SUSPENSE_RAFFLE_RANGES } from "./config.js";

export function getDuration(mode, raffleRound) {
  if (mode === "raffle") {
    const idx = Math.min(raffleRound || 0, SUSPENSE_RAFFLE_RANGES.length - 1);
    const [lo, hi] = SUSPENSE_RAFFLE_RANGES[idx];
    return lo + Math.random() * (hi - lo);
  }
  if (mode === "icebreaker") {
    const [lo, hi] = SUSPENSE_ICEBREAKER_RANGE;
    return lo + Math.random() * (hi - lo);
  }
  if (mode === "hotseat") {
    const [lo, hi] = SUSPENSE_HOTSEAT_RANGE;
    return lo + Math.random() * (hi - lo);
  }
  const [lo, hi] = SUSPENSE_STANDUP_RANGE;
  return lo + Math.random() * (hi - lo);
}
