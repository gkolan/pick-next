/**
 * pickerSequence.js: Sequence building for runPicker
 *
 * Builds the animation sequence (which names appear in which order)
 * using per-run personality parameters from the context object.
 */

import { rpClamp, rpRandFloat, rpRandInt, rpShuffled } from "./pickerUtils.js";

// ─── Pool Sizing ────────────────────────────────────────────────────

export function rpDP2(total) {
  if (total <= 5)  return total;
  if (total <= 15) return rpClamp(Math.round(total * 0.50), 4, total);
  if (total <= 30) return rpClamp(Math.round(total * 0.35), 6, total);
  if (total <= 50) return rpClamp(Math.round(total * 0.25), 8, total);
  return rpClamp(Math.round(total * 0.15), 10, total);
}

export function rpDP3(total) {
  if (total <= 3)  return total;
  if (total <= 5)  return rpClamp(3, 1, total);
  if (total <= 15) return rpClamp(3 + rpRandInt(2), 3, total);
  if (total <= 30) return rpClamp(4 + rpRandInt(2), 3, total);
  if (total <= 50) return rpClamp(5 + rpRandInt(2), 3, total);
  return rpClamp(6 + rpRandInt(3), 3, total);
}

// ─── Build Pools ────────────────────────────────────────────────────

export function rpBuildPools(participants, winner, others, n) {
  const p2Count = rpDP2(n);
  const p3Count = rpDP3(n);
  const p2OC = Math.min(p2Count - 1, others.length);
  const p3OC = Math.min(Math.max(p3Count - 1, 0), others.length);
  return {
    p1Pool: participants,
    p2Pool: p2OC > 0 ? rpShuffled([winner, ...others.slice(0, p2OC)]) : [winner],
    p3Pool: p3OC > 0 ? rpShuffled([winner, ...others.slice(0, p3OC)]) : [winner]
  };
}

// ─── Guarantee Set ──────────────────────────────────────────────────

export function rpBuildGuaranteeSet(pool, winner) {
  if (pool.length <= 1) return [winner];
  const g = [winner];
  const po = rpShuffled(pool.filter(p => p.id !== winner.id));
  for (let i = 0; i < Math.min(2, po.length); i++) { g.push(po[i]); }
  return g;
}

// ─── Memory-Aware Picker ───────────────────────────────────────────

export function rpPickWithMemory(pool, prevId, seenAgo, ctx) {
  if (pool.length === 1) return pool[0];
  if (pool.length === 2) {
    const alt  = pool[0].id === prevId ? pool[1] : pool[0];
    const same = pool[0].id === prevId ? pool[0] : pool[1];
    return rpRandFloat() < ctx.alternateBias ? alt : same;
  }
  const scored = pool.map(p => {
    let score = 1.0;
    if (p.id === prevId)                    score *= ctx.repeatPenalty;
    if (ctx.p3ContenderIds.has(p.id))       score *= ctx.contenderBoost;
    if ((seenAgo.get(p.id) ?? 999) > 2)    score *= ctx.recencyBoost;
    return { p, score };
  });
  const total  = scored.reduce((s, x) => s + x.score, 0);
  let   target = rpRandFloat() * total;
  for (const { p, score } of scored) { target -= score; if (target <= 0) return p; }
  return scored[scored.length - 1].p;
}

// ─── Standard Pick (non-memory) ─────────────────────────────────────

export function rpStandardPick(pool, prevId, ctx) {
  if (pool.length === 1) return pool[0];
  if (pool.length === 2) {
    const alt  = pool[0].id === prevId ? pool[1] : pool[0];
    const same = pool[0].id === prevId ? pool[0] : pool[1];
    return rpRandFloat() < ctx.alternateBias ? alt : same;
  }
  let pick; let attempts = 0;
  do { pick = pool[rpRandInt(pool.length)]; attempts++; } while (pick.id === prevId && attempts < 8);
  return pick;
}

export function rpPickSecond(pool, firstId) {
  if (pool.length === 1) return pool[0];
  const eligible = pool.filter(p => p.id !== firstId);
  return eligible[rpRandInt(eligible.length)];
}

// ─── Phase Sequence Builder ─────────────────────────────────────────

export function rpBuildPhaseSequence(sequence, pool, tickCount, guarantees, avoidEnd, memoryPicker, dtRate, lingerMult, ctx) {
  if (tickCount === 0) return;
  let lastId = sequence.length > 0 ? (sequence[sequence.length - 1].doubleTap ? sequence[sequence.length - 1].participant2.id : sequence[sequence.length - 1].participant.id) : -1;

  const safeSlots = Math.max(1, tickCount - (avoidEnd || 0));
  const actual    = guarantees.slice(0, Math.min(guarantees.length, safeSlots));
  const positions = rpShuffled(Array.from({ length: safeSlots }, (_, i) => i));
  const gMap      = new Map();
  for (let i = 0; i < actual.length; i++) { gMap.set(positions[i], actual[i]); }
  const seenAgo = new Map();

  for (let i = 0; i < tickCount; i++) {
    let p;
    if (gMap.has(i))       p = gMap.get(i);
    else if (memoryPicker) p = memoryPicker(pool, lastId, seenAgo, ctx);
    else                   p = rpStandardPick(pool, lastId, ctx);

    const isSecondHalf = i >= Math.floor(tickCount * 0.5);
    const notLast      = i < tickCount - 1;
    const prevWasDT    = sequence.length > 0 && sequence[sequence.length - 1].doubleTap;
    const isGuarantee  = gMap.has(i);

    const linger    = isSecondHalf && notLast && rpRandFloat() < ctx.lingerRate;
    const doubleTap = !isGuarantee && !linger && notLast && !prevWasDT && rpRandFloat() < dtRate;
    const participant2 = doubleTap ? rpPickSecond(pool, p.id) : null;

    sequence.push({ participant: p, participant2, linger, doubleTap, lingerMult });
    lastId = doubleTap ? participant2.id : p.id;

    for (const key of seenAgo.keys()) { seenAgo.set(key, seenAgo.get(key) + 1); }
    seenAgo.set(p.id, 0);
  }
}
