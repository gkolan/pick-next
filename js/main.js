/**
 * main.js: Application entry point
 *
 * Wires Timer -> Pick cycle callback, initializes state, and starts the app.
 */

import { gsap } from "gsap";
import { getActiveTeam, transient, session, initState, getData, persistData } from "./state.js";
import { cacheDom, DOM } from "./domCache.js";
import { setOnAutoExpire, setOnStop } from "./timer.js";
import { renderAll, renderCloud, updateUI } from "./render.js";
import { beginPickCycle, recordSpeakerTime } from "./pick.js";
import { bindEvents } from "./mainEvents.js";
import { handleHotSeatNextQuestion } from "./questionFlow.js";
import { showWelcome } from "./welcome.js";
import { initPromptDialog } from "./promptDialog.js";
import { initThemeToggle } from "./theme.js";
import { initSoundToggle } from "./sound.js";
import { teamFromHash } from "./teamLink.js";
import { addSharedTeam } from "./teams.js";

// ─── Wire Timer -> Pick cycle ───────────────────────────────────────
// A Hot Seat question's timer runs inside the locked round: move to the next question
setOnAutoExpire(() => getActiveTeam().settings.mode === "hotseat"
  ? handleHotSeatNextQuestion(true)
  : beginPickCycle("auto-timer"));
setOnStop(recordSpeakerTime);

// ─── Debug handle (dev server only; stripped from production builds) ─
if (import.meta.env?.DEV) {
  window.__picknext = { gsap, getActiveTeam, getData, session, transient, renderAll, renderCloud, updateUI };
}

// ─── Init ───────────────────────────────────────────────────────────

export function migrateSocialToIcebreaker() {
  const data = getData();
  if (!data || !data.teams) return;
  let migrated = false;
  for (const team of Object.values(data.teams)) {
    if (team.settings && team.settings.mode === "social") {
      team.settings.mode = "icebreaker";
      migrated = true;
    }
  }
  if (migrated) persistData();
}

export function init() {
  initState();
  migrateSocialToIcebreaker();
  cacheDom();
  bindEvents();
  initPromptDialog();
  initThemeToggle(document.getElementById("theme-btn"));
  initSoundToggle(document.getElementById("sound-btn"));
  transient.timerRemaining = getActiveTeam().settings.timerDurationSec;

  // Hide the cloud while the welcome overlay shows first
  DOM.cloudContainer.style.display = "none";

  renderAll();

  // Stagger-in UI elements on load
  gsap.from(".app-header", { y: -15, opacity: 0, duration: 0.6, ease: "expo.out" });
  gsap.from(".mode-switcher", { y: 10, opacity: 0, duration: 0.6, delay: 0.1, ease: "expo.out" });

  // Always show welcome overlay (Screen 1 for first run, Screen 2 for returning)
  showWelcome();

  // Shared team link (#team=...): offer to add it, then drop the hash either way
  const shared = teamFromHash(location.hash);
  if (location.hash.startsWith("#team=")) history.replaceState(null, "", location.pathname + location.search);
  if (shared) addSharedTeam(shared).then(added => { if (added) showWelcome(); });
}

document.addEventListener("DOMContentLoaded", init);
