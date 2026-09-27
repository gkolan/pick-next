/**
 * Tests for storage.js: localStorage persistence
 *
 * We mock localStorage since we're in a Node environment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { for (const k in storage) delete storage[k]; }),
};
globalThis.localStorage = localStorageMock;

// Import after mocking
const { save, load, exportJSON, importJSON } = await import('../js/storage.js');

describe('storage.js', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('saves data to localStorage under "picknext" key', () => {
      const data = { teams: {}, activeTeamId: 'abc' };
      save(data);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('picknext', JSON.stringify(data));
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
      expect(() => save({ test: true })).not.toThrow();
    });
  });

  describe('load', () => {
    it('returns null when no data exists', () => {
      expect(load()).toBeNull();
    });

    it('returns parsed data when valid JSON exists', () => {
      const data = { teams: { t1: { name: 'Team A' } }, activeTeamId: 't1' };
      storage.picknext = JSON.stringify(data);
      expect(load()).toEqual(data);
    });

    it('returns null for invalid JSON', () => {
      storage.picknext = 'not valid json!!!';
      expect(load()).toBeNull();
    });

    it('returns null for non-object data', () => {
      storage.picknext = '"just a string"';
      expect(load()).toBeNull();
    });

    it('returns null for null stored value', () => {
      storage.picknext = 'null';
      expect(load()).toBeNull();
    });
  });

  describe('exportJSON', () => {
    it('returns raw JSON string from localStorage', () => {
      const jsonStr = '{"teams":{}}';
      storage.picknext = jsonStr;
      expect(exportJSON()).toBe(jsonStr);
    });

    it('returns null when no data exists', () => {
      expect(exportJSON()).toBeNull();
    });
  });

  describe('importJSON', () => {
    it.each(['toString', '__proto__'])('rejects an inherited active team id: %s', activeTeamId => {
      const data = { teams: { t1: { name: 'A', participants: [] } }, activeTeamId };
      expect(importJSON(JSON.stringify(data))).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it.each([['Alice', 'alice'], ['   ']])('rejects invalid participant names without overwriting a backup: %j', (...names) => {
      storage.picknext = 'existing backup';
      const data = { activeTeamId: 't1', teams: { t1: {
        name: 'A', participants: names.map(name => ({ name, chances: 1 }))
      } } };
      expect(importJSON(JSON.stringify(data))).toBeNull();
      expect(storage.picknext).toBe('existing backup');
    });

    it('normalizes invalid active list IDs to an existing own entry', () => {
      const data = { activeTeamId: 't1', teams: { t1: { name: 'A', participants: [] } },
        topicLists: { l1: { name: 'T', topics: [] } }, activeTopicListId: 'toString',
        questionLists: { q1: { name: 'Q', questions: [] } }, activeQuestionListId: 'missing' };
      const result = importJSON(JSON.stringify(data));
      expect(result.activeTopicListId).toBe('l1');
      expect(result.activeQuestionListId).toBe('q1');
    });

    it('does not report success when browser storage rejects the import', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
      const data = { activeTeamId: 't1', teams: { t1: { name: 'A', participants: [] } } };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('imports valid data and saves it', () => {
      const data = {
        teams: {
          t1: {
            name: 'Team A',
            participants: [{ name: 'Alice', chances: 1 }],
            settings: {}
          }
        },
        activeTeamId: 't1'
      };
      const result = importJSON(JSON.stringify(data));
      expect(result).toMatchObject(data);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('rejects invalid JSON', () => {
      expect(importJSON('not json')).toBeNull();
    });

    it('rejects data without teams', () => {
      expect(importJSON(JSON.stringify({ activeTeamId: 't1' }))).toBeNull();
    });

    it('rejects data without activeTeamId', () => {
      expect(importJSON(JSON.stringify({ teams: {} }))).toBeNull();
    });

    it('rejects when activeTeamId points to non-existent team', () => {
      const data = { teams: { t1: { name: 'A', participants: [] } }, activeTeamId: 'missing' };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects when team count exceeds 25', () => {
      const teams = {};
      for (let i = 0; i < 26; i++) {
        teams[`t${i}`] = { name: `Team ${i}`, participants: [{ name: 'A', chances: 1 }] };
      }
      expect(importJSON(JSON.stringify({ teams, activeTeamId: 't0' }))).toBeNull();
    });

    it('rejects when team has no teams (empty object)', () => {
      expect(importJSON(JSON.stringify({ teams: {}, activeTeamId: 't1' }))).toBeNull();
    });

    it('rejects when participants exceed 100', () => {
      const participants = Array.from({ length: 101 }, (_, i) => ({ name: `P${i}`, chances: 1 }));
      const data = {
        teams: { t1: { name: 'Big', participants } },
        activeTeamId: 't1'
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects when participant chances are out of range', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 6 }] } },
        activeTeamId: 't1'
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects when participant chances are 0', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 0 }] } },
        activeTeamId: 't1'
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('validates topic lists when present', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 1 }] } },
        activeTeamId: 't1',
        topicLists: { l1: { name: 'Topics', topics: ['Topic 1'] } }
      };
      expect(importJSON(JSON.stringify(data))).toMatchObject(data);
    });

    it('fills missing team and list settings with defaults', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 1 }] } },
        activeTeamId: 't1',
        topicLists: { l1: { name: 'T', topics: [] } },
        questionLists: { q1: { name: 'Q', questions: ['Why?'], settings: { questionTimerSec: 'soon' } } }
      };
      const result = importJSON(JSON.stringify(data));
      expect(result.teams.t1.settings).toEqual({ mode: 'standup', timerDurationSec: 120, autoAdvance: true, randomOrder: true, raffle: { prizeCount: 3 } });
      expect(result.topicLists.l1.settings.topicRotation).toBe('new-topic-new-person');
      expect(result.questionLists.q1.settings).toEqual({ questionTimerSec: 15, questionsPerPerson: 5, allowSkipQuestion: true });
    });

    it('adds an empty topic list map when missing', () => {
      const data = { teams: { t1: { name: 'A', participants: [] } }, activeTeamId: 't1' };
      expect(importJSON(JSON.stringify(data)).topicLists).toEqual({});
    });

    it('rejects question lists with non-array questions', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [] } },
        activeTeamId: 't1',
        questionLists: { q1: { name: 'Q', questions: 'Why?' } }
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects topic lists with >25 entries', () => {
      const topicLists = {};
      for (let i = 0; i < 26; i++) {
        topicLists[`l${i}`] = { name: `List ${i}`, topics: [] };
      }
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 1 }] } },
        activeTeamId: 't1',
        topicLists
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects topic lists with >100 topics', () => {
      const topics = Array.from({ length: 101 }, (_, i) => `Topic ${i}`);
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 1 }] } },
        activeTeamId: 't1',
        topicLists: { l1: { name: 'Many', topics } }
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });

    it('rejects topic lists with non-string topics', () => {
      const data = {
        teams: { t1: { name: 'A', participants: [{ name: 'X', chances: 1 }] } },
        activeTeamId: 't1',
        topicLists: { l1: { name: 'Bad', topics: [123] } }
      };
      expect(importJSON(JSON.stringify(data))).toBeNull();
    });
  });
});
