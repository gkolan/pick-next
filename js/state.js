/**
 * state.js: Application state management
 *
 * Three layers of state:
 *   1. Persisted data: teams, topic lists, active IDs (saved to localStorage)
 *   2. Session state: pick history, raffle round, social topics (reset on reload)
 *   3. Transient: runtime flags (timers, picking state)
 *
 * DOM cache is in domCache.js.
 */

import { DEMO_TEAM, DEMO_TOPIC_LISTS, demoParticipants } from "./demoData.js";
import { TIMER_DEFAULT, MODE_DEFAULTS } from "./config.js";
import { save, load } from "./storage.js";
import { standupPool } from "./skipQueue.js";

// ─── UUID Helper ────────────────────────────────────────────────────

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ─── Persisted Data Store ───────────────────────────────────────────

export let data = null;

export function createDefaults() {
  const activeTeamId = generateId();
  const teams = {
    [activeTeamId]: {
      name: DEMO_TEAM.name,
      participants: demoParticipants(),
      settings: {
        mode: "standup",
        timerDurationSec: DEMO_TEAM.timerSec,
        autoAdvance: MODE_DEFAULTS.standup.autoAdvance,
        randomOrder: MODE_DEFAULTS.standup.randomOrder,
        raffle: { prizeCount: Math.min(MODE_DEFAULTS.raffle.prizeCount, DEMO_TEAM.size - 1) }
      }
    }
  };

  const topicLists = {};
  let activeTopicListId = null;
  DEMO_TOPIC_LISTS.forEach(dtl => {
    const id = generateId();
    if (!activeTopicListId) activeTopicListId = id;
    topicLists[id] = {
      name: dtl.name,
      topics: [...dtl.topics],
      settings: {
        topicRotation: "new-topic-new-person",
        allowRepeatPeople: false,
        allowRepeatTopics: false
      }
    };
  });

  const questionLists = {};
  let activeQuestionListId = null;
  const defaultQuestions = [
    "What's your hot take that most people disagree with?",
    "If you could only use one app for a year, which one?",
    "What's the most underrated skill in your field?",
    "Describe your perfect day off in three words.",
    "What's something you changed your mind about recently?",
    "If you had to teach a class, what would it be on?",
    "What's a hobby you'd pick up if time were unlimited?",
    "What's the best piece of advice you've ignored?",
    "If you could swap jobs with a teammate for a day, who?",
    "What's the last thing that made you laugh out loud?"
  ];
  const qId = generateId();
  activeQuestionListId = qId;
  questionLists[qId] = {
    name: "Fun Questions",
    questions: defaultQuestions,
    settings: { questionTimerSec: 15, questionsPerPerson: 5, allowSkipQuestion: true }
  };

  return { activeTeamId, activeTopicListId, activeQuestionListId, teams, topicLists, questionLists };
}

export function initState() {
  const loaded = load();
  if (loaded && loaded.teams && loaded.activeTeamId && loaded.teams[loaded.activeTeamId]) {
    data = loaded;
    // Ensure questionLists exist for older saved data
    if (!data.questionLists) {
      const defaults = createDefaults();
      data.questionLists = defaults.questionLists;
      data.activeQuestionListId = defaults.activeQuestionListId;
      save(data);
    }
    // The demo crew always shows the current roster, not a stale saved one.
    const demo = Object.values(data.teams).find(t => t.name === DEMO_TEAM.name);
    if (demo) {
      demo.participants = demoParticipants();
      if (demo.settings.timerDurationSec === TIMER_DEFAULT) demo.settings.timerDurationSec = DEMO_TEAM.timerSec; // saved before the 30s demo
      save(data);
    }
  } else {
    data = createDefaults();
    save(data);
  }
}

export function getData() { return data; }

export function getActiveTeam() { return data.teams[data.activeTeamId]; }

export function getActiveTopicList() {
  if (!data.activeTopicListId || !data.topicLists[data.activeTopicListId]) {
    const ids = Object.keys(data.topicLists);
    if (ids.length > 0) {
      data.activeTopicListId = ids[0];
      return data.topicLists[ids[0]];
    }
    return null;
  }
  return data.topicLists[data.activeTopicListId];
}

export function getActiveQuestionList() {
  if (!data.questionLists) return null;
  if (!data.activeQuestionListId || !data.questionLists[data.activeQuestionListId]) {
    const ids = Object.keys(data.questionLists || {});
    if (ids.length > 0) {
      data.activeQuestionListId = ids[0];
      return data.questionLists[ids[0]];
    }
    return null;
  }
  return data.questionLists[data.activeQuestionListId];
}

export function persistData() { save(data); }

// ─── "Out today" ────────────────────────────────────────────────────
// Stored on the team with the local date, so absences expire by themselves tomorrow.

export function localDateKey(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function getAwayNames(team = getActiveTeam()) {
  const away = team && team.away;
  return away && away.date === localDateKey() && Array.isArray(away.names) ? new Set(away.names) : new Set();
}

/** Participants who can be picked today. */
export function getPresentParticipants(team = getActiveTeam()) {
  const away = getAwayNames(team);
  return team.participants.filter(p => !away.has(p.name));
}

/** Standup pool with skipped speakers held back until the end (skipQueue.js). Other modes: nobody waits. */
export function getSkipState(team = getActiveTeam()) {
  if (team.settings.mode !== "standup") return { eligible: [], waiting: new Set(), returning: false };
  return standupPool(getPresentParticipants(team).map(p => p.name), session.selectionHistory);
}

export function toggleAway(name, team = getActiveTeam()) {
  const away = getAwayNames(team);
  if (away.has(name)) away.delete(name); else away.add(name);
  team.away = { date: localDateKey(), names: [...away] };
  persistData();
}

// ─── Session State (does NOT persist across reloads) ────────────────

export const session = {
  raffleRound: 0,
  raffleCurrentPlace: null,
  selectionHistory: [],
  sessionTopic: null,
  usedTopics: [],
  usedPeople: [],
  startedAt: null,
  endedAt: null,
  hotSeatPerson: null,
  hotSeatQuestionIndex: 0,
  hotSeatRound: 0,
  hotSeatAnswers: [],

  reset() {
    this.raffleRound = 0;
    this.raffleCurrentPlace = null;
    this.selectionHistory = [];
    this.sessionTopic = null;
    this.usedTopics = [];
    this.usedPeople = [];
    this.startedAt = null;
    this.endedAt = null;
    this.hotSeatPerson = null;
    this.hotSeatQuestionIndex = 0;
    this.hotSeatRound = 0;
    this.hotSeatAnswers = [];
  }
};

// ─── Mode Labels ────────────────────────────────────────────────────

export const MODE_LABELS = {
  standup: "Standup",
  raffle:  "Raffle",
  icebreaker: "Icebreaker",
  hotseat: "Hot Seat"
};

export const MODE_EMOJI = {
  standup: "🎤",
  raffle: "🎟️",
  icebreaker: "💬",
  hotseat: "🔥"
};

// ─── Transient Runtime State ────────────────────────────────────────

export const transient = {
  isPicking: false,
  isTimerRunning: false,
  isPaused: false,
  isOvertime: false,
  timerRemaining: 0,
  timerTotal: 0,         // duration the running timer started with
  timerElapsed: 0,       // unpaused seconds on the running timer
  timerInterval: null,
  currentWinner: null,
  layoutMeta: [],
  pickInFlight: null,    // token held by the running pick cycle (see isPickBusy)
  pendingTurn: null,     // token while a revealed speaker waits for their timer to start
  resizeRaf: null,
  pickerCancel: null,
  sessionGen: 0
};
