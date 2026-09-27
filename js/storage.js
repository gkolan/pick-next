/**
 * storage.js: localStorage persistence wrapper
 *
 * All app data stored under a single key "picknext".
 * Handles missing/corrupt data gracefully.
 */

export const STORAGE_KEY = "picknext";

/**
 * Save app data to localStorage.
 * @param {Object} data - Full app data object
 */
export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
    return false;
  }
}

/**
 * Load app data from localStorage.
 * @returns {Object|null} Parsed data, or null if missing/corrupt
 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (e) {
    console.warn("Failed to load from localStorage:", e);
    return null;
  }
}

/**
 * Export all app data as a JSON string (for file download).
 * @returns {string|null} JSON string, or null if no data
 */
export function exportJSON() {
  return localStorage.getItem(STORAGE_KEY);
}

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
const orDefault = (v, ok, d) => (ok(v) ? v : d);
const isBool = v => typeof v === "boolean";
const MODES = ["standup", "raffle", "icebreaker", "hotseat"];

/** A list map ({id: {name, [key]: string[]}}) within the limits, or false. */
function validLists(lists, key, maxLists, maxItems) {
  if (!isObj(lists) || Object.keys(lists).length > maxLists) return false;
  return Object.values(lists).every(l => isObj(l) && typeof l.name === "string" &&
    Array.isArray(l[key]) && l[key].length <= maxItems && l[key].every(t => typeof t === "string"));
}

/**
 * Import app data from a JSON string.
 * Rejects a malformed backup; fills missing or out-of-range settings with defaults
 * so everything the app reads later exists and has the right type.
 * @param {string} jsonString - Raw JSON to import
 * @returns {Object|null} Normalized data if valid, null on failure
 */
export function importJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!isObj(data) || !isObj(data.teams)) return null;
    if (typeof data.activeTeamId !== "string") return null;

    const teams = Object.values(data.teams);
    if (teams.length === 0 || teams.length > 25) return null;
    if (!Object.hasOwn(data.teams, data.activeTeamId)) return null;

    for (const team of teams) {
      if (!isObj(team) || typeof team.name !== "string") return null;
      if (!Array.isArray(team.participants) || team.participants.length > 100) return null;
      const names = new Set();
      for (const p of team.participants) {
        if (!isObj(p) || typeof p.name !== "string" || !isInt(p.chances, 1, 5)) return null;
        p.name = p.name.trim();
        if (!p.name || names.has(p.name.toLowerCase())) return null;
        names.add(p.name.toLowerCase());
        p.timerSec = orDefault(p.timerSec, v => isInt(v, 5, 1200), null);
      }
      const s = isObj(team.settings) ? team.settings : {};
      if (s.mode === "social") s.mode = "icebreaker";
      s.mode = orDefault(s.mode, v => MODES.includes(v), "standup");
      s.timerDurationSec = orDefault(s.timerDurationSec, v => isInt(v, 5, 1200), 120);
      s.autoAdvance = orDefault(s.autoAdvance, isBool, true);
      s.randomOrder = orDefault(s.randomOrder, isBool, true);
      s.raffle = { prizeCount: orDefault(s.raffle?.prizeCount, v => isInt(v, 1, 99), 3) };
      team.settings = s;
    }

    data.topicLists ??= {};
    if (!validLists(data.topicLists, "topics", 25, 100)) return null;
    for (const list of Object.values(data.topicLists)) {
      const s = isObj(list.settings) ? list.settings : {};
      s.topicRotation = orDefault(s.topicRotation, v => v === "same-topic-new-person", "new-topic-new-person");
      s.allowRepeatPeople = orDefault(s.allowRepeatPeople, isBool, false);
      s.allowRepeatTopics = orDefault(s.allowRepeatTopics, isBool, false);
      list.settings = s;
    }

    // Missing question lists are fine: initState() adds the defaults.
    if (data.questionLists != null) {
      if (!validLists(data.questionLists, "questions", 25, 50)) return null;
      for (const list of Object.values(data.questionLists)) {
        const s = isObj(list.settings) ? list.settings : {};
        s.questionTimerSec = orDefault(s.questionTimerSec, v => isInt(v, 5, 120), 15);
        s.questionsPerPerson = orDefault(s.questionsPerPerson, v => isInt(v, 1, 20), 5);
        s.allowSkipQuestion = orDefault(s.allowSkipQuestion, isBool, true);
        list.settings = s;
      }
    }

    for (const [map, active] of [["topicLists", "activeTopicListId"], ["questionLists", "activeQuestionListId"]]) {
      if (!Object.hasOwn(data[map] || {}, data[active])) data[active] = Object.keys(data[map] || {})[0] || null;
    }
    if (!save(data)) return null;
    return data;
  } catch (e) {
    console.warn("Failed to import JSON:", e);
    return null;
  }
}
