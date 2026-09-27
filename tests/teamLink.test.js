import { describe, it, expect } from 'vitest';
import { encodeTeam, decodeTeam, teamFromHash, parseNames, countRepeatedNames } from '../js/teamLink.js';

const team = {
  name: 'Café Crew',
  participants: [
    { name: 'Zoë', chances: 2, timerSec: null },
    { name: 'Ana', chances: 1, timerSec: 90 },
  ],
};

describe('team links', () => {
  it('round-trips a team, including non-ASCII names and custom timers', () => {
    const decoded = decodeTeam(encodeTeam(team));
    expect(decoded).toEqual({ name: 'Café Crew', participants: team.participants });
  });

  it('produces URL-safe payloads that teamFromHash accepts', () => {
    const code = encodeTeam(team);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(teamFromHash('#team=' + code).name).toBe('Café Crew');
  });

  it('rejects malformed or out-of-range payloads', () => {
    const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
    expect(decodeTeam('not-base64!!')).toBeNull();
    expect(decodeTeam(enc({ v: 2, n: 'x', p: [['a']] }))).toBeNull();
    expect(decodeTeam(enc({ v: 1, n: 'x', p: [] }))).toBeNull();
    expect(decodeTeam(enc({ v: 1, n: 'x', p: [['a', 9]] }))).toBeNull();
    expect(decodeTeam(enc({ v: 1, n: 'x', p: [['a'], ['A']] }))).toBeNull();
    expect(decodeTeam(enc({ v: 1, n: 'x', p: [['a', 1, 2]] }))).toBeNull();
    expect(teamFromHash('#other=1')).toBeNull();
  });
});

describe("parseNames", () => {
  it("splits on commas and new lines, trims, drops blanks and duplicates", () => {
    expect(parseNames(" Ada, Grace\n\nada ,Linus,\n")).toEqual(["Ada", "Grace", "Linus"]);
  });
  it("caps name length and count", () => {
    expect(parseNames("x".repeat(60))[0]).toHaveLength(40);
    expect(parseNames(Array.from({ length: 150 }, (_, i) => "n" + i).join(","))).toHaveLength(100);
  });
});

describe("countRepeatedNames", () => {
  it("counts the case-insensitive repeats parseNames drops", () => {
    expect(countRepeatedNames("Priya, Sam, sam\nJordan, SAM, , Priya")).toBe(3);
    expect(countRepeatedNames("Ada, Grace")).toBe(0);
  });
});
