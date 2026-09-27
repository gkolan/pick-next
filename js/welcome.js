/**
 * welcome.js: Start-of-visit setup modal
 *
 * One card: mode tabs, the team (the demo crew with its rotating one-liner, or your
 * own), a summary line and Continue, which lands on the Start screen.
 */

import { gsap } from "gsap";
import { getActiveTeam, getData, persistData, MODE_LABELS } from "./state.js";
import { createTeam, switchTeam, uniqueTeamName } from "./teams.js";
import { renderAll } from "./render.js";
import { DOM } from "./domCache.js";
import { DEMO_TEAM, demoParticipants } from "./demoData.js";
import { countRepeatedNames, parseNames } from "./teamLink.js";
import * as Timer from "./timer.js";
import { TIMER_DEFAULT, MODE_DEFAULTS } from "./config.js";
import { rpShuffled } from "./pickerUtils.js";

const MODES = ["standup", "raffle", "icebreaker", "hotseat"];
const MIN_PEOPLE = 2;

let quipTimer = null;
let quipOrder = []; // legends in a random order, reshuffled each time the modal opens
let quipPos = 0;

export function showWelcome({ ownTeam = false } = {}) {
  const overlay = document.getElementById("welcome-overlay");
  if (!overlay) return;

  const currentTeam = getActiveTeam();
  let selectedMode = currentTeam ? currentTeam.settings.mode : "standup";
  let teamName = "";
  let namesText = "";
  let error = "";

  const data = getData();
  const isDemoName = (name) => name === DEMO_TEAM.name;
  // "My Team" lists the user's own saved teams, plus "new" to type one in.
  const ownTeams = Object.entries(data.teams).filter(([, t]) => !isDemoName(t.name) && t.participants.length > 0);

  let useDemoData = !ownTeam && (!currentTeam || isDemoName(currentTeam.name) || ownTeams.length === 0);
  let selectedOwnTeam = ownTeams.some(([id]) => id === data.activeTeamId) ? data.activeTeamId : (ownTeams[0]?.[0] || "new");

  function getParticipantCount() {
    if (useDemoData) return DEMO_TEAM.size;
    if (selectedOwnTeam !== "new") return data.teams[selectedOwnTeam]?.participants.length || 0;
    return parseNames(namesText).length;
  }

  function buildChips() {
    const pCount = getParticipantCount();
    const chips = [];
    if (pCount > 0 && !useDemoData) {
      chips.push(pCount + ' participant' + (pCount !== 1 ? 's' : ''));
    }
    const repeats = !useDemoData && selectedOwnTeam === "new" ? countRepeatedNames(namesText) : 0;
    if (repeats) chips.push(repeats + ' repeated name' + (repeats !== 1 ? 's' : '') + ' skipped');
    const timerSec = useDemoData ? DEMO_TEAM.timerSec
      : data.teams[selectedOwnTeam]?.settings.timerDurationSec || TIMER_DEFAULT;
    if (selectedMode === "standup") {
      chips.push(timerSec + 's per speaker');
      if (MODE_DEFAULTS.standup.autoAdvance) chips.push('auto-advance');
    } else if (selectedMode === "raffle") {
      const prizes = Math.min(MODE_DEFAULTS.raffle.prizeCount, Math.max(1, pCount - 1)) || 3;
      chips.push(prizes + ' prize' + (prizes !== 1 ? 's' : ''));
    } else if (selectedMode === "icebreaker") {
      chips.push(timerSec + 's per round');
    } else if (selectedMode === "hotseat") {
      chips.push('5Q × 15s each');
    }
    return '<p class="welcome-meta" id="welcome-chips">' + chips.join(' · ') + '</p>';
  }

  function buildTeamLink() {
    return useDemoData
      ? '<button class="welcome-link" data-demo="false">Use my own team →</button>'
      : '<button class="welcome-link" data-demo="true">← Back to the demo crew</button>';
  }

  function buildTeamSection() {
    if (useDemoData) return '';
    const picker = ownTeams.length === 0 ? '' :
      '<label class="welcome-field-label" for="welcome-own-team-select">Your team</label>' +
      '<select class="welcome-team-select" id="welcome-own-team-select">' +
        ownTeams.map(([id, t]) =>
          '<option value="' + id + '"' + (id === selectedOwnTeam ? ' selected' : '') + '>' +
          escapeAttr(t.name) + ' (' + t.participants.length + ')</option>'
        ).join('') +
        '<option value="new"' + (selectedOwnTeam === "new" ? ' selected' : '') + '>+ New team…</option>' +
      '</select>';
    if (selectedOwnTeam !== "new") return picker;
    return picker +
      '<label class="welcome-field-label' + (picker ? ' welcome-field-gap' : '') + '" for="welcome-team-input">Team name</label>' +
      '<input class="welcome-input" type="text" id="welcome-team-input" value="' + escapeAttr(teamName) + '" placeholder="e.g. Engineering, Design, All Hands" maxlength="40">' +
      '<label class="welcome-field-label welcome-field-gap" for="welcome-names-input">Names <span class="welcome-field-hint">one per line or comma-separated</span></label>' +
      '<textarea class="welcome-input welcome-names" id="welcome-names-input" rows="4" placeholder="Ada, Grace, Linus">' + escapeAttr(namesText) + '</textarea>';
  }

  function buildModeTabs() {
    return '<div class="welcome-mode-tabs">' +
      MODES.map(mode => {
        const active = mode === selectedMode ? ' active' : '';
        return '<button class="welcome-mode-tab' + active + '" data-mode="' + mode + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
          (MODE_LABELS[mode] || mode) +
        '</button>';
      }).join('') +
    '</div>';
  }

  function buildCard() {
    const modeName = MODE_LABELS[selectedMode] || "Session";
    const title = useDemoData ? modeName + ' with ' + escapeAttr(DEMO_TEAM.name) : modeName;
    const subtitle = useDemoData
      ? DEMO_TEAM.size + ' legends, one ' + modeName.toLowerCase() + '. ' +
        '<span id="welcome-quip" class="welcome-quip">' + escapeAttr(currentQuip()) + '</span>'
      : 'Name your team to get started';

    return '<div class="welcome-card welcome-card-setup">' +
      '<div class="idle-mode-name">' + title + '</div>' +
      buildModeTabs() +
      '<p class="welcome-subtitle">' + subtitle + '</p>' +
      (useDemoData ? '' : '<div class="welcome-team-section">' + buildTeamSection() + '</div>') +
      buildChips() +
      '<p class="welcome-error" id="welcome-error" role="alert">' + escapeAttr(error) + '</p>' +
      '<div class="welcome-nav">' +
        '<button class="welcome-btn" data-action="start">' +
          'Continue →' + // next: mark who's out, then the real Start
        '</button>' +
      '</div>' +
      buildTeamLink() +
    '</div>';
  }

  function render() {
    overlay.innerHTML = buildCard();
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Events ──

  // Handlers are assigned (not added) so showWelcome() can safely run again.
  overlay.onchange = (e) => {
    if (e.target.id === "welcome-own-team-select") {
      selectedOwnTeam = e.target.value;
      error = "";
      render();
      if (selectedOwnTeam === "new") document.getElementById("welcome-team-input")?.focus();
    }
  };

  // Typing updates the chips in place; a full re-render would steal focus.
  overlay.oninput = (e) => {
    if (e.target.id === "welcome-team-input") teamName = e.target.value;
    else if (e.target.id === "welcome-names-input") namesText = e.target.value;
    else return;
    error = "";
    document.getElementById("welcome-error").textContent = "";
    document.getElementById("welcome-chips").outerHTML = buildChips();
  };

  function showError(msg) {
    error = msg;
    document.getElementById("welcome-error").textContent = msg;
    const card = overlay.querySelector(".welcome-card");
    if (card) gsap.fromTo(card, { x: -8 }, { x: 0, duration: 0.4, ease: "elastic.out(1.5, 0.3)" });
  }

  overlay.onclick = (e) => {
    // Demo crew <-> my own team
    const switchBtn = e.target.closest("[data-demo]");
    if (switchBtn) {
      useDemoData = switchBtn.dataset.demo === "true";
      error = "";
      render();
      if (!useDemoData && selectedOwnTeam === "new") document.getElementById("welcome-team-input")?.focus();
      return;
    }

    const modeTab = e.target.closest(".welcome-mode-tab");
    if (modeTab && modeTab.dataset.mode) {
      const oldQuip = currentQuip();
      selectedMode = modeTab.dataset.mode;
      render();
      // Keep the old line up, then fade it out and the new mode's line in
      const el = document.getElementById("welcome-quip");
      if (el) { el.textContent = oldQuip; swapQuip(el); startQuipTimer(); }
      return;
    }

    if (e.target.closest('[data-action="start"]')) completeWelcome();
  };

  overlay.onkeydown = (e) => {
    // Enter in the team name moves on to the names box; textareas keep their newlines.
    if (e.key !== "Enter" || e.target.closest("button, textarea")) return;
    e.preventDefault();
    if (e.target.id === "welcome-team-input") document.getElementById("welcome-names-input")?.focus();
    else completeWelcome();
  };

  // ── Complete ──

  async function completeWelcome() {
    if (getParticipantCount() < MIN_PEOPLE) {
      showError(!useDemoData && selectedOwnTeam === "new"
        ? "Add at least " + MIN_PEOPLE + " names to get going."
        : "This team needs at least " + MIN_PEOPLE + " people. Edit it after starting, or pick another.");
      return;
    }

    let teamId;
    if (useDemoData) {
      teamId = Object.keys(data.teams).find(id => data.teams[id].name === DEMO_TEAM.name);
      if (!teamId) { // saved data from before this crew existed
        teamId = createTeam(uniqueTeamName(DEMO_TEAM.name));
        if (teamId) {
          data.teams[teamId].participants = demoParticipants();
          data.teams[teamId].settings.timerDurationSec = DEMO_TEAM.timerSec;
        }
      }
    } else if (selectedOwnTeam !== "new") {
      teamId = selectedOwnTeam;
    } else {
      teamId = createTeam(uniqueTeamName(teamName.trim() || "My Team"));
      if (teamId) data.teams[teamId].participants = parseNames(namesText).map(name => ({ name, chances: 1, timerSec: null }));
    }
    if (!teamId) {
      showError("You have too many saved teams. Delete one in Settings first.");
      return;
    }

    await switchTeam(teamId);
    data.teams[teamId].settings.mode = selectedMode;
    persistData();

    clearInterval(quipTimer);
    overlay.style.display = "none";
    overlay.innerHTML = "";
    if (DOM.cloudContainer) { DOM.cloudContainer.style.display = ""; DOM.cloudContainer.style.opacity = ""; }
    renderAll();
    Timer.stop();
    // Land on the idle screen first so the host can mark who's out today, then press Start
  }

  // ── Demo quips: cycle the one-liner under the title, in a random order ──
  function currentQuip() { return DEMO_TEAM.quips[selectedMode][quipOrder[quipPos]]; }

  function swapQuip(el) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = currentQuip();
      return;
    }
    // Drift up and out, swap while invisible (so the width change never shows), settle back in.
    gsap.killTweensOf(el);
    gsap.timeline()
      .to(el, { opacity: 0, y: -8, scale: 0.97, duration: 0.5, ease: "power2.in" })
      .call(() => { el.textContent = currentQuip(); })
      .fromTo(el, { y: 10, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }, "+=0.15");
  }

  function startQuipTimer() {
    clearInterval(quipTimer); // showWelcome() can run again (logo click)
    quipTimer = setInterval(() => {
      quipPos = (quipPos + 1) % quipOrder.length;
      const el = document.getElementById("welcome-quip");
      if (el) swapQuip(el);
    }, 4500);
  }

  quipOrder = rpShuffled([...Array(DEMO_TEAM.size).keys()]);
  quipPos = 0;
  startQuipTimer();

  // ── Init ──
  overlay.style.display = "";
  overlay.style.opacity = "";
  render();

  gsap.from(overlay.querySelector(".welcome-card"), {
    y: 30, opacity: 0, duration: 0.6, delay: 0.15, ease: "expo.out"
  });
}
