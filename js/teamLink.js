/**
 * teamLink.js: Share a team as a URL (#team=...) and read one back
 *
 * The payload is compact JSON in URL-safe base64. Decoding is strict:
 * anything malformed or over the app's limits returns null.
 */

import { MAX_PARTICIPANTS, MAX_CHANCES, TIMER_MIN, TIMER_MAX } from "./config.js";

const NAME_MAX = 40;

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function encodeTeam(team) {
  const p = team.participants.map(x => x.timerSec ? [x.name, x.chances, x.timerSec] : [x.name, x.chances]);
  return toBase64Url(JSON.stringify({ v: 1, n: team.name, p }));
}

export function decodeTeam(encoded) {
  try {
    const raw = JSON.parse(fromBase64Url(encoded));
    if (!raw || raw.v !== 1 || !Array.isArray(raw.p)) return null;
    const name = typeof raw.n === "string" ? raw.n.trim().slice(0, NAME_MAX) : "";
    if (!name || raw.p.length === 0 || raw.p.length > MAX_PARTICIPANTS) return null;

    const seen = new Set();
    const participants = [];
    for (const entry of raw.p) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") return null;
      const pName = entry[0].trim().slice(0, NAME_MAX);
      const chances = entry[1] ?? 1;
      const timerSec = entry[2] ?? null;
      if (!pName || seen.has(pName.toLowerCase())) return null;
      if (!Number.isInteger(chances) || chances < 1 || chances > MAX_CHANCES) return null;
      if (timerSec !== null && (!Number.isInteger(timerSec) || timerSec < TIMER_MIN || timerSec > TIMER_MAX)) return null;
      seen.add(pName.toLowerCase());
      participants.push({ name: pName, chances, timerSec });
    }
    return { name, participants };
  } catch {
    return null;
  }
}

/** Read and validate a shared team from a location hash like "#team=...". */
export function teamFromHash(hash) {
  const m = /^#team=([A-Za-z0-9_-]+)$/.exec(hash || "");
  return m ? decodeTeam(m[1]) : null;
}

/** How many entries parseNames() drops as case-insensitive repeats (or past the cap). */
export function countRepeatedNames(text) {
  return String(text).split(/[,\n]/).filter(s => s.trim()).length - parseNames(text).length;
}

/** Names typed or pasted as free text (commas or new lines): trimmed, capped, case-insensitive unique. */
export function parseNames(text) {
  const seen = new Set();
  const names = [];
  for (const raw of String(text).split(/[,\n]/)) {
    const name = raw.trim().slice(0, NAME_MAX);
    if (!name || seen.has(name.toLowerCase()) || names.length >= MAX_PARTICIPANTS) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}
