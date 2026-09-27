/**
 * Suspense-based winner picker with weighted probability and roulette-style
 * phase narrowing. Winner committed at T=0; suspense from field narrowing.
 *
 * @param {Array<string|{name:string, chances:number}>} names
 * @param {number} maxDurationMs - Animation ceiling (>= 100ms)
 * @param {Function} onTick - Called each animation frame
 * @param {Function} onComplete - Called with final winner
 * @returns {Function} Cancel function
 */

import { rpBuildGuaranteeSet, rpBuildPhaseSequence, rpBuildPools, rpPickWithMemory } from "./pickerSequence.js";
import { rpAssembleDelays, rpBuildPhaseDelays, rpCompressDelays } from "./pickerTiming.js";
import { rpClamp, rpRandBetween, rpRandFloat, rpRandInt, rpShuffled } from "./pickerUtils.js";
export function runPicker(names, maxDurationMs, onTick, onComplete) {
  if (!Array.isArray(names) || names.length === 0) throw new Error("names must be a non-empty array");
  if (typeof maxDurationMs !== "number" || maxDurationMs < 100) throw new Error("maxDurationMs must be >= 100");
  if (typeof onTick !== "function" || typeof onComplete !== "function") throw new TypeError("onTick and onComplete must be functions");

  let cancelled = false; let timerId = null;
  function cancel() { if (cancelled) return; cancelled = true; if (timerId !== null) { clearTimeout(timerId); timerId = null; } }

  const participants = names.map((e, id) => {
    if (typeof e === "string") { const name = e.trim(); if (!name) throw new Error(`names[${id}] blank`); return { id, name, chances: 1 }; }
    if (e !== null && typeof e === "object") {
      const name = typeof e.name === "string" ? e.name.trim() : "";
      if (!name) throw new Error(`names[${id}].name must be non-blank`);
      const { chances } = e;
      if (typeof chances !== "number" || !Number.isFinite(chances) || !Number.isInteger(chances) || chances < 1 || chances > 5)
        throw new RangeError(`names[${id}].chances must be 1-5`);
      return { id, name, chances };
    }
    throw new TypeError(`names[${id}] must be string or {name, chances}`);
  });

  if (participants.length === 1) {
    const o = participants[0];
    try { onTick(o.name, { phase: "final", progress: 1 }); onComplete(o.name, { chances: o.chances, index: o.id }); } catch (e) { cancel(); throw e; }
    return cancel;
  }

  function weightedPick(pool) {
    const total = pool.reduce((s, p) => s + p.chances, 0);
    const target = rpRandFloat() * total; let c = 0;
    for (const p of pool) { c += p.chances; if (target < c) return p; }
    return pool[pool.length - 1];
  }

  const winner = weightedPick(participants);
  const others = rpShuffled(participants.filter(p => p.id !== winner.id));
  const n = participants.length;

  // Build pools
  const { p1Pool, p2Pool, p3Pool } = rpBuildPools(participants, winner, others, n);

  // Tick counts
  const BASE_MIN_P1 = 120, BASE_MIN_P2 = 200;
  const BASE_MIN_P3 = Math.max(200, maxDurationMs * 0.04);
  const baseBudget = maxDurationMs * 0.55;

  const p1Ticks = rpClamp(Math.min(rpClamp(Math.ceil(n * 0.3), 8, 20), Math.floor(baseBudget * 0.40 / BASE_MIN_P1)), 4, 20);
  const p2Ticks = rpClamp(Math.min(rpClamp(Math.ceil(p2Pool.length * 0.6), 4, 10), Math.floor(baseBudget * 0.35 / BASE_MIN_P2)), 3, 10);

  const p3ModeRoll = rpRandFloat();
  const p3ModeTicks = p3ModeRoll < 0.25 ? 5 : p3ModeRoll < 0.70 ? 5 + rpRandInt(2) : 7 + rpRandInt(2);
  const maxAffordableP3 = Math.max(3, Math.floor((maxDurationMs - p1Ticks * BASE_MIN_P1 - p2Ticks * BASE_MIN_P2) / BASE_MIN_P3));
  const p3Desired = Math.max(p3Pool.length, 5);
  const p3Ticks = rpClamp(Math.min(Math.max(5, Math.min(p3Desired, p3ModeTicks)), maxAffordableP3), 3, 10);
  const p3SafeSlots = Math.max(1, p3Ticks - 2);

  const minBaseBudget = p1Ticks * BASE_MIN_P1 + p2Ticks * BASE_MIN_P2 + p3Ticks * BASE_MIN_P3;
  const theatricalBudget = Math.max(0, maxDurationMs - minBaseBudget);
  const budgetTight = theatricalBudget < maxDurationMs * 0.25;

  // Per-run personality
  const ctx = {
    BASE_MIN_P1, BASE_MIN_P2, BASE_MIN_P3, p1Ticks, p2Ticks, p3Ticks,
    theatricalBudget, budgetTight,
    lingerRate: rpRandBetween(0.10, 0.25),
    ghostRate: rpRandBetween(0.07, 0.18),
    softFakeoutRate: rpRandBetween(0.20, 0.40),
    alternateBias: rpRandBetween(0.60, 0.80),
    repeatPenalty: rpRandBetween(0.15, 0.28),
    contenderBoost: rpRandBetween(1.15, 1.45),
    recencyBoost: rpRandBetween(1.05, 1.18),
    p3ContenderIds: new Set()
  };

  // Build contender set
  if (rpRandFloat() < rpRandBetween(0.45, 0.75)) ctx.p3ContenderIds.add(winner.id);
  const p3ContenderPool = rpShuffled(p3Pool.filter(p => p.id !== winner.id));
  for (let i = 0; i < Math.min(2, p3ContenderPool.length); i++) ctx.p3ContenderIds.add(p3ContenderPool[i].id);

  // Build sequence
  const sequence = [];
  rpBuildPhaseSequence(sequence, p1Pool, p1Ticks, rpBuildGuaranteeSet(p1Pool, winner), 0, null,
    rpRandBetween(0.08, 0.20), rpRandBetween(1.35, 1.65), ctx);
  rpBuildPhaseSequence(sequence, p2Pool, p2Ticks, rpBuildGuaranteeSet(p2Pool, winner), 0, null,
    rpRandBetween(0.03, 0.10), rpRandBetween(1.25, 1.55), ctx);
  rpBuildPhaseSequence(sequence, p3Pool, p3Ticks, rpBuildGuaranteeSet(p3Pool, winner), p3Ticks - p3SafeSlots,
    rpPickWithMemory, rpRandBetween(0.01, 0.05), rpRandBetween(1.15, 1.45), ctx);

  // Ensure winner is final beat
  const lastBeat = sequence[sequence.length - 1];
  if (lastBeat.participant.id === winner.id) {
    sequence[sequence.length - 1] = { participant: winner, participant2: null, linger: false, doubleTap: false, lingerMult: 1 };
  } else {
    sequence.push({ participant: winner, participant2: null, linger: false, doubleTap: false, lingerMult: 1 });
  }

  // Build delays
  const phaseDelays = rpBuildPhaseDelays(ctx);
  const delayEntries = rpAssembleDelays(sequence, phaseDelays, ctx);
  const finalDelays = rpCompressDelays(delayEntries, maxDurationMs, ctx);

  // Execution loop
  const p1End = p1Ticks; const p2End = p1Ticks + p2Ticks; const total = sequence.length;
  function resolvePhase(idx) {
    if (idx === total - 1) return "final";
    if (idx < p1End) return 1;
    if (idx < p2End) return 2;
    return 3;
  }

  const startTime = performance.now(); let tick = 0; let lastTickTime = startTime;

  function step() {
    if (cancelled) return;
    const now = performance.now(); const elapsed = now - startTime; const tickGap = now - lastTickTime;
    if (tickGap > 500 && tick < total - 2) { tick += Math.min(Math.floor(tickGap / 100), total - 2 - tick); }
    lastTickTime = now; const isFinal = tick === total - 1;
    if (!isFinal && elapsed >= maxDurationMs) {
      try { onTick(winner.name, { phase: "final", progress: 1 }); onComplete(winner.name, { chances: winner.chances, index: winner.id }); } catch (e) { cancel(); throw e; }
      return;
    }
    const beat = sequence[tick]; const phase = resolvePhase(tick); const progress = tick / (total - 1);

    try {
      if (beat.doubleTap && beat.participant2 && !isFinal) {
        const dt1Ms = Math.max(16, Math.floor(rpRandBetween(30, 60)));
        onTick(beat.participant.name, { phase, progress });
        timerId = setTimeout(() => {
          if (cancelled) return;
          try { onTick(beat.participant2.name, { phase, progress }); } catch (e) { cancel(); throw e; }
          const rb2 = Math.max(0, maxDurationMs - (performance.now() - startTime));
          const rs2 = total - 1 - tick;
          const planned2 = Math.max(16, finalDelays[tick] - dt1Ms);
          const safe2 = rs2 > 1 ? Math.min(planned2, rb2 / rs2) : planned2;
          tick++; timerId = setTimeout(step, Math.max(16, safe2));
        }, dt1Ms);
        return;
      }
      onTick(beat.participant.name, { phase, progress });
      if (isFinal) {
        const revealDelay = Math.floor(rpRandBetween(450, 700));
        timerId = setTimeout(() => {
          if (cancelled) return;
          try { onComplete(winner.name, { chances: winner.chances, index: winner.id }); } catch (e) { cancel(); throw e; }
        }, revealDelay);
        return;
      }
    } catch (e) { cancel(); throw e; }

    const rb = Math.max(0, maxDurationMs - elapsed); const rs = total - 1 - tick;
    const safeDelay = rs > 1 ? Math.min(finalDelays[tick], rb / rs) : finalDelays[tick];
    tick++; timerId = setTimeout(step, Math.max(16, safeDelay));
  }

  step(); return cancel;
}
