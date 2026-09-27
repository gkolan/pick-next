/**
 * timer.js: Timer controller
 *
 * Manages the countdown timer with support for:
 *   - Auto-advance: calls onAutoExpireFn when timer goes below zero
 *   - Manual (overtime): timer goes negative, Pick Next turns red
 *   - Pause/resume
 *   - Shows 0 for a full second before acting
 *
 * Uses setOnAutoExpire() callback pattern to avoid circular imports
 * with pick.js (timer needs to trigger picks, picks need to start timers).
 */

import { getActiveTeam, transient } from "./state.js";
import { DOM } from "./domCache.js";
import { theatreCheckUrgency } from "./theatre.js";
import { sfx } from "./sound.js";

export let onAutoExpireFn = null;
let onStopFn = null;

export function setOnAutoExpire(fn) {
  onAutoExpireFn = fn;
}

/** Called with the seconds actually used (pauses excluded) whenever a running timer stops. */
export function setOnStop(fn) {
  onStopFn = fn;
}

export function start(customDuration, options = {}) {
  stop();
  const settings = getActiveTeam().settings;
  const autoAdvance = options.autoAdvance ?? settings.autoAdvance;
  transient.timerRemaining = customDuration || settings.timerDurationSec;
  transient.timerTotal = transient.timerRemaining;
  transient.timerElapsed = 0;
  transient.isTimerRunning = true;
  transient.isPaused = false;
  transient.isOvertime = false;
  hideOvertime();
  updateDisplay();

  transient.timerInterval = setInterval(() => {
    if (transient.isPaused) return;

    transient.timerRemaining--;
    transient.timerElapsed++;
    updateDisplay();
    theatreCheckUrgency(transient.timerRemaining);

    if (transient.timerRemaining === 0) {
      // Show "0" for one full tick
      sfx.buzz();
    } else if (transient.timerRemaining < 0) {
      if (autoAdvance) {
        stop();
        if (onAutoExpireFn) onAutoExpireFn();
      } else if (!transient.isOvertime) {
        transient.isOvertime = true;
        showOvertime();
      }
    }
  }, 1000);
}

export function stop() {
  if (transient.isTimerRunning && onStopFn) onStopFn(transient.timerElapsed);
  transient.isTimerRunning = false;
  transient.isPaused = false;
  transient.isOvertime = false;
  hideOvertime();
  if (transient.timerInterval) {
    clearInterval(transient.timerInterval);
    transient.timerInterval = null;
  }
}

export function pause()  { transient.isPaused = true; }
export function resume() { transient.isPaused = false; }

export function togglePause() {
  if (transient.isPaused) resume(); else pause();
}

export function updateDisplay() {
  const remaining = transient.timerRemaining;
  const total = (transient.isTimerRunning && transient.timerTotal) || getActiveTeam().settings.timerDurationSec;
  const pct = total > 0 ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;

  const isOT      = remaining < 0;
  const isZero    = remaining === 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const isUrgent  = remaining <= 5 && remaining > 0;
  const isCounting = transient.isTimerRunning && remaining > 10 && !transient.isPaused;

  DOM.timerValue.textContent = isOT ? remaining : Math.max(0, remaining);

  let cls = "timer-value";
  if (isOT)           cls += " overtime";
  else if (isZero)    cls += " urgent";
  else if (isUrgent)  cls += " urgent";
  else if (isWarning) cls += " warning";
  else if (isCounting) cls += " counting";
  else if (!transient.isTimerRunning && !transient.isPicking) cls += " inactive";
  DOM.timerValue.className = cls;

  DOM.timerBarFill.style.width = pct + "%";
  DOM.timerBarFill.className = "timer-bar-fill" + (isWarning || isZero || isOT ? " warning" : "");
}

export function showOvertime() {
  if (DOM.pickNextBtn) DOM.pickNextBtn.classList.add("is-overtime");
}

export function hideOvertime() {
  if (DOM.pickNextBtn) DOM.pickNextBtn.classList.remove("is-overtime");
}
