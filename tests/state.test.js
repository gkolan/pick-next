/**
 * Tests for state.js: Application state management
 *
 * We mock storage.js since state.js depends on it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for storage.js
const storageData = {};
globalThis.localStorage = {
  getItem: vi.fn((key) => storageData[key] ?? null),
  setItem: vi.fn((key, value) => { storageData[key] = value; }),
  removeItem: vi.fn((key) => { delete storageData[key]; }),
  clear: vi.fn(() => { for (const k in storageData) delete storageData[k]; }),
};

const {
  generateId, initState, getData, getActiveTeam,
  getActiveTopicList, getActiveQuestionList,
  session, MODE_LABELS, transient,
  localDateKey, getAwayNames, getPresentParticipants, toggleAway, persistData
} = await import('../js/state.js');

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(generateId());
    expect(ids.size).toBe(100);
  });
});

describe('initState', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates default data when no saved data exists', () => {
    initState();
    const data = getData();
    expect(data).not.toBeNull();
    expect(data.teams).toBeDefined();
    expect(data.activeTeamId).toBeDefined();
    expect(data.teams[data.activeTeamId]).toBeDefined();
  });

  it('creates only the demo crew on first init', () => {
    initState();
    const data = getData();
    const teams = Object.values(data.teams);
    expect(teams).toHaveLength(1);
    expect(teams[0].participants).toHaveLength(15);
  });

  it('creates topic lists on first init', () => {
    initState();
    const data = getData();
    expect(data.topicLists).toBeDefined();
    expect(Object.keys(data.topicLists).length).toBeGreaterThan(0);
  });

  it('creates question lists on first init', () => {
    initState();
    const data = getData();
    expect(data.questionLists).toBeDefined();
    expect(Object.keys(data.questionLists).length).toBeGreaterThan(0);
  });

  it('refreshes a stale saved demo crew on load', () => {
    initState();
    const team = Object.values(getData().teams)[0];
    team.participants = [{ name: 'Gandhi', chances: 1, timerSec: null }];
    persistData();
    initState();
    expect(Object.values(getData().teams)[0].participants).toHaveLength(15);
  });

  it('saves data to localStorage after init', () => {
    initState();
    expect(globalThis.localStorage.setItem).toHaveBeenCalled();
  });
});

describe('getActiveTeam', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    initState();
  });

  it('returns the active team object', () => {
    const team = getActiveTeam();
    expect(team).toBeDefined();
    expect(typeof team.name).toBe('string');
    expect(Array.isArray(team.participants)).toBe(true);
    expect(team.settings).toBeDefined();
  });

  it('active team has valid settings', () => {
    const team = getActiveTeam();
    expect(team.settings.mode).toBeDefined();
    expect(typeof team.settings.timerDurationSec).toBe('number');
  });
});

describe('getActiveTopicList', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    initState();
  });

  it('returns the active topic list', () => {
    const list = getActiveTopicList();
    expect(list).not.toBeNull();
    expect(typeof list.name).toBe('string');
    expect(Array.isArray(list.topics)).toBe(true);
  });

  it('falls back to first list if active ID is invalid', () => {
    const data = getData();
    data.activeTopicListId = 'nonexistent';
    const list = getActiveTopicList();
    expect(list).not.toBeNull();
  });
});

describe('getActiveQuestionList', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    initState();
  });

  it('returns the active question list', () => {
    const list = getActiveQuestionList();
    expect(list).not.toBeNull();
    expect(typeof list.name).toBe('string');
    expect(Array.isArray(list.questions)).toBe(true);
  });

  it('falls back to first list if active ID is invalid', () => {
    const data = getData();
    data.activeQuestionListId = 'nonexistent';
    const list = getActiveQuestionList();
    expect(list).not.toBeNull();
  });
});

describe('session', () => {
  it('has expected initial state', () => {
    expect(session.raffleRound).toBe(0);
    expect(session.selectionHistory).toEqual([]);
    expect(session.sessionTopic).toBeNull();
    expect(session.usedTopics).toEqual([]);
    expect(session.usedPeople).toEqual([]);
    expect(session.hotSeatPerson).toBeNull();
  });

  it('reset() clears all session state', () => {
    session.raffleRound = 5;
    session.selectionHistory.push({ name: 'Test' });
    session.sessionTopic = 'Some topic';
    session.usedTopics.push('t1');
    session.usedPeople.push('p1');
    session.hotSeatPerson = 'Alice';
    session.hotSeatQuestionIndex = 3;

    session.reset();

    expect(session.raffleRound).toBe(0);
    expect(session.selectionHistory).toEqual([]);
    expect(session.sessionTopic).toBeNull();
    expect(session.usedTopics).toEqual([]);
    expect(session.usedPeople).toEqual([]);
    expect(session.hotSeatPerson).toBeNull();
    expect(session.hotSeatQuestionIndex).toBe(0);
  });
});

describe('MODE_LABELS', () => {
  it('has labels for all modes', () => {
    expect(MODE_LABELS.standup).toBe('Standup');
    expect(MODE_LABELS.raffle).toBe('Raffle');
    expect(MODE_LABELS.icebreaker).toBe('Icebreaker');
    expect(MODE_LABELS.hotseat).toBe('Hot Seat');
  });
});

describe('transient', () => {
  it('has expected initial state', () => {
    expect(transient.isPicking).toBe(false);
    expect(transient.isTimerRunning).toBe(false);
    expect(transient.isPaused).toBe(false);
    expect(transient.currentWinner).toBeNull();
  });
});

describe('out today', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    initState();
  });

  it('localDateKey formats the local date as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('toggleAway removes a person from the present list and back', () => {
    const team = getActiveTeam();
    const name = team.participants[0].name;
    toggleAway(name);
    expect(getAwayNames().has(name)).toBe(true);
    expect(getPresentParticipants().map(p => p.name)).not.toContain(name);
    expect(getPresentParticipants()).toHaveLength(team.participants.length - 1);
    toggleAway(name);
    expect(getPresentParticipants()).toHaveLength(team.participants.length);
  });

  it('absences from another day are ignored', () => {
    const team = getActiveTeam();
    team.away = { date: '2000-01-01', names: [team.participants[0].name] };
    expect(getAwayNames().size).toBe(0);
    expect(getPresentParticipants()).toHaveLength(team.participants.length);
  });
});
