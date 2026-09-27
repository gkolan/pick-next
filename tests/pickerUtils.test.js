/**
 * Tests for pickerUtils.js: Cryptographic random helpers
 */
import { describe, it, expect } from 'vitest';
import { rpRandInt, rpRandFloat, rpRandBetween, rpShuffled, rpClamp } from '../js/pickerUtils.js';

describe('rpRandInt', () => {
  it('returns 0 when max is 0 or 1', () => {
    expect(rpRandInt(0)).toBe(0);
    expect(rpRandInt(1)).toBe(0);
  });

  it('returns values in [0, max) range', () => {
    for (let i = 0; i < 200; i++) {
      const val = rpRandInt(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });

  it('produces varied results for max > 1', () => {
    const values = new Set();
    for (let i = 0; i < 200; i++) values.add(rpRandInt(5));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('rpRandFloat', () => {
  it('returns values in [0, 1) range', () => {
    for (let i = 0; i < 200; i++) {
      const val = rpRandFloat();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe('rpRandBetween', () => {
  it('returns values in [lo, hi) range', () => {
    for (let i = 0; i < 200; i++) {
      const val = rpRandBetween(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });
});

describe('rpShuffled', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rpShuffled(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rpShuffled(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    rpShuffled(arr);
    expect(arr).toEqual(copy);
  });

  it('produces different orderings', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(rpShuffled(arr).join(','));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('handles single-element array', () => {
    expect(rpShuffled([42])).toEqual([42]);
  });

  it('handles empty array', () => {
    expect(rpShuffled([])).toEqual([]);
  });
});

describe('rpClamp', () => {
  it('returns value when within range', () => {
    expect(rpClamp(5, 0, 10)).toBe(5);
  });

  it('clamps to lo when below range', () => {
    expect(rpClamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to hi when above range', () => {
    expect(rpClamp(15, 0, 10)).toBe(10);
  });

  it('handles lo === hi', () => {
    expect(rpClamp(5, 3, 3)).toBe(3);
  });
});
