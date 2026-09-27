/**
 * Tests for topics.js: pickRandomTopic (pure function, no state deps)
 */
import { describe, it, expect } from 'vitest';

// We only test the pure function pickRandomTopic directly.
// CRUD operations require full state init which we test via state.test.js.

// pickRandomTopic is a pure function, so it can be imported directly
import { pickRandomTopic } from '../js/topics.js';

describe('pickRandomTopic', () => {
  it('picks a topic from the available list', () => {
    const topics = ['A', 'B', 'C'];
    const usedTopics = [];
    const result = pickRandomTopic(topics, usedTopics);
    expect(topics).toContain(result);
  });

  it('excludes used topics', () => {
    const topics = ['A', 'B', 'C'];
    const usedTopics = ['A', 'B'];
    for (let i = 0; i < 50; i++) {
      expect(pickRandomTopic(topics, usedTopics)).toBe('C');
    }
  });

  it('returns null when all topics are used', () => {
    const topics = ['A', 'B'];
    const usedTopics = ['A', 'B'];
    expect(pickRandomTopic(topics, usedTopics)).toBeNull();
  });

  it('returns null for empty topics array', () => {
    expect(pickRandomTopic([], [])).toBeNull();
  });

  it('handles single topic correctly', () => {
    expect(pickRandomTopic(['Only'], [])).toBe('Only');
    expect(pickRandomTopic(['Only'], ['Only'])).toBeNull();
  });
});
