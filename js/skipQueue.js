/**
 * skipQueue.js: Standup "Skip" means "come back to me at the end".
 *
 * A skipped speaker leaves the pool until everyone else has had a turn, then
 * comes back once. A second skip ends their turn for the session. DOM-free.
 */

/**
 * @param {string[]} names - present participants
 * @param {{name: string, skipped?: boolean}[]} history - session.selectionHistory
 * @returns {{eligible: string[], waiting: Set<string>, returning: boolean}}
 *   eligible: who the next pick may land on; waiting: skipped once, turn still owed;
 *   returning: everyone else is done, so the pool is the skipped people.
 */
export function standupPool(names, history) {
  const turns = new Map();
  for (const h of history) {
    const t = turns.get(h.name) || { spoke: false, skips: 0 };
    if (h.skipped) t.skips++; else t.spoke = true;
    turns.set(h.name, t);
  }
  const fresh = [];
  const waiting = new Set();
  for (const name of names) {
    const t = turns.get(name);
    if (!t) fresh.push(name);
    else if (!t.spoke && t.skips === 1) waiting.add(name);
  }
  const returning = fresh.length === 0;
  return { eligible: returning ? [...waiting] : fresh, waiting, returning };
}
