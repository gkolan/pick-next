/**
 * pickRaffle.js: Raffle mode auto-loop
 *
 * Picks from last place to 1st with escalating suspense.
 * Each pick gets full suspense via runPicker which selects the winner.
 */

import { gsap } from "gsap";
import { getActiveTeam, getAwayNames, getPresentParticipants, session, transient, MODE_EMOJI } from "./state.js";
import { DOM } from "./domCache.js";
import { waitGsap, RAFFLE_INTER_PICK_PAUSE, RAFFLE_RECAP_DELAY, RAFFLE_WINNER_HOLD, formatOrdinal, formatPrize } from "./config.js";
import { getDuration } from "./suspense.js";
import * as Timer from "./timer.js";
import { renderHistory, updateUI } from "./render.js";
import { applyIdleClasses } from "./session.js";
import { decorateRaffleWinner } from "./renderCloud.js";
import { celebrate } from "./confetti.js";
import { resetTagClasses, runWakeUp, runSuspenseAnimation, runReveal } from "./pickAnimations.js";

export function getRafflePlaceText(place) {
  return formatOrdinal(place) + " Place!";
}

export async function runRaffleLoop() {
  const team = getActiveTeam();
  const settings = team.settings;
  const present = getPresentParticipants(team);
  const away = getAwayNames(team);
  const prizeCount = Math.min(settings.raffle.prizeCount, present.length - 1);
  if (prizeCount < 1) return;

  transient.isPicking = true;
  const gen = transient.sessionGen;

  if (!session.startedAt) session.startedAt = Date.now();

  // Winners lane: one empty slot per prize (Gold, Silver, Bronze, 4th…), filled as they're drawn
  if (DOM.winnersLane) {
    DOM.winnersLane.style.display = "";
    DOM.winnersLaneList.replaceChildren(...Array.from({ length: prizeCount }, (_, i) => {
      const place = i + 1;
      const card = document.createElement("div");
      card.className = "winners-lane-card empty" + (place === 1 ? " first" : place <= 3 ? " top3" : "");
      card.dataset.place = place;
      const badgeEl = document.createElement("span");
      badgeEl.className = "winners-lane-badge";
      badgeEl.textContent = formatPrize(place);
      const nameEl = document.createElement("span");
      nameEl.className = "winners-lane-name";
      nameEl.textContent = "—";
      card.append(badgeEl, nameEl);
      return card;
    }));
  }

  updateUI();

  let completed = false;
  try {
    for (let round = 0; round < prizeCount; round++) {
      if (gen !== transient.sessionGen) return;
      const place = prizeCount - round;
      const escalationRound = prizeCount - 1 - round;
      session.raffleRound = escalationRound;
      session.raffleCurrentPlace = place;
      DOM.winnersLaneList?.querySelectorAll(".winners-lane-card").forEach(c => c.classList.toggle("picking", Number(c.dataset.place) === place));
      updateUI();

      const selectedNames = new Set(session.selectionHistory.map(h => h.name));
      let eligible = present.filter(p => !selectedNames.has(p.name));
      for (const n of away) selectedNames.add(n); // out today never lands
      if (eligible.length === 0) break;

      const duration = getDuration("raffle", escalationRound);

      if (DOM.turnBar) DOM.turnBar.classList.remove("visible");
      Timer.stop();
      Timer.updateDisplay();

      DOM.turnBar.classList.add("visible");
      DOM.sidebarCurrentName.textContent = "Selecting " + formatOrdinal(place) + " Place\u2026";
      DOM.sidebarCurrentName.classList.remove("raffle-reveal");
      DOM.timerValue.parentElement.style.display = "none";

      resetTagClasses(selectedNames);
      await waitGsap(0.4);
      if (gen !== transient.sessionGen) return;

      let winner, winnerMeta;

      if (eligible.length <= 1) {
        winner = eligible[0];
        winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
      } else {
        await runWakeUp();
        if (gen !== transient.sessionGen) return;
        const result = await runSuspenseAnimation(duration, selectedNames);
        if (!result || gen !== transient.sessionGen) return; // cancelled
        winner = eligible.find(p => p.name === result.name) || { name: result.name, chances: result.chances };
        winnerMeta = transient.layoutMeta.find(m => m.name === winner.name);
      }

      const sidebarReveal = () => {
        if (gen !== transient.sessionGen) return;
        session.selectionHistory.push({
          name: winner.name, chances: winner.chances,
          mode: "raffle", timestamp: Date.now(), place
        });
        transient.currentWinner = winner.name;
        renderHistory();
        applyIdleClasses();

        if (winnerMeta && winnerMeta.el) {
          decorateRaffleWinner(winnerMeta.el, place);
          winnerMeta.el.classList.add("active-winner");
        }
        // A prize is a moment, not a standup turn: hold the card longer
        celebrate(place === 1
          ? { emoji: "🏆", kicker: "Grand prize winner!", name: winner.name, tone: "var(--sun)", big: true, burst: ["🏆", "🎉", "⭐", "🎟️"], hold: RAFFLE_WINNER_HOLD + 1.5 }
          : { emoji: place === 2 ? "🥈" : place === 3 ? "🥉" : MODE_EMOJI.raffle, kicker: getRafflePlaceText(place), name: winner.name, tone: place <= 3 ? "var(--peach)" : "var(--sky)", hold: RAFFLE_WINNER_HOLD });

        // Fill this prize's slot in the Winners lane
        const slot = DOM.winnersLaneList?.querySelector('.winners-lane-card[data-place="' + place + '"]');
        if (slot) {
          slot.classList.remove("empty", "picking");
          slot.querySelector(".winners-lane-name").textContent = winner.name;
        }

        const nameEl = DOM.sidebarCurrentName;
        const revealText = winner.name + " \u2014 " + getRafflePlaceText(place);
        gsap.timeline()
          .to(nameEl, { opacity: 0, y: -15, duration: 0.25, ease: "power2.in",
            onComplete() {
              nameEl.textContent = revealText;
              nameEl.classList.add("raffle-reveal");
            }
          })
          .fromTo(nameEl, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });

        updateUI();
      };

      await runReveal(winner, winnerMeta, sidebarReveal);
      if (gen !== transient.sessionGen) return;

      if (round < prizeCount - 1) {
        await waitGsap(RAFFLE_INTER_PICK_PAUSE);
        if (gen !== transient.sessionGen) return;
      }
    }
    completed = true;
  } finally {
    if (gen === transient.sessionGen) {
      transient.isPicking = false;
      session.raffleCurrentPlace = null;
      updateUI();

      transient.layoutMeta.forEach(m => {
        if (!m.el.classList.contains("raffle-winner")) {
          gsap.to(m.el, { scale: 0.85, opacity: 0.35, duration: 0.5, ease: "power2.out",
            onComplete() { gsap.set(m.el, { clearProps: "opacity,scale" }); }
          });
        }
      });
    }
  }

  // All prizes drawn: let the 1st-place moment land, then show the podium recap.
  if (completed && gen === transient.sessionGen) {
    await waitGsap(RAFFLE_RECAP_DELAY);
    if (gen === transient.sessionGen && !session.endedAt) {
      session.endedAt = Date.now();
      updateUI();
    }
  }
}
