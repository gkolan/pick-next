/**
 * pickAnimations.js: Animation helpers for pick cycles
 *
 * Shared by pick.js, pickRaffle.js, and pickSocial.js.
 * Handles tag class resets, sweep, wake-up, suspense bridge, and reveal.
 */

import { gsap } from "gsap";
import { getActiveTeam, getAwayNames, getSkipState, session, transient } from "./state.js";
import { waitGsap, waitTimeline } from "./config.js";

import { runPicker } from "./runPicker.js";
import { decorateRaffleWinner } from "./renderCloud.js";
import { sfx } from "./sound.js";
// ─── Reset Tag Classes ──────────────────────────────────────────────

export function resetTagClasses(selectedNames) {
  const settings = getActiveTeam().settings;
  const isRaffle = settings.mode === "raffle";
  const raffleWinners = isRaffle
    ? new Map(session.selectionHistory.filter(h => h.mode === "raffle" && h.place).map(h => [h.name, h.place]))
    : null;

  const away = getAwayNames();
  const { waiting, returning } = getSkipState();

  transient.layoutMeta.forEach(m => {
    m.el.classList.remove("suspense-highlight", "active-winner", "raffle-winner-1st", "raffle-winner-top3");
    if (isRaffle && raffleWinners && raffleWinners.has(m.name)) {
      m.el.className = "name-tag";
      decorateRaffleWinner(m.el, raffleWinners.get(m.name));
    } else if (away.has(m.name)) {
      m.el.className = "name-tag away";
    } else if (waiting.has(m.name)) {
      m.el.className = "name-tag skipped" + (returning ? " idle" : ""); // back in the pool once everyone else has gone
      m.el.setAttribute("data-chances", m.chances);
    } else if (selectedNames.has(m.name)) {
      m.el.className = "name-tag previously-selected";
    } else {
      m.el.className = isRaffle ? "name-tag raffle-idle" : "name-tag idle";
      m.el.setAttribute("data-chances", m.chances);
    }
    gsap.set(m.el, { scale: 1, clearProps: "opacity,filter,textShadow" });
  });
}

// ─── Sequential Sweep Animation ─────────────────────────────────────

export async function runSweepToTarget(winnerMeta, alreadyPicked) {
  const gen = transient.sessionGen;
  const ROW_TOLERANCE = 40;
  const sorted = transient.layoutMeta
    .filter(m => !alreadyPicked.has(m.name))
    .sort((a, b) => {
      const rowA = Math.round(a.y / ROW_TOLERANCE);
      const rowB = Math.round(b.y / ROW_TOLERANCE);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

  const winnerIdx = sorted.findIndex(m => m.name === winnerMeta.name);
  const cardsToSweep = sorted.slice(0, winnerIdx + 1);

  let prevEl = null;
  for (let i = 0; i < cardsToSweep.length; i++) {
    const m = cardsToSweep[i];
    const isLast = i === cardsToSweep.length - 1;
    const progress = cardsToSweep.length > 1 ? i / (cardsToSweep.length - 1) : 1;

    if (prevEl) {
      prevEl.classList.remove("suspense-highlight");
      gsap.to(prevEl, { scale: 1, duration: 0.08 });
    }

    m.el.classList.add("suspense-highlight");
    sfx.tick(progress);
    gsap.to(m.el, { scale: isLast ? 1.1 : 1.05, duration: 0.06, ease: "power2.out" });
    prevEl = m.el;

    const stepMs = isLast ? 0 : 60 + progress * 160;
    if (stepMs > 0) await waitGsap(stepMs / 1000);
    if (gen !== transient.sessionGen) return;
  }

  if (prevEl) {
    prevEl.classList.remove("suspense-highlight");
    gsap.to(prevEl, { scale: 1, duration: 0.1 });
  }
  await waitGsap(0.15);
}

// ─── Wake-up Ripple ─────────────────────────────────────────────────

export async function runWakeUp() {
  const gen = transient.sessionGen;
  const tl = gsap.timeline();
  transient.layoutMeta.forEach((m, i) => {
    tl.to(m.el, { opacity: 0.85, duration: 0.06, yoyo: true, repeat: 1 }, i * 0.015);
  });
  await waitTimeline(tl);
  if (gen !== transient.sessionGen) return;
  // Clear inline opacity so CSS classes take over
  transient.layoutMeta.forEach(m => gsap.set(m.el, { clearProps: "opacity" }));
  await waitGsap(0.25);
}

// ─── Suspense Animation (runPicker bridge) ──────────────────────────

export async function runSuspenseAnimation(totalDuration, alreadyPicked) {
  const eligibleMeta = transient.layoutMeta.filter(m => !alreadyPicked.has(m.name));
  if (eligibleMeta.length === 0) return null;

  const names = eligibleMeta.map(m => ({ name: m.name, chances: m.chances || 1 }));
  const maxDurationMs = totalDuration * 1000;
  const metaByName = new Map(eligibleMeta.map(m => [m.name, m]));

  let prevEl = null;

  // Dim ineligible tags during suspense, after clearing GSAP's inline opacity
  transient.layoutMeta.forEach(m => {
    gsap.set(m.el, { clearProps: "opacity" });
    if (alreadyPicked.has(m.name)) return;
    if (!metaByName.has(m.name)) return;
    m.el.classList.add("suspense-dim");
  });

  // Resolves with the winner, or null if cancelled (Escape / session end).
  return new Promise((resolve) => {
    const stop = runPicker(
      names,
      maxDurationMs,
      (name, { phase, progress }) => {
        const meta = metaByName.get(name);
        if (!meta) return;
        if (prevEl) {
          prevEl.classList.remove("suspense-highlight");
          gsap.to(prevEl, { scale: 1, duration: 0.1 });
        }
        meta.el.classList.remove("suspense-dim");
        meta.el.classList.add("suspense-highlight");
        sfx.tick(progress);
        const scaleAmt = phase === "final" ? 1.18 : 1.04 + progress * 0.12;
        gsap.to(meta.el, { scale: scaleAmt, duration: 0.08, ease: "power2.out" });
        prevEl = meta.el;
      },
      (winnerName, { chances, index }) => {
        // Clear all dim states
        transient.layoutMeta.forEach(m => m.el.classList.remove("suspense-dim"));
        if (prevEl) {
          prevEl.classList.remove("suspense-highlight");
          gsap.to(prevEl, { scale: 1, duration: 0.1 });
        }
        transient.pickerCancel = null;
        resolve({ name: winnerName, chances, index });
      }
    );
    transient.pickerCancel = () => {
      stop();
      transient.pickerCancel = null;
      transient.layoutMeta.forEach(m => {
        m.el.classList.remove("suspense-dim", "suspense-highlight");
        gsap.to(m.el, { scale: 1, duration: 0.15 });
      });
      resolve(null);
    };
  });
}

// ─── Winner Reveal ──────────────────────────────────────────────────

export async function runReveal(winner, winnerMeta, onRevealStart) {
  const gen = transient.sessionGen;
  if (!winnerMeta) return;

  winnerMeta.el.className = "name-tag active-winner";
  winnerMeta.el.setAttribute("data-chances", winnerMeta.chances);

  // Spotlight burst behind winner
  const spotlight = document.createElement("div");
  spotlight.className = "winner-spotlight";
  spotlight.style.left = (winnerMeta.x + winnerMeta.w / 2) + "px";
  spotlight.style.top = (winnerMeta.y + winnerMeta.h / 2) + "px";
  winnerMeta.el.parentElement.appendChild(spotlight);
  gsap.to(spotlight, { width: 200, height: 200, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => spotlight.remove() });

  transient.isPicking = false;
  if (onRevealStart) onRevealStart();

  const revealTl = gsap.timeline();
  revealTl
    .fromTo(winnerMeta.el,
      { scale: 0.9, opacity: 0.6 },
      { scale: 1.35, opacity: 1, duration: 0.4, ease: "back.out(2.5)" })
    .to(winnerMeta.el, { scale: 1.1, duration: 0.3, ease: "power2.out" })
    .to(winnerMeta.el, { scale: 1.2, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" });

  gsap.fromTo(winnerMeta.el, { rotation: -10 }, { rotation: 0, duration: 1, ease: "elastic.out(1.2, 0.3)" });

  await waitTimeline(revealTl);
  if (gen !== transient.sessionGen) return;
  // Clear inline opacity so CSS class (active-winner) takes over
  gsap.set(winnerMeta.el, { clearProps: "opacity" });
}
