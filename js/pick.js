/**
 * pick.js: Pick cycle orchestration
 *
 * Entry point: beginPickCycle(triggerSource)
 * Delegates to pickRaffle.js and pickSocial.js for mode-specific logic.
 * Animation helpers are in pickAnimations.js.
 */

import { getActiveTeam, getActiveTopicList, getAwayNames, getPresentParticipants, getSkipState, session, transient, MODE_EMOJI } from "./state.js";
import { DOM } from "./domCache.js";
import { waitGsap } from "./config.js";
import { getDuration } from "./suspense.js";
import * as Timer from "./timer.js";
import { addProgressCard, renderHistory, updateUI } from "./render.js";
import { positionBarAboveCloud } from "./renderCloud.js";
import { applyIdleClasses } from "./session.js";
import { resetTagClasses, runSweepToTarget, runWakeUp, runSuspenseAnimation, runReveal } from "./pickAnimations.js";
import { runRaffleLoop } from "./pickRaffle.js";
import { pickIcebreakerTopic } from "./pickIcebreaker.js";
import { runHotSeatRound } from "./pickHotSeat.js";
import { startTheatre } from "./theatre.js";
import { closeSidebar } from "./eventsDialog.js";
import { celebrate } from "./confetti.js";

// ─── Loading State Helpers ──────────────────────────────────────────

export function showLoadingState() {
  if (DOM.turnBar) DOM.turnBar.classList.remove("visible");
}

/** Seconds the "You're up!" card stays before the speaker's timer starts. */
const THINK_SEC = 2;

// ─── Sequential Winner Selection ────────────────────────────────────

export function pickSequentialWinner(eligible) {
  const eligibleNames = new Set(eligible.map(p => p.name));
  const ROW_TOLERANCE = 40;
  const sorted = transient.layoutMeta
    .filter(m => eligibleNames.has(m.name))
    .sort((a, b) => {
      const rowA = Math.round(a.y / ROW_TOLERANCE);
      const rowB = Math.round(b.y / ROW_TOLERANCE);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });
  const nextName = sorted.length > 0 ? sorted[0].name : eligible[0].name;
  return eligible.find(p => p.name === nextName);
}

// ─── Sidebar Reveal Callback ────────────────────────────────────────

export function createSidebarReveal(settings, winner, gen) {
  return () => {
    if (gen !== transient.sessionGen) return;
    const historyEntry = {
      name: winner.name, chances: winner.chances,
      mode: settings.mode, timestamp: Date.now()
    };
    if (settings.mode === "icebreaker" && session.sessionTopic) historyEntry.topic = session.sessionTopic;
    session.selectionHistory.push(historyEntry);
    if (settings.mode === "raffle") session.raffleRound++;

    if (settings.mode === "icebreaker" && !session.usedPeople.includes(winner.name)) {
      session.usedPeople.push(winner.name);
    }

    transient.currentWinner = winner.name;
    renderHistory();
    applyIdleClasses();

    if (settings.mode === "icebreaker") {
      celebrate({ emoji: MODE_EMOJI.icebreaker, kicker: "Your turn to answer", name: winner.name, sub: session.sessionTopic || "", tone: "var(--mint)", hold: THINK_SEC });
    } else {
      celebrate({ emoji: MODE_EMOJI.standup, kicker: "You're up!", name: winner.name, tone: "var(--sun)", hold: THINK_SEC });
    }

    // Progress lane: one card per pick
    if (settings.mode === "standup" || settings.mode === "icebreaker") {
      addProgressCard(winner.name, settings.mode === "icebreaker" ? session.sessionTopic : "");
    }

    if (settings.mode === "icebreaker" && session.sessionTopic && DOM.topicBar) {
      DOM.topicBarText.textContent = session.sessionTopic;
      DOM.topicBarText.title = session.sessionTopic;
      DOM.topicBar.classList.add("visible");
    }

    // The clock starts once the card leaves, so the speaker gets a moment to gather thoughts.
    const useCustomTimer = (settings.mode === "standup" || settings.mode === "icebreaker") && winner.timerSec;
    const pickNo = session.selectionHistory.length;
    const turn = {};
    transient.pendingTurn = turn;
    updateUI();
    setTimeout(() => {
      if (transient.pendingTurn !== turn) return;
      transient.pendingTurn = null;
      // ended, re-picked, or Skip / Pick Next already started the next pick during the pause
      if (transient.sessionGen !== gen || session.selectionHistory.length !== pickNo || transient.isPicking) return;
      Timer.start(useCustomTimer ? winner.timerSec : undefined);
      updateUI();
    }, (THINK_SEC + 0.45) * 1000); // + celebrate()'s pop-in
  };
}

/** Timer stop hook: remember how long the current speaker actually spoke. */
export function recordSpeakerTime(seconds) {
  const mode = getActiveTeam().settings.mode;
  if (mode !== "standup" && mode !== "icebreaker") return;
  const last = session.selectionHistory[session.selectionHistory.length - 1];
  if (last && last.name === transient.currentWinner && last.timerUsed == null) last.timerUsed = seconds;
}

// ─── Main Pick Cycle ────────────────────────────────────────────────

/**
 * True while a pick cycle is running end to end (animation, reveal, and for
 * Hot Seat the whole question round). `isPicking` alone is not a lock: the
 * reveal clears it early so the UI can show the winner.
 */
export function isPickBusy() {
  return transient.isPicking || transient.pickInFlight !== null;
}

export async function beginPickCycle(triggerSource) {
  if (isPickBusy()) return;
  transient.pendingTurn = null;
  const token = {};
  transient.pickInFlight = token;
  if (DOM.startCta) DOM.startCta.style.display = "none";
  try {
    return await runPickCycle(triggerSource);
  } finally {
    // A newer session may own the lock by now (endSession clears it).
    if (transient.pickInFlight === token) {
      transient.pickInFlight = null;
      updateUI();
    }
  }
}

async function runPickCycle(triggerSource) {

  closeSidebar();

  const team = getActiveTeam();
  const settings = team.settings;
  const participants = getPresentParticipants(team);
  if (participants.length === 0) return;

  if (settings.mode === "raffle" && triggerSource !== "raffle-internal") {
    return runRaffleLoop();
  }

  if (settings.mode === "hotseat") {
    return runHotSeatRound();
  }

  DOM.cloudContainer.style.transition = "";
  DOM.cloudContainer.style.opacity = "";

  transient.isPicking = true;
  const gen = transient.sessionGen;
  const isAuto = triggerSource === "auto-timer" || triggerSource === "raffle-internal";

  if (!session.startedAt) session.startedAt = Date.now();
  Timer.stop(); // stop the previous turn before awaiting an Icebreaker topic

  if (settings.mode === "icebreaker") {
    // Keep the turn bar's slot filled (faded, not clickable) while the topic is drawn;
    // updateUI() clears "washed" once a person is being picked.
    DOM.turnBar.classList.add("visible", "washed");
    DOM.turnBar.inert = true;
    DOM.sidebarCurrentName.textContent = "Picking a topic…";
    DOM.timerValue.parentElement.style.display = "none";
    positionBarAboveCloud();
    DOM.topicBarText.textContent = session.selectionHistory.length === 0 ? "New Topic" : "Next Topic";
    DOM.topicBar.classList.add("visible");
    await pickIcebreakerTopic();
    if (gen !== transient.sessionGen || !transient.isPicking) return; // cancelled mid-topic
  }

  if (settings.mode === "standup") {
    DOM.topicBarText.textContent = "Next";
    DOM.topicBar.classList.add("visible");
    positionBarAboveCloud();
  }

  showLoadingState();
  Timer.stop();
  transient.timerRemaining = settings.timerDurationSec;
  Timer.updateDisplay();
  updateUI();

  // Progress lane display is deferred until first winner reveal (P1)

  const selectedNames = new Set(session.selectionHistory.map(h => h.name));
  let eligible;
  let excludedNames;

  if (settings.mode === "icebreaker") {
    const topicList = getActiveTopicList();
    if (topicList && !topicList.settings.allowRepeatPeople) {
      const usedSet = new Set(session.usedPeople);
      eligible = participants.filter(p => !usedSet.has(p.name));
      excludedNames = usedSet;
    } else {
      eligible = [...participants];
      excludedNames = new Set();
    }
  } else if (settings.mode === "standup") {
    // Skipped speakers sit out until everyone else has gone, then get their turn
    const pool = new Set(getSkipState(team).eligible);
    eligible = participants.filter(p => pool.has(p.name));
    excludedNames = new Set(participants.filter(p => !pool.has(p.name)).map(p => p.name));
  } else {
    eligible = participants.filter(p => !selectedNames.has(p.name));
    excludedNames = selectedNames;
  }
  excludedNames = new Set([...excludedNames, ...getAwayNames(team)]); // out today never lands

  if (eligible.length === 0) {
    transient.isPicking = false;
    updateUI();
    return;
  }

  const duration = getDuration(settings.mode, session.raffleRound);
  resetTagClasses(excludedNames);
  await waitGsap(0.4);
  if (gen !== transient.sessionGen) return;

  let winner, winnerMeta, sidebarReveal;

  try {
    if (eligible.length <= 1) {
      winner = eligible[0];
      winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
      sidebarReveal = createSidebarReveal(settings, winner, gen);
      await runReveal(winner, winnerMeta, sidebarReveal);
    } else if (settings.randomOrder === false) {
      winner = pickSequentialWinner(eligible);
      winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
      sidebarReveal = createSidebarReveal(settings, winner, gen);
      await runSweepToTarget(winnerMeta, excludedNames);
      if (gen !== transient.sessionGen) return;
      await runReveal(winner, winnerMeta, sidebarReveal);
    } else {
      if (!isAuto) await runWakeUp();
      if (gen !== transient.sessionGen) return;
      const result = await runSuspenseAnimation(
        isAuto ? Math.min(duration, 3.5) : duration,
        excludedNames
      );
      if (!result || gen !== transient.sessionGen) return; // cancelled
      winner = eligible.find(p => p.name === result.name) || { name: result.name, chances: result.chances };
      winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
      sidebarReveal = createSidebarReveal(settings, winner, gen);
      await runReveal(winner, winnerMeta, sidebarReveal);
    }
  } finally {
    if (gen === transient.sessionGen) {
      transient.isPicking = false;
      startTheatre();
      updateUI();
    }
  }
}
