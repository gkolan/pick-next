/**
 * mainEvents.js: Pick, settings, and menu event bindings
 *
 * Binds pick buttons, settings toggles, and sidebar action menus.
 * Dialog/import/export and mobile events are in eventsDialog.js.
 */

import { getData, getActiveTeam, getActiveTopicList, getActiveQuestionList, getAwayNames, toggleAway, session, transient, persistData } from "./state.js";
import { DOM } from "./domCache.js";
import { TIMER_MIN, TIMER_MAX, TIMER_DEFAULT } from "./config.js";
import * as Timer from "./timer.js";
import { renderCloud, renderTopicListDropdown, renderQuestionListDropdown, updateUI } from "./render.js";
import { beginPickCycle, isPickBusy } from "./pick.js";
import { endSession, showRecapEarly } from "./session.js";
import { openEditor } from "./editor.js";
import { openTopicEditor } from "./topicEditor.js";
import { openQuestionEditor } from "./questionEditor.js";
import { createTeam, switchTeam, deleteTeam } from "./teams.js";
import { createTopicList, switchTopicList, createQuestionList, switchQuestionList } from "./topics.js";
import { bindDialogEvents, bindMobileEvents, showToast, closeSidebar } from "./eventsDialog.js";
import { handleHotSeatNextQuestion } from "./pickHotSeat.js";
import { appPrompt, appConfirm } from "./promptDialog.js";
import { encodeTeam } from "./teamLink.js";
import { showWelcome } from "./welcome.js";

// ─── Shared Menu Helpers ────────────────────────────────────────────

export async function promptCreateTeam(afterFn) {
  const name = await appPrompt("Create New Team", { placeholder: "Team name", confirmLabel: "Create" });
  if (name) {
    const id = createTeam(name);
    if (id) { if (afterFn) afterFn(); switchTeam(id); showToast("Team created"); }
    else { showToast("Could not create team. Name may already exist or limit reached.", 3000, "error"); }
  }
}

export async function promptCreateTopicList(afterFn) {
  const name = await appPrompt("Create Topic List", { placeholder: "List name", confirmLabel: "Create" });
  if (name) {
    const id = createTopicList(name);
    if (id) { if (afterFn) afterFn(); switchTopicList(id); renderTopicListDropdown(); updateUI(); showToast("Topic list created"); }
    else { showToast("Could not create list. Name may already exist or limit reached.", 3000, "error"); }
  }
}

export async function promptCreateQuestionList(afterFn) {
  const name = await appPrompt("Create Question List", { placeholder: "List name", confirmLabel: "Create" });
  if (name) {
    const id = createQuestionList(name);
    if (id) { if (afterFn) afterFn(); switchQuestionList(id); renderQuestionListDropdown(); updateUI(); showToast("Question list created"); }
    else { showToast("Could not create list. Name may already exist or limit reached.", 3000, "error"); }
  }
}

// ─── Presenter Mode (with Fullscreen API) ──────────────────────────

export function enterPresenterMode() {
  const app = document.getElementById("app");
  app.classList.add("presenter-mode");
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) {
    req.call(el).catch(err => console.warn("Fullscreen request failed:", err));
  }
}

export function exitPresenterMode() {
  const app = document.getElementById("app");
  app.classList.remove("presenter-mode");
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) exit.call(document).catch(() => {});
  }
}

export function togglePresenterMode() {
  const app = document.getElementById("app");
  if (app.classList.contains("presenter-mode")) exitPresenterMode();
  else enterPresenterMode();
}

// ─── Event Bindings ─────────────────────────────────────────────────

// Keep the speaker's name on one line: shrink long names ("Swami Vivekananda") to the column.
// Runs on every text change, whoever writes it (pick, raffle, hot seat), and on resize.
function fitSpeakerName() {
  const el = DOM.sidebarCurrentName;
  el.style.fontSize = ""; // back to the CSS size, then scale down only if it overflows
  if (!el.clientWidth || el.scrollWidth <= el.clientWidth) return;
  const px = parseFloat(getComputedStyle(el).fontSize) * el.clientWidth / el.scrollWidth;
  el.style.fontSize = Math.max(16, Math.floor(px)) + "px"; // below 16px the ellipsis takes over
}

export function bindEvents() {
  new MutationObserver(fitSpeakerName).observe(DOM.sidebarCurrentName, { childList: true, characterData: true, subtree: true });
  // Column width changes (resize, timer/buttons appearing): refit next frame to avoid a resize loop
  let nameColW = 0;
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === nameColW) return;
    nameColW = entry.contentRect.width;
    requestAnimationFrame(fitSpeakerName);
  }).observe(DOM.sidebarCurrentName.parentElement);

  // "Out today": while idle, tap a name (or Enter/Space on it) to toggle it
  const toggleAwayTag = (tag) => {
    toggleAway(tag.dataset.name);
    const isAway = getAwayNames().has(tag.dataset.name);
    renderCloud();
    updateUI();
    DOM.cloudContainer.querySelector('.name-tag[data-name="' + CSS.escape(tag.dataset.name) + '"]')?.focus();
    showToast(tag.dataset.name + (isAway ? " is out today" : " is back"));
  };
  DOM.cloudContainer.addEventListener("click", (e) => {
    const tag = e.target.closest(".name-tag[role=button]");
    if (tag) toggleAwayTag(tag);
  });
  DOM.cloudContainer.addEventListener("keydown", (e) => {
    const tag = e.target.closest(".name-tag[role=button]");
    if (!tag || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    e.stopPropagation(); // Space on a name toggles it instead of starting
    toggleAwayTag(tag);
  });

  DOM.shareTeamBtn.addEventListener("click", () => {
    const url = location.origin + location.pathname + "#team=" + encodeTeam(getActiveTeam());
    navigator.clipboard.writeText(url)
      .then(() => showToast("Team link copied"), () => showToast("Couldn't copy link", 2000, "error"));
  });

  DOM.startBtn.addEventListener("click", () => {
    if (!isPickBusy()) beginPickCycle("manual");
  });
  DOM.pickNextBtn.addEventListener("click", () => {
    if (!isPickBusy()) beginPickCycle("manual");
  });
  DOM.pauseBtn.addEventListener("click", () => {
    if (transient.isTimerRunning && !transient.isPicking) { Timer.togglePause(); updateUI(); }
  });
  DOM.endSessionBtn.addEventListener("click", endSession);
  // Exit: mid-session it ends and shows the recap; from the recap (or before any pick) it leaves
  DOM.exitBtn.addEventListener("click", e => {
    if (e.currentTarget.dataset.recap === "true") showRecapEarly(); else endSession();
  });
  document.getElementById("home-btn").addEventListener("click", () => { endSession(); showWelcome(); });
  document.getElementById("exit-demo-btn").addEventListener("click", () => { endSession(); showWelcome({ ownTeam: true }); });
  // Progress / Winners lanes: collapsed shows the latest one; +/− shows everyone
  for (const [btnId, lane] of [["progress-lane-toggle", DOM.progressLane], ["winners-lane-toggle", DOM.winnersLane]]) {
    document.getElementById(btnId).addEventListener("click", e => {
      const open = !lane.classList.toggle("collapsed");
      e.currentTarget.textContent = open ? "−" : "+";
      e.currentTarget.title = open ? "Show latest only" : "Show all";
      e.currentTarget.setAttribute("aria-expanded", open);
    });
  }
  // Delete Team (Issues 8+9)
  if (DOM.deleteTeamBtn) {
    DOM.deleteTeamBtn.addEventListener("click", async () => {
      const team = getActiveTeam();
      const ok = await appConfirm(
        "Delete \u2018" + team.name + "\u2019?",
        "This team and all its participants will be permanently removed.",
        { confirmLabel: "Delete", danger: true }
      );
      if (!ok) return;
      if (deleteTeam(getData().activeTeamId)) {
        showToast("Team deleted");
      }
    });
  }

  // Skip button: mark the current person as skipped and move to the next
  if (DOM.skipBtn) {
    DOM.skipBtn.addEventListener("click", () => {
      if (!transient.currentWinner || isPickBusy()) return;
      // Mark current entry as skipped
      const lastEntry = session.selectionHistory[session.selectionHistory.length - 1];
      if (lastEntry && lastEntry.name === transient.currentWinner) lastEntry.skipped = true;
      // Mark progress lane card as skipped
      if (DOM.progressLaneList) {
        const cur = DOM.progressLaneList.querySelector(".progress-lane-card.current");
        if (cur) { cur.classList.remove("current"); cur.classList.add("skipped"); }
      }
      Timer.stop();
      beginPickCycle("manual");
    });
  }

  // Recap buttons
  if (DOM.recapAgainBtn) {
    DOM.recapAgainBtn.addEventListener("click", () => { endSession(); beginPickCycle("manual"); });
  }
  if (DOM.recapCloseBtn) {
    DOM.recapCloseBtn.addEventListener("click", endSession);
  }

  DOM.teamSelect.addEventListener("change", () => switchTeam(DOM.teamSelect.value));
  DOM.icebreakerTopicListSelect.addEventListener("change", () => {
    switchTopicList(DOM.icebreakerTopicListSelect.value);
    renderTopicListDropdown(); updateUI();
  });

  // Presenter Mode toggle (with fullscreen)
  if (DOM.presenterModeBtn) {
    DOM.presenterModeBtn.addEventListener("click", () => {
      togglePresenterMode();
    });
  }

  // Sync presenter mode when user exits fullscreen via Escape
  document.addEventListener("fullscreenchange", () => {
    const app = document.getElementById("app");
    if (!document.fullscreenElement && app.classList.contains("presenter-mode")) {
      app.classList.remove("presenter-mode");
    }
  });
  document.addEventListener("webkitfullscreenchange", () => {
    const app = document.getElementById("app");
    if (!document.webkitFullscreenElement && app.classList.contains("presenter-mode")) {
      app.classList.remove("presenter-mode");
    }
  });

  bindSettingsEvents();
  bindMenuEvents();
  bindDialogEvents();
  bindMobileEvents();
}

export function bindSettingsEvents() {
  DOM.timerModeBtn.addEventListener("click", () => {
    const s = getActiveTeam().settings;
    s.autoAdvance = !s.autoAdvance;
    persistData(); updateUI();
  });
  DOM.orderModeBtn.addEventListener("click", () => {
    const s = getActiveTeam().settings;
    s.randomOrder = !s.randomOrder;
    persistData(); updateUI();
  });

  function bindTimerInput(inputEl) {
    inputEl.addEventListener("input", () => { inputEl.value = inputEl.value.replace(/[^0-9]/g, ""); });
    inputEl.addEventListener("change", () => {
      const raw = parseInt(inputEl.value, 10);
      const val = isNaN(raw) ? TIMER_DEFAULT : Math.max(TIMER_MIN, Math.min(TIMER_MAX, raw));
      getActiveTeam().settings.timerDurationSec = val;
      inputEl.value = val;
      persistData();
      if (!transient.isTimerRunning) { transient.timerRemaining = val; Timer.updateDisplay(); }
    });
  }
  bindTimerInput(DOM.timerInput);
  bindTimerInput(DOM.icebreakerTimerInput);

  DOM.prizeCountInput.addEventListener("input", () => {
    DOM.prizeCountInput.value = DOM.prizeCountInput.value.replace(/[^0-9]/g, "");
  });
  DOM.prizeCountInput.addEventListener("change", () => {
    const raw = parseInt(DOM.prizeCountInput.value, 10);
    const max = Math.max(1, getActiveTeam().participants.length - 1);
    const val = isNaN(raw) ? 3 : Math.max(1, Math.min(max, raw));
    getActiveTeam().settings.raffle.prizeCount = val;
    DOM.prizeCountInput.value = val;
    persistData();
  });

  DOM.topicRotationBtn.addEventListener("click", () => {
    const tl = getActiveTopicList();
    if (!tl) return;
    const ts = tl.settings;
    ts.topicRotation = ts.topicRotation === "new-topic-new-person" ? "same-topic-new-person" : "new-topic-new-person";
    persistData(); updateUI();
  });

  function bindTopicToggle(btn, key) {
    btn.addEventListener("click", () => {
      const tl = getActiveTopicList();
      if (!tl) return;
      tl.settings[key] = !tl.settings[key];
      persistData(); updateUI();
    });
  }
  bindTopicToggle(DOM.repeatPeopleBtn, "allowRepeatPeople");
  bindTopicToggle(DOM.repeatTopicsBtn, "allowRepeatTopics");

  DOM.modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (transient.isPicking) return;
      const mode = btn.dataset.mode;
      const s = getActiveTeam().settings;
      const prev = s.mode;
      s.mode = mode;
      if (mode !== prev && mode !== "raffle") session.raffleRound = 0;
      // Update roving tabindex for radio pattern
      DOM.modeBtns.forEach(b => b.setAttribute("tabindex", b === btn ? "0" : "-1"));
      persistData(); updateUI();
    });
  });

  // Hot Seat settings
  if (DOM.hotseatQuestionListSelect) {
    DOM.hotseatQuestionListSelect.addEventListener("change", () => {
      switchQuestionList(DOM.hotseatQuestionListSelect.value);
      updateUI();
    });
  }
  if (DOM.hotseatQuestionsPerPerson) {
    DOM.hotseatQuestionsPerPerson.addEventListener("change", () => {
      const raw = parseInt(DOM.hotseatQuestionsPerPerson.value, 10);
      const val = isNaN(raw) ? 5 : Math.max(1, Math.min(20, raw));
      DOM.hotseatQuestionsPerPerson.value = val;
      const qList = getActiveQuestionList();
      if (qList) qList.settings.questionsPerPerson = val;
      persistData();
    });
  }
  if (DOM.hotseatTimerInput) {
    DOM.hotseatTimerInput.addEventListener("change", () => {
      const raw = parseInt(DOM.hotseatTimerInput.value, 10);
      const val = isNaN(raw) ? 15 : Math.max(5, Math.min(120, raw));
      DOM.hotseatTimerInput.value = val;
      const qList = getActiveQuestionList();
      if (qList) qList.settings.questionTimerSec = val;
      persistData();
    });
  }

  // Hot Seat question buttons
  if (DOM.hotseatNextQBtn) {
    DOM.hotseatNextQBtn.addEventListener("click", () => handleHotSeatNextQuestion(false));
  }
  if (DOM.hotseatSkipBtn) {
    DOM.hotseatSkipBtn.addEventListener("click", () => handleHotSeatNextQuestion(true));
  }

  // Arrow-key navigation for radiogroup (WAI-ARIA radio pattern)
  const modeSwitcher = DOM.modeBtns[0]?.parentElement;
  if (modeSwitcher) {
    modeSwitcher.addEventListener("keydown", (e) => {
      if (transient.isPicking) return;
      const btns = [...DOM.modeBtns];
      const idx = btns.indexOf(document.activeElement);
      if (idx === -1) return;
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % btns.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + btns.length) % btns.length;
      if (next !== -1) {
        e.preventDefault();
        btns[next].focus();
        btns[next].click();
      }
    });
  }
}

export function bindMenuEvents() {
  function closeAllMenus() { DOM.editMenu.style.display = "none"; DOM.newMenu.style.display = "none"; }
  function closeAllMobileMenus() { DOM.mobileEditMenu.style.display = "none"; DOM.mobileNewMenu.style.display = "none"; }

  DOM.editBtn.addEventListener("click", () => {
    if (getActiveTeam().settings.mode === "icebreaker" || getActiveTeam().settings.mode === "hotseat") {
      const open = DOM.editMenu.style.display !== "none";
      closeAllMenus(); DOM.editMenu.style.display = open ? "none" : "";
    } else { closeAllMenus(); openEditor(); }
  });
  DOM.newTeamBtn.addEventListener("click", () => {
    if (getActiveTeam().settings.mode === "icebreaker" || getActiveTeam().settings.mode === "hotseat") {
      const open = DOM.newMenu.style.display !== "none";
      closeAllMenus(); DOM.newMenu.style.display = open ? "none" : "";
    } else { closeAllMenus(); promptCreateTeam(); }
  });
  DOM.editTeamMenuBtn.addEventListener("click", () => { closeAllMenus(); openEditor(); });
  DOM.startSettings.addEventListener("click", openEditor);
  DOM.editTopicsMenuBtn.addEventListener("click", () => {
    closeAllMenus();
    if (getActiveTeam().settings.mode === "hotseat") openQuestionEditor();
    else openTopicEditor();
  });
  DOM.newTeamMenuBtn.addEventListener("click", () => { closeAllMenus(); promptCreateTeam(); });
  DOM.newTopicsMenuBtn.addEventListener("click", () => {
    closeAllMenus();
    if (getActiveTeam().settings.mode === "hotseat") promptCreateQuestionList();
    else promptCreateTopicList();
  });

  DOM.mobileEditBtn.addEventListener("click", () => {
    if (getActiveTeam().settings.mode === "icebreaker" || getActiveTeam().settings.mode === "hotseat") {
      const open = DOM.mobileEditMenu.style.display !== "none";
      closeAllMobileMenus(); DOM.mobileEditMenu.style.display = open ? "none" : "";
    } else { closeAllMobileMenus(); closeSidebar(); openEditor(); }
  });
  DOM.mobileNewBtn.addEventListener("click", () => {
    if (getActiveTeam().settings.mode === "icebreaker" || getActiveTeam().settings.mode === "hotseat") {
      const open = DOM.mobileNewMenu.style.display !== "none";
      closeAllMobileMenus(); DOM.mobileNewMenu.style.display = open ? "none" : "";
    } else { closeAllMobileMenus(); closeSidebar(); promptCreateTeam(closeSidebar); }
  });
  DOM.mobileEditTeamBtn.addEventListener("click", () => { closeAllMobileMenus(); closeSidebar(); openEditor(); });
  DOM.mobileEditTopicsBtn.addEventListener("click", () => {
    closeAllMobileMenus(); closeSidebar();
    if (getActiveTeam().settings.mode === "hotseat") openQuestionEditor();
    else openTopicEditor();
  });
  DOM.mobileNewTeamBtn.addEventListener("click", () => { closeAllMobileMenus(); closeSidebar(); promptCreateTeam(closeSidebar); });
  DOM.mobileNewTopicsBtn.addEventListener("click", () => {
    closeAllMobileMenus(); closeSidebar();
    if (getActiveTeam().settings.mode === "hotseat") promptCreateQuestionList(closeSidebar);
    else promptCreateTopicList(closeSidebar);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".sidebar-action-wrap")) { closeAllMenus(); closeAllMobileMenus(); }
  });
}
