/**
 * render.js: UI state management and renderAll orchestrator
 *
 * updateUI() manages all runtime UI state: mode buttons, settings sections,
 * idle/active states, turn bar, settings lock, and status bar.
 * SVG helpers in svgHelpers.js. Cloud rendering in renderCloud.js.
 */

import { gsap } from "gsap";
import { getData, getActiveTeam, getActiveTopicList, getPresentParticipants, getSkipState, session, transient, MODE_LABELS, MODE_EMOJI } from "./state.js";
import { DOM } from "./domCache.js";
import { formatOrdinal } from "./config.js";
import * as Timer from "./timer.js";
import { renderCloud, positionBarAboveCloud } from "./renderCloud.js";
import { renderHistory, updateStatus, renderTeamDropdown, renderTopicListDropdown } from "./renderHistory.js";

import { renderQuestionListDropdown } from "./renderHistory.js";
import { createPauseSvg, createPlaySvg, setButtonContent } from "./svgHelpers.js";
import { formatElapsed } from "./recapText.js";
import { confetti } from "./confetti.js";
import { DEMO_TEAM } from "./demoData.js";
import { stopTheatre } from "./theatre.js";
// Re-export for consumers
export { renderCloud, renderTopicCloud, positionBarAboveCloud } from "./renderCloud.js";
export { renderHistory, updateStatus, renderTeamDropdown, renderTopicListDropdown, renderQuestionListDropdown } from "./renderHistory.js";

// ─── UI State Sub-functions ─────────────────────────────────────────

export function updateModeAndSettings(settings) {
  DOM.modeBtns.forEach(btn => {
    const isActive = btn.dataset.mode === settings.mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  DOM.settingsStandup.style.display = settings.mode === "standup" ? "" : "none";
  DOM.settingsRaffle.style.display = settings.mode === "raffle" ? "" : "none";
  DOM.settingsIcebreaker.style.display = settings.mode === "icebreaker" ? "" : "none";
  if (DOM.settingsHotseat) DOM.settingsHotseat.style.display = settings.mode === "hotseat" ? "" : "none";
  DOM.timerInput.value = settings.timerDurationSec;
  DOM.timerModeBtn.setAttribute("aria-checked", settings.autoAdvance ? "true" : "false");
  DOM.orderModeBtn.setAttribute("aria-checked", settings.randomOrder ? "true" : "false");
  DOM.prizeCountInput.value = settings.raffle ? settings.raffle.prizeCount : 3;
  if (settings.mode === "icebreaker") {
    DOM.icebreakerTimerInput.value = settings.timerDurationSec;
    const topicList = getActiveTopicList();
    if (topicList) {
      const ts = topicList.settings;
      DOM.topicRotationBtn.setAttribute("aria-checked", ts.topicRotation === "new-topic-new-person" ? "true" : "false");
      DOM.repeatPeopleBtn.setAttribute("aria-checked", ts.allowRepeatPeople ? "true" : "false");
      DOM.repeatTopicsBtn.setAttribute("aria-checked", ts.allowRepeatTopics ? "true" : "false");
    }
  }
  const isSocial = settings.mode === "icebreaker";
  const isHotseat = settings.mode === "hotseat";
  DOM.topicListSelect.style.display = isSocial ? "" : "none";
  DOM.newTopicListBtn.style.display = isSocial ? "" : "none";
  DOM.editTopicsBtn.style.display = isSocial ? "" : "none";

  // Update menu labels for hotseat vs icebreaker
  const listLabel = isHotseat ? "Questions" : "Topics";
  if (DOM.editTopicsMenuBtn) DOM.editTopicsMenuBtn.textContent = "Edit " + listLabel;
  if (DOM.newTopicsMenuBtn) DOM.newTopicsMenuBtn.textContent = "New " + listLabel + " List";
  if (DOM.mobileEditTopicsBtn) DOM.mobileEditTopicsBtn.textContent = "Edit " + listLabel;
  if (DOM.mobileNewTopicsBtn) DOM.mobileNewTopicsBtn.textContent = "New " + listLabel;
}

export function lockSettings(isIdle) {
  const lock = !isIdle;
  const lockEl = (el) => {
    if (!el) return;
    el.disabled = lock; // all inputs/selects/buttons: blocks keyboard too, not just the mouse
    el.style.opacity = lock ? "0.4" : "";
  };
  [DOM.timerInput, DOM.icebreakerTimerInput, DOM.prizeCountInput,
   DOM.timerModeBtn, DOM.orderModeBtn, DOM.topicRotationBtn,
   DOM.repeatPeopleBtn, DOM.repeatTopicsBtn, DOM.editBtn,
   DOM.teamSelect, DOM.newTeamBtn, DOM.deleteTeamBtn,
   DOM.topicListSelect, DOM.icebreakerTopicListSelect, DOM.newTopicListBtn, DOM.editTopicsBtn,
   DOM.hotseatQuestionListSelect, DOM.hotseatQuestionsPerPerson, DOM.hotseatTimerInput,
   DOM.mobileEditBtn, DOM.mobileNewBtn, DOM.editTeamMenuBtn, DOM.editTopicsMenuBtn,
   DOM.newTeamMenuBtn, DOM.newTopicsMenuBtn, DOM.mobileEditTeamBtn, DOM.mobileEditTopicsBtn,
   DOM.mobileNewTeamBtn, DOM.mobileNewTopicsBtn, DOM.importBtn
  ].forEach(lockEl);
  DOM.modeBtns.forEach(lockEl);
  // Disable delete when only 1 team exists
  if (DOM.deleteTeamBtn) {
    const teamCount = Object.keys(getData().teams).length;
    if (teamCount <= 1) { DOM.deleteTeamBtn.disabled = true; DOM.deleteTeamBtn.style.opacity = "0.3"; }
    else if (!lock) { DOM.deleteTeamBtn.disabled = false; DOM.deleteTeamBtn.style.opacity = ""; }
  }
}

export function updateActiveState(settings, isSocial, hasTurn) {
  DOM.turnBar.inert = false;
  DOM.turnBar.classList.remove("washed");
  const isRaffle = settings.mode === "raffle";
  const isHotseat = settings.mode === "hotseat";
  const inHotSeatQuestions = isHotseat && DOM.hotseatCard && DOM.hotseatCard.style.display !== "none";
  if (isRaffle && transient.isPicking && session.raffleCurrentPlace) {
    DOM.turnBar.classList.add("visible");
    DOM.sidebarCurrentName.textContent = "Selecting " + formatOrdinal(session.raffleCurrentPlace) + " Place\u2026";
    DOM.sidebarCurrentName.classList.remove("raffle-reveal");
    DOM.timerValue.parentElement.style.display = "none";
  } else if (transient.currentWinner && !transient.isPicking) {
    DOM.turnBar.classList.add("visible");
    // Hot Seat only times questions; between rounds there is no clock to show.
    const hideTimer = isRaffle || (isHotseat && !inHotSeatQuestions);
    DOM.timerValue.parentElement.style.display = hideTimer ? "none" : "";
  } else if (transient.isPicking) {
    // Keep the turn bar visible, with minimal chrome, during the picking animation
    DOM.turnBar.classList.add("visible");
    DOM.sidebarCurrentName.textContent = "Selecting\u2026";
    DOM.timerValue.parentElement.style.display = "none";
  } else {
    DOM.turnBar.classList.remove("visible");
    DOM.timerValue.parentElement.style.display = "";
  }
  // Hot Seat writes its own status lines ("X is in the Hot Seat!", "Q2 of 5", ...)
  // Not while picking the next one: the bar says "Selecting…" (the counter has already moved on)
  if (transient.currentWinner && !transient.isPicking && !isRaffle && !isHotseat) DOM.sidebarCurrentName.textContent = transient.currentWinner;

  // Turn counter (standup/icebreaker)
  if (DOM.turnCounter) {
    const total = getPresentParticipants().length;
    const current = session.selectionHistory.length;
    if (settings.mode === "standup" && (current > 0 || transient.isPicking)) {
      // Count people, not picks: a skipped speaker coming back doesn't add a turn
      const people = new Set(session.selectionHistory.map(h => h.name)).size;
      const next = transient.isPicking && !getSkipState().returning ? people + 1 : people;
      DOM.turnCounter.textContent = Math.min(next, total) + " / " + total;
      DOM.turnCounter.style.display = "";
    } else if (settings.mode === "icebreaker" && current > 0) {
      DOM.turnCounter.textContent = current + " / " + total;
      DOM.turnCounter.style.display = "";
    } else if (isRaffle && session.raffleCurrentPlace) {
      DOM.turnCounter.textContent = "Picking " + formatOrdinal(session.raffleCurrentPlace) + " Place";
      DOM.turnCounter.style.display = "";
    } else {
      DOM.turnCounter.style.display = "none";
    }
  }

  // Skip button (standup/icebreaker, while someone has the turn), labeled by what it will do
  // Shown from the reveal on, not just while the clock runs, so it doesn't pop in after "You're up!"
  if (DOM.skipBtn) {
    const hasSpeaker = isHotseat ? hasTurn : transient.currentWinner && !transient.isPicking; // Hot Seat skips timed questions
    DOM.skipBtn.style.display = (hasSpeaker && !isRaffle) ? "" : "none";
    DOM.skipBtn.textContent = (settings.mode === "hotseat") ? "Skip Question" : "Skip Speaker";
  }
  if (isSocial && session.sessionTopic) {
    DOM.topicBar.classList.add("visible");
    DOM.topicBarText.textContent = session.sessionTopic;
    DOM.topicBarText.title = session.sessionTopic;
    positionBarAboveCloud();
  } else {
    DOM.topicBar.classList.remove("visible");
  }
  DOM.pickNextBtn.disabled = transient.isPicking || transient.pickInFlight !== null;
  if (transient.isPicking || inHotSeatQuestions) {
    // Pick animation, or the question card owns the controls
    DOM.turnBarActions.style.display = "none";
  } else {
    DOM.turnBarActions.style.display = "";
    setButtonContent(DOM.pickNextBtn, createPlaySvg(), " Pick Next");
  }
  if (isRaffle) {
    DOM.pickNextBtn.style.display = "none";
    DOM.pauseBtn.style.display = "none";
  } else {
    DOM.pickNextBtn.style.display = "";
    DOM.pauseBtn.style.display = isHotseat ? "none" : "";
    DOM.pauseBtn.disabled = !hasTurn;
    DOM.pauseBtn.style.opacity = hasTurn ? "" : "0.3";
    if (transient.isPaused) {
      DOM.pauseBtn.classList.add("is-paused");
      setButtonContent(DOM.pauseBtn, createPlaySvg(), " Resume");
    } else {
      DOM.pauseBtn.classList.remove("is-paused");
      setButtonContent(DOM.pauseBtn, createPauseSvg(), " Pause");
    }
  }
}

// ─── Full UI State Update ───────────────────────────────────────────

export function updateUI() {
  const team = getActiveTeam();
  const settings = team.settings;
  const hasHistory = session.selectionHistory.length > 0;
  const hasTurn = transient.isTimerRunning && transient.currentWinner;
  const isIdle = !hasHistory && !transient.currentWinner && !transient.isPicking;
  const isSocial = settings.mode === "icebreaker";
  const selectedNames = new Set(session.selectionHistory.map(h => h.name));
  const socialRepeat = isSocial && (() => { const tl = getActiveTopicList(); return tl && tl.settings.allowRepeatPeople; })();
  const present = getPresentParticipants(team);
  // Standup isn't over while a skipped speaker is still owed their turn
  const noneLeft = settings.mode === "standup" ? getSkipState(team).eligible.length === 0 : present.every(p => selectedNames.has(p.name));
  const allPicked = !socialRepeat && hasHistory && present.length > 0 && noneLeft && !transient.isPicking;
  // Ended = everyone picked, or the host ended early (showRecapEarly stamps endedAt).
  const endedEarly = !!session.endedAt && hasHistory && !transient.isTimerRunning && !transient.isPicking;
  // pendingTurn: the last speaker's "You're up!" pause is still their turn, not the end
  const isEnded = (allPicked && !transient.isTimerRunning && !transient.pendingTurn) || endedEarly;

  updateModeAndSettings(settings);
  document.getElementById("exit-demo-btn").style.display = team.name === DEMO_TEAM.name ? "" : "none";
  DOM.participantCount.textContent = team.participants.length + " participants";

  // Progress lane: the whole session (and its recap), every mode but Raffle (it has Winners)
  DOM.progressLane.style.display = !isIdle && settings.mode !== "raffle" ? "" : "none";
  // Recap is visible exactly while the session is ended
  if (DOM.recapPanel) DOM.recapPanel.style.display = isEnded ? "" : "none";
  // Blur the names behind a focus card (recap, hot seat question)
  DOM.cloudContainer.classList.toggle("dimmed", isEnded || DOM.hotseatCard?.style.display === "");

  if (isEnded) {
    if (transient.currentWinner) {
      transient.currentWinner = null;
      transient.layoutMeta.forEach(m => {
        m.el.className = "name-tag previously-selected";
        gsap.set(m.el, { scale: 1, clearProps: "filter,textShadow" });
      });
    }
    if (!session.endedAt) {
      session.endedAt = Date.now();
      if (allPicked) confetti(90, ["🎉", "⭐", MODE_EMOJI[settings.mode]]); // everyone had their turn
    }
    DOM.cloudContainer.style.display = "";
    DOM.cloudContainer.style.transition = "";
    DOM.cloudContainer.style.opacity = "";
    DOM.turnBar.classList.remove("visible");
    DOM.turnBar.inert = true;
    DOM.topicBar.classList.remove("visible");
    // Settle the progress lane: nobody is "current" once the session is over.
    const current = DOM.progressLaneList?.querySelector(".progress-lane-card.current");
    if (current) current.classList.replace("current", "done");
    renderRecap(settings);
  } else if (isIdle) {
    // Idle: the welcome overlay handles pre-session setup
    DOM.cloudContainer.style.display = "";
    DOM.turnBar.classList.remove("visible");
    DOM.turnBar.inert = true;
    DOM.topicBar.classList.remove("visible");
  } else {
    DOM.cloudContainer.style.display = "";
    DOM.cloudContainer.style.transition = "";
    DOM.cloudContainer.style.opacity = "";
    updateActiveState(settings, isSocial, hasTurn);
  }

  lockSettings(isIdle);

  // Start CTA: the only way to begin once the welcome overlay is gone
  if (DOM.startCta) {
    DOM.startCta.style.display = isIdle ? "" : "none";
    if (isIdle) {
      setButtonContent(DOM.startBtn, createPlaySvg(), " Start " + (MODE_LABELS[settings.mode] || "Session"));
      const n = team.participants.length;
      const count = present.length < n ? present.length + " of " + n + " here" : n + (n === 1 ? " person" : " people");
      DOM.startTeam.textContent = team.name + " · " + count + " ▾";
      // Show the turn length and chances up front, one click from changing them
      const timed = settings.mode === "standup" || settings.mode === "icebreaker";
      const extra = team.participants.filter(p => p.chances > 1).length;
      document.getElementById("start-chip-timer").hidden = !timed;
      document.getElementById("start-timer-value").textContent = settings.timerDurationSec + "s";
      document.getElementById("start-timer-unit").textContent = settings.mode === "standup" ? " per speaker" : " per round";
      document.getElementById("start-chances-value").textContent = extra || "1";
      document.getElementById("start-chances-unit").textContent = extra ? " with extra chances" : " chance each";
    }
  }
  if (isIdle || isEnded) stopTheatre();

  // In a session the FAB turns into a card holding Settings + Exit (CSS shows Exit)
  DOM.stageFab.classList.toggle("in-session", !isIdle);
  DOM.stageFab.hidden = isEnded; // the recap has its own Run Again / Close
  document.getElementById("exit-btn-label").textContent = "Exit " + (MODE_LABELS[settings.mode] || "Session");
  // Mid-session, Exit ends with the recap (same as E); once ended it leaves
  DOM.exitBtn.dataset.recap = String(!isEnded && hasHistory);

  // Presenter mode: lock mode switching during active session
  const modeSwitcher = DOM.modeBtns[0]?.parentElement;
  if (modeSwitcher) {
    const isPresenter = document.getElementById("app").classList.contains("presenter-mode");
    modeSwitcher.classList.toggle("session-locked", isPresenter && !isIdle);
  }

  if (isEnded) DOM.endSection.style.display = "none";
  else if (transient.currentWinner || transient.isTimerRunning) {
    DOM.endSection.style.display = "";
    DOM.endSessionBtn.textContent = "End " + (MODE_LABELS[settings.mode] || "Session");
  } else DOM.endSection.style.display = "none";

  if (transient.isPicking) updateStatus("Selecting...", true);
  else if (transient.isTimerRunning && transient.isPaused) updateStatus(transient.currentWinner + " (paused)", false);
  else if (transient.isTimerRunning) updateStatus(transient.currentWinner + "'s turn", false);
  else if (transient.currentWinner) updateStatus("Ready for next pick", false);
  else updateStatus("Ready", false);

}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Progress Lane ─────────────────────────────────────────────────

/** Adds the new current person to the progress lane; returns the card. */
export function addProgressCard(name, sub) {
  DOM.progressLaneList.querySelector(".progress-lane-card.current")?.classList.replace("current", "done");
  const card = document.createElement("div");
  card.className = "progress-lane-card current";
  card.dataset.name = name;
  const badge = document.createElement("span");
  badge.className = "progress-lane-badge";
  badge.textContent = DOM.progressLaneList.children.length + 1;
  const nameEl = document.createElement("span");
  nameEl.className = "progress-lane-name";
  nameEl.textContent = name;
  nameEl.title = name;
  card.append(badge, nameEl);
  if (sub) {
    const subEl = document.createElement("span");
    subEl.className = "progress-lane-topic";
    subEl.textContent = sub;
    card.appendChild(subEl);
  }
  DOM.progressLaneList.appendChild(card);
  return card;
}

// ─── Recap Panel ───────────────────────────────────────────────────

export function renderRecap(settings) {
  if (!DOM.recapPanel) return;
  const history = session.selectionHistory;
  const elapsed = (session.endedAt || Date.now()) - (session.startedAt || Date.now());
  const mode = settings.mode;
  const label = MODE_LABELS[mode] || "Session";

  const total = getPresentParticipants().length;
  const expected = mode === "raffle"
    ? Math.min(settings.raffle ? settings.raffle.prizeCount : total, total - 1)
    : total;
  const isPartial = history.length < expected;
  const countLabel = { standup: " speakers", raffle: " winners" }[mode] || " rounds";
  DOM.recapTitle.textContent = label + (isPartial ? " Ended" : " Complete") + " \u2014 " + history.length + (isPartial ? " of " + expected : "") + countLabel;
  DOM.recapTime.textContent = "Total time: " + formatElapsed(elapsed);

  const body = DOM.recapBody;
  body.replaceChildren();

  if (mode === "standup") {
    const list = document.createElement("ol");
    list.className = "recap-list";
    history.forEach(h => {
      const li = document.createElement("li");
      li.className = "recap-item" + (h.skipped ? " skipped" : "");
      li.textContent = h.name + (h.skipped ? " (skipped)" : h.timerUsed != null ? " \u2014 " + formatElapsed(h.timerUsed * 1000) : "");
      list.appendChild(li);
    });
    body.appendChild(list);
  } else if (mode === "raffle") {
    const podium = document.createElement("div");
    podium.className = "recap-podium";
    const sorted = [...history].sort((a, b) => (a.place || 999) - (b.place || 999));
    sorted.forEach(h => {
      const card = document.createElement("div");
      card.className = "recap-podium-card" + (h.place === 1 ? " first" : h.place <= 3 ? " top3" : "");
      const placeEl = document.createElement("span");
      placeEl.className = "recap-place";
      placeEl.textContent = formatOrdinal(h.place || 0);
      const nameEl = document.createElement("span");
      nameEl.className = "recap-name";
      nameEl.textContent = h.name;
      card.append(placeEl, nameEl);
      podium.appendChild(card);
    });
    body.appendChild(podium);

  } else if (mode === "icebreaker") {
    const list = document.createElement("ol");
    list.className = "recap-list";
    history.forEach(h => {
      const li = document.createElement("li");
      li.className = "recap-item";
      li.textContent = h.name + (h.topic ? " \u2014 \"" + h.topic + "\"" : "");
      list.appendChild(li);
    });
    body.appendChild(list);
  } else if (mode === "hotseat") {
    const list = document.createElement("ol");
    list.className = "recap-list";
    history.forEach(h => {
      const li = document.createElement("li");
      li.className = "recap-item";
      li.textContent = h.name + (h.questionsAnswered != null ? " \u2014 " + h.questionsAnswered + " questions" : "");
      list.appendChild(li);
    });
    body.appendChild(list);
  }

  DOM.recapPanel.style.display = "";
}

// ─── Render Everything ──────────────────────────────────────────────

export function renderAll() {
  renderTeamDropdown();
  renderTopicListDropdown();
  renderQuestionListDropdown();
  renderCloud();
  renderHistory();
  Timer.updateDisplay();
  updateUI();
}
