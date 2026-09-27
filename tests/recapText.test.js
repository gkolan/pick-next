import { describe, it, expect } from 'vitest';
import { formatElapsed } from '../js/recapText.js';

describe('formatElapsed', () => {
  it('formats seconds and minutes', () => {
    expect(formatElapsed(0)).toBe('0s');
    expect(formatElapsed(45_000)).toBe('45s');
    expect(formatElapsed(125_900)).toBe('2m 5s');
  });
});
