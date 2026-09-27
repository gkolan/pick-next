/**
 * Tests for suspense.js: Suspense duration generation
 */
import { describe, it, expect } from 'vitest';
import { getDuration } from '../js/suspense.js';
import {
  SUSPENSE_STANDUP_RANGE, SUSPENSE_ICEBREAKER_RANGE,
  SUSPENSE_HOTSEAT_RANGE, SUSPENSE_RAFFLE_RANGES
} from '../js/config.js';

describe('getDuration', () => {
  const ITERATIONS = 100;

  it('returns values within standup range for standup mode', () => {
    const [lo, hi] = SUSPENSE_STANDUP_RANGE;
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('standup', 0);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('returns values within icebreaker range', () => {
    const [lo, hi] = SUSPENSE_ICEBREAKER_RANGE;
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('icebreaker', 0);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('returns values within hotseat range', () => {
    const [lo, hi] = SUSPENSE_HOTSEAT_RANGE;
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('hotseat', 0);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('returns values within raffle range for round 0', () => {
    const [lo, hi] = SUSPENSE_RAFFLE_RANGES[0];
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('raffle', 0);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('returns values within raffle range for round 1', () => {
    const [lo, hi] = SUSPENSE_RAFFLE_RANGES[1];
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('raffle', 1);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('clamps raffle round to max index for high round numbers', () => {
    const maxIdx = SUSPENSE_RAFFLE_RANGES.length - 1;
    const [lo, hi] = SUSPENSE_RAFFLE_RANGES[maxIdx];
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('raffle', 999);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('defaults to standup range for unknown mode', () => {
    const [lo, hi] = SUSPENSE_STANDUP_RANGE;
    for (let i = 0; i < ITERATIONS; i++) {
      const d = getDuration('unknown_mode', 0);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }
  });

  it('handles undefined raffleRound for raffle mode', () => {
    const [lo, hi] = SUSPENSE_RAFFLE_RANGES[0];
    const d = getDuration('raffle', undefined);
    expect(d).toBeGreaterThanOrEqual(lo);
    expect(d).toBeLessThanOrEqual(hi);
  });
});
