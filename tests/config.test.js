/**
 * Tests for config.js: Constants and utility functions
 */
import { describe, it, expect } from 'vitest';
import {
  TIMER_MIN, TIMER_MAX, TIMER_DEFAULT,
  SUSPENSE_STANDUP_RANGE, SUSPENSE_ICEBREAKER_RANGE, SUSPENSE_RAFFLE_RANGES, SUSPENSE_HOTSEAT_RANGE,
  RAFFLE_INTER_PICK_PAUSE,
  MAX_PARTICIPANTS, MAX_TOPICS, MAX_TEAMS, MAX_TOPIC_LISTS, MAX_CHANCES,
  MAX_QUESTIONS, MAX_QUESTION_LISTS,
  formatOrdinal, MODE_DEFAULTS
} from '../js/config.js';

describe('config.js constants', () => {
  it('timer constraints are valid', () => {
    expect(TIMER_MIN).toBe(5);
    expect(TIMER_MAX).toBe(1200);
    expect(TIMER_DEFAULT).toBe(120);
    expect(TIMER_MIN).toBeLessThan(TIMER_MAX);
    expect(TIMER_DEFAULT).toBeGreaterThanOrEqual(TIMER_MIN);
    expect(TIMER_DEFAULT).toBeLessThanOrEqual(TIMER_MAX);
  });

  it('suspense ranges have valid [lo, hi] pairs', () => {
    expect(SUSPENSE_STANDUP_RANGE[0]).toBeLessThan(SUSPENSE_STANDUP_RANGE[1]);
    expect(SUSPENSE_ICEBREAKER_RANGE[0]).toBeLessThan(SUSPENSE_ICEBREAKER_RANGE[1]);
    expect(SUSPENSE_HOTSEAT_RANGE[0]).toBeLessThan(SUSPENSE_HOTSEAT_RANGE[1]);
    for (const [lo, hi] of SUSPENSE_RAFFLE_RANGES) {
      expect(lo).toBeLessThan(hi);
    }
  });

  it('raffle inter-pick pause is positive', () => {
    expect(RAFFLE_INTER_PICK_PAUSE).toBeGreaterThan(0);
  });

  it('entity limits are positive integers', () => {
    expect(MAX_PARTICIPANTS).toBeGreaterThan(0);
    expect(MAX_TOPICS).toBeGreaterThan(0);
    expect(MAX_TEAMS).toBeGreaterThan(0);
    expect(MAX_TOPIC_LISTS).toBeGreaterThan(0);
    expect(MAX_CHANCES).toBeGreaterThan(0);
    expect(MAX_QUESTIONS).toBeGreaterThan(0);
    expect(MAX_QUESTION_LISTS).toBeGreaterThan(0);
  });

  it('MODE_DEFAULTS has all expected modes', () => {
    expect(MODE_DEFAULTS).toHaveProperty('standup');
    expect(MODE_DEFAULTS).toHaveProperty('raffle');
    expect(MODE_DEFAULTS).toHaveProperty('icebreaker');
    expect(MODE_DEFAULTS).toHaveProperty('hotseat');
  });

  it('standup defaults are valid', () => {
    expect(MODE_DEFAULTS.standup.timerDurationSec).toBe(120);
    expect(typeof MODE_DEFAULTS.standup.autoAdvance).toBe('boolean');
    expect(typeof MODE_DEFAULTS.standup.randomOrder).toBe('boolean');
  });

  it('raffle defaults have a positive prizeCount', () => {
    expect(MODE_DEFAULTS.raffle.prizeCount).toBeGreaterThan(0);
  });
});

describe('formatOrdinal', () => {
  it('formats 1st correctly', () => {
    expect(formatOrdinal(1)).toBe('1st');
  });

  it('formats 2nd correctly', () => {
    expect(formatOrdinal(2)).toBe('2nd');
  });

  it('formats 3rd correctly', () => {
    expect(formatOrdinal(3)).toBe('3rd');
  });

  it('formats 4th and above with "th" suffix', () => {
    expect(formatOrdinal(4)).toBe('4th');
    expect(formatOrdinal(5)).toBe('5th');
    expect(formatOrdinal(10)).toBe('10th');
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
    expect(formatOrdinal(21)).toBe('21th');
    expect(formatOrdinal(100)).toBe('100th');
  });
});

describe("formatPrize", () => {
  it("names the podium, then falls back to ordinals", async () => {
    const { formatPrize } = await import('../js/config.js');
    expect([1, 2, 3, 4].map(formatPrize)).toEqual(["🥇 Gold", "🥈 Silver", "🥉 Bronze", "4th"]);
  });
});
