/**
 * pickHotSeat.js: Hot Seat mode orchestrator
 *
 * Phase 1: Pick a person from the cloud (standard suspense)
 * Phase 2: Rapid-fire questions with per-question timer
 * Phase 3: Round end, then continue or show the recap
 */

import { getActiveTeam, getActiveQuestionList, getAwayNames, getPresentParticipants, session, transient, MODE_EMOJI } from "./state.js";
import { DOM } from "./domCache.js";
import { waitGsap } from "./config.js";
import { getDuration } from "./suspense.js";
import * as Timer from "./timer.js";
import { addProgressCard, renderHistory, updateUI } from "./render.js";
import { applyIdleClasses } from "./session.js";
import { resetTagClasses, runWakeUp, runSuspenseAnimation, runReveal } from "./pickAnimations.js";
import { startTheatre, stopTheatre } from "./theatre.js";
import { rpShuffled } from "./pickerUtils.js";
import { celebrate } from "./confetti.js";

import { waitForNextQuestion } from "./questionFlow.js";
export { handleHotSeatNextQuestion } from "./questionFlow.js";

export function showQuestionCard(qList, index, total, personName) {
  if (!DOM.hotseatCard) return;
  DOM.cloudContainer.classList.add("dimmed");
  DOM.hotseatCard.style.display = "";
  if (DOM.hotseatCardName) DOM.hotseatCardName.textContent = personName ? personName + "\u2019s Hot Seat" : "";
  DOM.hotseatCardCounter.textContent = "Q" + (index + 1) + " of " + total;
  DOM.hotseatCardQuestion.textContent = qList.questions[index] || "?";
}

export function hideQuestionCard() {
  if (DOM.hotseatCard) DOM.hotseatCard.style.display = "none";
  if (DOM.cloudContainer) DOM.cloudContainer.classList.remove("dimmed");
}

export async function runHotSeatRound() {
  const team = getActiveTeam();
  const participants = getPresentParticipants(team);
  const qList = getActiveQuestionList();
  if (!qList || qList.questions.length === 0) return;

  transient.isPicking = true;
  const gen = transient.sessionGen;
  if (!session.startedAt) session.startedAt = Date.now();

  // Determine eligible people
  const usedNames = new Set(session.usedPeople);
  let eligible = participants.filter(p => !usedNames.has(p.name));
  if (eligible.length === 0) {
    transient.isPicking = false;
    updateUI();
    return;
  }

  // Phase 1: Pick a person
  updateUI();

  const duration = getDuration("hotseat", 0);
  const selectedNames = new Set([...session.usedPeople, ...getAwayNames(team)]);
  resetTagClasses(selectedNames);
  await waitGsap(0.4);
  if (gen !== transient.sessionGen) return;

  let winner;

  if (eligible.length <= 1) {
    winner = eligible[0];
  } else {
    await runWakeUp();
    if (gen !== transient.sessionGen) return;
    const result = await runSuspenseAnimation(duration, selectedNames);
    if (!result || gen !== transient.sessionGen) return; // cancelled
    winner = eligible.find(p => p.name === result.name) || { name: result.name, chances: result.chances };
  }

  const winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
  let progressCard = null;
  await runReveal(winner, winnerMeta, () => {
    if (gen !== transient.sessionGen) return;
    transient.currentWinner = winner.name;
    DOM.sidebarCurrentName.textContent = winner.name + " is in the Hot Seat!";
    progressCard = addProgressCard(winner.name);
    celebrate({ emoji: MODE_EMOJI.hotseat, kicker: "Take the Hot Seat!", name: winner.name, sub: "Rapid-fire questions incoming", tone: "var(--rose)" });
    updateUI();
  });
  if (gen !== transient.sessionGen) return;

  transient.isPicking = false;
  session.hotSeatPerson = winner.name;
  session.hotSeatRound++;
  session.usedPeople.push(winner.name);

  // Dramatic pause
  await waitGsap(2);
  if (gen !== transient.sessionGen) return;

  // Phase 2: Rapid-fire questions
  stopTheatre();
  const questionsPerPerson = Math.min(
    qList.settings.questionsPerPerson || 5,
    qList.questions.length
  );
  const timerSec = qList.settings.questionTimerSec || 15;
  let questionsAnswered = 0;
  let questionsSkipped = 0;

  // Shuffle questions for variety
  const shuffled = rpShuffled(qList.questions);

  for (let qi = 0; qi < questionsPerPerson; qi++) {
    if (gen !== transient.sessionGen) return;

    session.hotSeatQuestionIndex = qi;
    showQuestionCard({ questions: shuffled }, qi, questionsPerPerson, winner.name);

    // Update turn bar
    if (DOM.turnCounter) {
      DOM.turnCounter.textContent = winner.name + "'s Hot Seat";
      DOM.turnCounter.style.display = "";
    }
    DOM.sidebarCurrentName.textContent = "Q" + (qi + 1) + " of " + questionsPerPerson;
    DOM.turnBar.classList.add("visible");
    DOM.turnBar.inert = false;

    // Start per-question timer
    transient.timerRemaining = timerSec;
    Timer.start(timerSec, { autoAdvance: true });
    updateUI();

    // Wait for user action or timer
    const skipped = await waitForNextQuestion();
    if (gen !== transient.sessionGen || skipped === null) return;
    Timer.stop();

    session.hotSeatAnswers.push({
      question: shuffled[qi],
      skipped: !!skipped
    });

    if (skipped) questionsSkipped++;
    else questionsAnswered++;
  }

  hideQuestionCard();

  // Phase 3: Round end
  session.selectionHistory.push({
    name: winner.name,
    chances: winner.chances || 1,
    mode: "hotseat",
    timestamp: Date.now(),
    questionsAnswered,
    questionsSkipped
  });

  progressCard?.classList.replace("current", "done"); // round over
  renderHistory();
  applyIdleClasses();
  startTheatre();

  transient.currentWinner = winner.name;
  DOM.sidebarCurrentName.textContent = winner.name + " survived the Hot Seat!";
  celebrate({ emoji: "😅", kicker: "Survived the Hot Seat!", name: winner.name, sub: questionsAnswered + " answered" + (questionsSkipped ? ", " + questionsSkipped + " dodged" : ""), tone: "var(--rose)", burst: ["🔥", "😅", "🎉"] });
  updateUI();
}
