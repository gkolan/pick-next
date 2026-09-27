/**
 * config.js: Central configuration & shared utilities
 *
 * All tunable constants and GSAP helpers.
 * Single source of truth for timing, limits, and defaults.
 */

import { gsap } from "gsap";
// ─── Timer Constraints ──────────────────────────────────────────────

export const TIMER_MIN = 5;
export const TIMER_MAX = 1200;
export const TIMER_DEFAULT = 120;

// ─── Suspense Timing ────────────────────────────────────────────────

export const SUSPENSE_STANDUP_RANGE = [3, 5]; // picked every turn: keep it snappy
export const SUSPENSE_ICEBREAKER_RANGE = [5, 8];
export const SUSPENSE_RAFFLE_RANGES = [
  [8, 14],   // round 0 (furthest from 1st place)
  [6, 10],   // round 1
  [4, 7]     // round 2+
];

export const RAFFLE_INTER_PICK_PAUSE = 5; // seconds between raffle auto-picks (winner card holds 3.5s)
export const RAFFLE_RECAP_DELAY = 5;      // seconds after 1st place before the podium recap
export const RAFFLE_WINNER_HOLD = 3.5;    // seconds each prize winner's card stays up (1st: +1.5)

// ─── Entity Limits ──────────────────────────────────────────────────

export const MAX_PARTICIPANTS = 100;
export const MAX_TOPICS = 100;
export const MAX_TEAMS = 25;
export const MAX_TOPIC_LISTS = 25;
export const MAX_CHANCES = 5;

// ─── Ordinal Formatting ─────────────────────────────────────────────

export function formatOrdinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return n + "th";
}

/** Winners lane label: medals for the podium, ordinals after that. */
export function formatPrize(place) {
  return ["🥇 Gold", "🥈 Silver", "🥉 Bronze"][place - 1] || formatOrdinal(place);
}

// ─── Mode Defaults ──────────────────────────────────────────────────

export const MODE_DEFAULTS = {
  standup: {
    timerDurationSec: 120,
    autoAdvance: true,
    randomOrder: true
  },
  raffle: {
    prizeCount: 3
  },
  icebreaker: {
    timerDurationSec: 120
  },
  hotseat: {
    questionTimerSec: 15,
    questionsPerPerson: 5
  }
};

export const SUSPENSE_HOTSEAT_RANGE = [5, 8];
export const MAX_QUESTIONS = 50;
export const MAX_QUESTION_LISTS = 25;

// ─── GSAP Helpers ───────────────────────────────────────────────────

/**
 * Returns a promise that resolves after a GSAP-scheduled delay.
 * @param {number} seconds - Delay in seconds
 * @returns {Promise<void>}
 */
export function waitGsap(seconds) {
  return new Promise(resolve => gsap.delayedCall(seconds, resolve));
}

/**
 * Returns a promise that resolves when a GSAP timeline completes.
 * @param {gsap.core.Timeline} timeline - The GSAP timeline to await
 * @returns {Promise<void>}
 */
export function waitTimeline(timeline) {
  return new Promise(resolve => timeline.eventCallback("onComplete", resolve));
}
