/**
 * recapText.js: Recap time formatting
 *
 * Pure and DOM-free so it is testable.
 */

export function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? m + "m " + s + "s" : s + "s";
}
