/**
 * pickerTiming.js: Delay generation and compression for runPicker
 *
 * Generates per-phase delay arrays and assembles the final delay sequence
 * with priority-based compression to fit within maxDurationMs.
 */

import { rpClamp, rpRandBetween, rpRandFloat, rpRandInt } from "./pickerUtils.js";

// ─── Theatrical Event Generators ────────────────────────────────────

export function rpHiccupMs(tb)      { return rpClamp(rpRandBetween(0.10, 0.18) * tb,  100,  600); }
export function rpHesitationMs(tb)  { return rpClamp(rpRandBetween(0.15, 0.24) * tb,  150,  900); }
export function rpSpikeMs(tb)       { return rpClamp(rpRandBetween(0.20, 0.30) * tb,  200, 1200); }
export function rpFakeoutMs(tb)     { return rpClamp(rpRandBetween(0.28, 0.40) * tb,  300, 1800); }
export function rpSoftFakeoutMs(tb) { return rpClamp(rpRandBetween(0.12, 0.18) * tb,  180,  700); }
export function rpTransMs(lo, hi, tb) { return rpClamp(rpRandBetween(lo, hi) * tb,  80,  600); }

// ─── Phase Delay Arrays ─────────────────────────────────────────────

export function rpBuildPhaseDelays(ctx) {
  const tb = ctx.theatricalBudget;
  const bt = ctx.budgetTight;

  // Phase 1
  const p1HiccupN = bt ? rpRandInt(2) : rpRandInt(3);
  const p1HiccupSet = new Set();
  while (p1HiccupSet.size < Math.min(p1HiccupN, ctx.p1Ticks - 2)) { p1HiccupSet.add(1 + rpRandInt(ctx.p1Ticks - 2)); }
  const p1Delays = [];
  for (let i = 0; i < ctx.p1Ticks; i++) {
    const dwellFloor = i === 0 ? 200 : i === 1 ? 180 : i === 2 ? 160 : ctx.BASE_MIN_P1;
    const base = Math.max(dwellFloor, rpRandBetween(ctx.BASE_MIN_P1, 200));
    let d;
    if (p1HiccupSet.has(i))                                     d = rpHiccupMs(tb);
    else if (i >= 3 && !bt && rpRandFloat() < ctx.ghostRate)    d = rpRandBetween(150, 240);
    else                                                          d = base;
    p1Delays.push(d);
  }
  const p1p2Pause = rpTransMs(0.08, 0.14, tb);

  // Phase 2
  const p2Roll = rpRandFloat();
  const p2HN = p2Roll < 0.35 ? 0 : p2Roll < 0.75 ? 1 : p2Roll < 0.95 ? 2 : 3;
  const p2HNActual = bt ? Math.min(p2HN, 1) : p2HN;
  const p2HS = new Set();
  while (p2HS.size < Math.min(p2HNActual, ctx.p2Ticks - 1)) { p2HS.add(rpRandInt(ctx.p2Ticks - 1)); }
  const p2HD = new Map();
  for (const idx of p2HS) { p2HD.set(idx, rpHesitationMs(tb) * (0.4 + rpRandFloat() * 0.6)); }
  const p2Delays = [];
  for (let i = 0; i < ctx.p2Ticks; i++) {
    const base = rpRandBetween(ctx.BASE_MIN_P2, 380);
    p2Delays.push(p2HS.has(i) ? Math.max(base, p2HD.get(i)) : base);
  }
  const p2p3Pause = rpTransMs(0.12, 0.20, tb);

  // Phase 3
  const useSoftFakeout = !bt && ctx.p3Ticks >= 6 && rpRandFloat() < ctx.softFakeoutRate;
  const softFakeoutIdx = useSoftFakeout ? 1 + rpRandInt(Math.max(1, Math.floor(ctx.p3Ticks * 0.40))) : -1;
  const p3SpikeN = bt ? rpRandInt(2) : rpRandInt(3);
  const p3SS = Math.floor(ctx.p3Ticks * 0.40);
  const p3SE = ctx.p3Ticks - 2;
  const p3SR = Math.max(0, p3SE - p3SS);
  const p3SpikeSet = new Set();
  if (p3SR > 0) { const a = Math.min(p3SpikeN, p3SR); while (p3SpikeSet.size < a) { p3SpikeSet.add(p3SS + rpRandInt(p3SR)); } }
  const p3PI = ctx.p3Ticks - 2;
  const p3FD = rpFakeoutMs(tb);
  const p3BaseMax = Math.max(ctx.BASE_MIN_P3 + 50, ctx.BASE_MIN_P3 * 1.8);
  const p3Delays = [];
  for (let i = 0; i < ctx.p3Ticks; i++) {
    // Exponential deceleration for the final beats (wheel winding down)
    const decelProgress = ctx.p3Ticks > 2 ? i / (ctx.p3Ticks - 1) : 0;
    const decelMultiplier = 1 + decelProgress * decelProgress * 2.5;
    const base = rpRandBetween(ctx.BASE_MIN_P3, p3BaseMax) * decelMultiplier;
    if (i === p3PI && ctx.p3Ticks >= 2)   p3Delays.push(p3FD);
    else if (i === softFakeoutIdx)          p3Delays.push(rpSoftFakeoutMs(tb));
    else if (p3SpikeSet.has(i))             p3Delays.push(rpSpikeMs(tb));
    else                                    p3Delays.push(base);
  }

  return { p1Delays, p1HiccupSet, p1p2Pause, p2Delays, p2HS, p2p3Pause, p3Delays, softFakeoutIdx, p3PI };
}

// ─── Delay Assembly & Compression ───────────────────────────────────

export function rpAssembleDelays(sequence, delays, ctx) {
  const { p1Delays, p1HiccupSet, p1p2Pause, p2Delays, p2HS, p2p3Pause, p3Delays, softFakeoutIdx, p3PI } = delays;
  const delayEntries = [];
  function push(ms, kind) { delayEntries.push({ ms, kind }); }

  for (let i = 0; i < ctx.p1Ticks; i++) {
    const beat = sequence[i];
    let raw, kind;
    if (beat.doubleTap) { raw = rpRandBetween(30, 60) + rpRandBetween(30, 60); kind = "double_tap"; }
    else { raw = p1Delays[i] * (beat.linger ? beat.lingerMult : 1); kind = p1HiccupSet.has(i) ? "hiccup" : "base_p1"; }
    push(i === ctx.p1Ticks - 1 ? raw + p1p2Pause : raw, i === ctx.p1Ticks - 1 ? "transition" : kind);
  }
  for (let i = 0; i < ctx.p2Ticks; i++) {
    const beat = sequence[ctx.p1Ticks + i];
    let raw, kind;
    if (beat.doubleTap) { raw = rpRandBetween(30, 60) + rpRandBetween(30, 60); kind = "double_tap"; }
    else { raw = p2Delays[i] * (beat.linger ? beat.lingerMult : 1); kind = p2HS.has(i) ? "hesitation" : "base_p2"; }
    push(i === ctx.p2Ticks - 1 ? raw + p2p3Pause : raw, i === ctx.p2Ticks - 1 ? "transition" : kind);
  }
  for (let i = 0; i < ctx.p3Ticks; i++) {
    const beat = sequence[ctx.p1Ticks + ctx.p2Ticks + i];
    let raw = p3Delays[i] * (beat.linger ? beat.lingerMult : 1);
    let kind = "base_p3";
    if (beat.doubleTap) { raw = rpRandBetween(30, 60) + rpRandBetween(30, 60); kind = "double_tap"; }
    else if (i === p3PI) kind = "fakeout";
    else if (i === softFakeoutIdx) kind = "soft_fakeout";
    else if (delays.p3SpikeSet && delays.p3SpikeSet.has && delays.p3SpikeSet.has(i)) kind = "spike";
    push(raw, kind);
  }

  if (delayEntries.length > sequence.length - 1) { delayEntries.length = sequence.length - 1; }
  return delayEntries;
}

export function rpCompressDelays(delayEntries, maxDurationMs, ctx) {
  const floorByKind = {
    base_p1: ctx.BASE_MIN_P1, base_p2: ctx.BASE_MIN_P2, base_p3: ctx.BASE_MIN_P3,
    transition: 80, hiccup: 80, double_tap: 16,
    hesitation: 100, spike: 150, soft_fakeout: 150, fakeout: 220,
  };
  const floors     = delayEntries.map(d => floorByKind[d.kind] ?? 16);
  const rawTotal   = delayEntries.reduce((s, d) => s + d.ms, 0);
  const floorTotal = floors.reduce((s, f) => s + f, 0);

  if (rawTotal <= maxDurationMs) {
    return delayEntries.map(d => Math.max(16, Math.floor(d.ms)));
  }
  const compressible  = delayEntries.reduce((s, d, i) => s + Math.max(0, d.ms - floors[i]), 0);
  const allowedExcess = Math.max(0, maxDurationMs - floorTotal);
  const scale         = compressible > 0 ? Math.min(1, allowedExcess / compressible) : 1;
  return delayEntries.map((d, i) =>
    Math.max(16, Math.floor(floors[i] + Math.max(0, d.ms - floors[i]) * scale))
  );
}
