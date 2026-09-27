/**
 * session.js: Session controls & post-pick helpers
 *
 * Manages:
 *   - Visual class updates after each pick (idle/winner/previously-selected)
 *   - Full session reset (End button)
 */

import { gsap } from "gsap";
import { getActiveTeam, getActiveTopicList, getAwayNames, getSkipState, session, transient } from "./state.js";
import { DOM } from "./domCache.js";
import * as Timer from "./timer.js";
import { renderCloud, renderHistory, updateUI } from "./render.js";
import { stopTheatre } from "./theatre.js";
import { decorateRaffleWinner } from "./renderCloud.js";
import { cancelQuestion } from "./questionFlow.js";

/** Invalidate before settling promises: old continuations must not touch a new session. */
function cancelPendingWork() {
  transient.sessionGen++;
  transient.pendingTurn = null;
  transient.pickInFlight = null;
  transient.pickerCancel?.();
  transient.pickerCancel = null;
  cancelQuestion();
}

export function applyIdleClasses() {
  const settings = getActiveTeam().settings;
  const isRaffle = settings.mode === "raffle";
  const isSocial = settings.mode === "icebreaker";
  const raffleWinners = isRaffle
    ? new Map(session.selectionHistory.filter(h => h.mode === "raffle" && h.place).map(h => [h.name, h.place]))
    : null;

  let dimmedNames;
  if (isSocial) {
    const topicList = getActiveTopicList();
    if (topicList && !topicList.settings.allowRepeatPeople) {
      dimmedNames = new Set(session.usedPeople);
    } else {
      dimmedNames = new Set();
    }
  } else {
    dimmedNames = new Set(session.selectionHistory.map(h => h.name));
  }

  const away = getAwayNames();
  const { waiting, returning } = getSkipState();

  transient.layoutMeta.forEach(m => {
    if (isRaffle && raffleWinners && raffleWinners.has(m.name)) {
      m.el.className = "name-tag";
      decorateRaffleWinner(m.el, raffleWinners.get(m.name));
      if (m.name === transient.currentWinner) m.el.classList.add("active-winner");
    } else if (m.name === transient.currentWinner) {
      m.el.className = "name-tag active-winner";
      m.el.setAttribute("data-chances", m.chances);
    } else if (away.has(m.name)) {
      m.el.className = "name-tag away";
    } else if (waiting.has(m.name)) {
      m.el.className = "name-tag skipped" + (returning ? " idle" : "");
      gsap.to(m.el, { scale: 1, duration: 0.3 });
    } else if (dimmedNames.has(m.name)) {
      m.el.className = "name-tag previously-selected";
      gsap.to(m.el, { scale: 1, duration: 0.3 });
    } else {
      m.el.className = isRaffle ? "name-tag raffle-idle" : "name-tag idle";
      m.el.setAttribute("data-chances", m.chances);
      gsap.to(m.el, { scale: 1, duration: 0.3 });
    }
  });
}

export function showRecapEarly() {
  stopTheatre();
  cancelPendingWork();
  Timer.stop();
  transient.isPicking = false;
  transient.currentWinner = null;
  if (!session.endedAt) session.endedAt = Date.now();

  if (DOM.topicBar) DOM.topicBar.classList.remove("visible");
  if (DOM.hotseatCard) DOM.hotseatCard.style.display = "none";

  transient.layoutMeta.forEach(m => {
    m.el.className = "name-tag previously-selected";
    gsap.set(m.el, { scale: 1, clearProps: "filter,textShadow" });
  });

  updateUI(); // endedAt is set, so updateUI renders the ended state (recap, locked bars)
}

/** Escape mid-pick: stop the roulette and invalidate the in-flight pick (its awaits check gen). */
export function cancelPick() {
  cancelPendingWork();
  transient.isPicking = false;
  session.raffleCurrentPlace = null; // the raffle's own cleanup is gen-guarded
  renderCloud(); // also restores the people cloud when cancelling a topic draw
  updateUI();
}

export function clearLayoutAnimationState() {
  transient.layoutMeta.forEach(m => {
    if (!m.el) return;
    gsap.killTweensOf(m.el);
    gsap.set(m.el, { scale: 1, opacity: 1, clearProps: "transform,opacity,filter,textShadow" });
  });
}

export function endSession() {
  stopTheatre();
  cancelPendingWork();

  Timer.stop();
  transient.isPicking = false;
  transient.currentWinner = null;

  session.reset();
  transient.timerRemaining = getActiveTeam().settings.timerDurationSec;
  clearLayoutAnimationState();

  if (DOM.turnBar) DOM.turnBar.classList.remove("visible");
  if (DOM.topicBar) DOM.topicBar.classList.remove("visible");
  if (DOM.topicBarText) {
    DOM.topicBarText.textContent = "";
    DOM.topicBarText.title = "";
  }
  if (DOM.winnersLane) DOM.winnersLane.style.display = "none";
  if (DOM.progressLane) DOM.progressLane.style.display = "none";
  DOM.progressLaneList?.replaceChildren();
  if (DOM.recapPanel) DOM.recapPanel.style.display = "none";
  if (DOM.hotseatCard) DOM.hotseatCard.style.display = "none";
  if (DOM.cloudContainer) DOM.cloudContainer.style.display = "";
  if (DOM.sidebarCurrentTopic) {
    DOM.sidebarCurrentTopic.style.display = "none";
    DOM.sidebarCurrentTopic.textContent = "";
  }
  if (DOM.sidebarCurrentName) {
    gsap.killTweensOf(DOM.sidebarCurrentName);
    gsap.set(DOM.sidebarCurrentName, { clearProps: "opacity,transform" });
    DOM.sidebarCurrentName.textContent = "";
    DOM.sidebarCurrentName.classList.remove("raffle-reveal");
  }

  if (DOM.timerValue) DOM.timerValue.parentElement.style.display = "";

  renderCloud();
  renderHistory();
  Timer.updateDisplay();
  updateUI();
}
