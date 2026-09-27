/**
 * theatre.js: Auto-hides UI chrome during active sessions
 *
 * Behavior:
 * - After 4s of inactivity, fades out header + FABs (turn bar stays)
 * - Wakes on: mouse move, mouse click, keyboard press
 * - Wakes automatically when timer reaches last 15 seconds (urgency)
 * - Stays awake while paused
 */

import { transient } from "./state.js";


export let hideTimer = null;
export let isAsleep = false;
export let isActive = false;

export const SLEEP_DELAY = 4000;  // ms before fading
export const URGENCY_THRESHOLD = 15; // seconds remaining to auto-wake
const WAKE_EVENTS = ["mousemove", "click", "keydown", "touchstart"];

export function wake() {
  if (!isActive) return;
  clearTimeout(hideTimer);
  if (isAsleep) {
    isAsleep = false;
    document.getElementById("app").classList.remove("theatre-sleep");
  }
  // Schedule next sleep
  hideTimer = setTimeout(sleep, SLEEP_DELAY);
}

export function sleep() {
  if (!isActive) return;
  // Stay awake while paused so the controls stay visible
  if (transient.isPaused) {
    hideTimer = setTimeout(sleep, SLEEP_DELAY);
    return;
  }
  isAsleep = true;
  document.getElementById("app").classList.add("theatre-sleep");
}

export function theatreCheckUrgency(secondsRemaining) {
  if (!isActive) return;
  if (secondsRemaining <= URGENCY_THRESHOLD && secondsRemaining > 0) {
    wake();
  }
}

export function startTheatre() {
  if (isActive) return;
  isActive = true;
  isAsleep = false;

  for (const type of WAKE_EVENTS) document.addEventListener(type, wake, { passive: true });

  hideTimer = setTimeout(sleep, SLEEP_DELAY);
}

export function stopTheatre() {
  if (!isActive) return;
  isActive = false;
  isAsleep = false;
  clearTimeout(hideTimer);

  for (const type of WAKE_EVENTS) document.removeEventListener(type, wake);

  document.getElementById("app").classList.remove("theatre-sleep");
}
