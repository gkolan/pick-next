/**
 * Tests for demoData.js: Demo data generation
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TOPICS,
  DEMO_TEAM, DEMO_TOPIC_LISTS, demoParticipants
} from '../js/demoData.js';

describe('default constants', () => {
  it('DEFAULT_TOPICS has at least 10 topics', () => {
    expect(DEFAULT_TOPICS.length).toBeGreaterThanOrEqual(10);
    for (const topic of DEFAULT_TOPICS) {
      expect(typeof topic).toBe('string');
      expect(topic.length).toBeGreaterThan(0);
    }
  });
});

describe('DEMO_TEAM', () => {
  it('has 15 unique legends matching its size', () => {
    const names = demoParticipants().map(p => p.name);
    expect(names).toHaveLength(15);
    expect(DEMO_TEAM.size).toBe(15);
    expect(new Set(names).size).toBe(15);
  });

  it('has one one-liner per legend for every mode, starting with their name', () => {
    const names = demoParticipants().map(p => p.name);
    for (const mode of ['standup', 'raffle', 'icebreaker', 'hotseat']) {
      expect(DEMO_TEAM.quips[mode]).toHaveLength(names.length);
      DEMO_TEAM.quips[mode].forEach((quip, i) => expect(quip.startsWith(names[i])).toBe(true));
    }
  });

  it('returns fresh participant objects each call', () => {
    expect(demoParticipants()[0]).not.toBe(demoParticipants()[0]);
  });
});

describe('DEMO_TOPIC_LISTS', () => {
  it('has at least 2 topic lists', () => {
    expect(DEMO_TOPIC_LISTS.length).toBeGreaterThanOrEqual(2);
  });

  it('each list has name and non-empty topics array', () => {
    for (const list of DEMO_TOPIC_LISTS) {
      expect(typeof list.name).toBe('string');
      expect(list.name.length).toBeGreaterThan(0);
      expect(Array.isArray(list.topics)).toBe(true);
      expect(list.topics.length).toBeGreaterThan(0);
    }
  });
});
