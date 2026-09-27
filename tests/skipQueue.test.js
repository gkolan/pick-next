import { describe, it, expect } from 'vitest';
import { standupPool } from '../js/skipQueue.js';

const names = ['Ada', 'Grace', 'Linus'];

describe("standupPool", () => {
  it("starts with everyone", () => {
    expect(standupPool(names, [])).toEqual({ eligible: names, waiting: new Set(), returning: false });
  });

  it("holds a skipped speaker back until everyone else has gone", () => {
    const history = [{ name: 'Ada', skipped: true }];
    expect(standupPool(names, history).eligible).toEqual(['Grace', 'Linus']);
    history.push({ name: 'Grace' }, { name: 'Linus' });
    expect(standupPool(names, history)).toEqual({ eligible: ['Ada'], waiting: new Set(['Ada']), returning: true });
  });

  it("is done once they come back and speak, or are skipped twice", () => {
    const base = [{ name: 'Ada', skipped: true }, { name: 'Grace' }, { name: 'Linus' }];
    expect(standupPool(names, [...base, { name: 'Ada' }]).eligible).toEqual([]);
    expect(standupPool(names, [...base, { name: 'Ada', skipped: true }]).eligible).toEqual([]);
  });

  it("ignores skipped people who are out today", () => {
    expect(standupPool(['Grace'], [{ name: 'Ada', skipped: true }, { name: 'Grace' }]).eligible).toEqual([]);
  });
});
