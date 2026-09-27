/**
 * renderCloud.js: Cloud rendering (name tags and topic tags)
 *
 * Creates and positions DOM elements for the name cloud and topic cloud.
 * Manages the bar positioning above the cloud.
 */

import { getActiveTeam, getAwayNames, getSkipState, session, transient } from "./state.js";
import { DOM } from "./domCache.js";
import * as Layout from "./layout.js";

// ─── Name Cloud ─────────────────────────────────────────────────────

/** Style a tag as a raffle winner and give it its place badge (idempotent). */
export function decorateRaffleWinner(el, place) {
  el.classList.remove("idle", "raffle-idle", "previously-selected", "raffle-winner-1st", "raffle-winner-top3");
  el.classList.add("raffle-winner");
  if (place === 1) el.classList.add("raffle-winner-1st");
  else if (place <= 3) el.classList.add("raffle-winner-top3");
  let badge = el.querySelector(".raffle-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "raffle-badge";
    el.appendChild(badge);
  }
  badge.textContent = place;
}

export function renderCloud() {
  const container = DOM.cloudContainer;
  container.replaceChildren();
  const rect = container.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;

  if (cw < 50 || ch < 50) return;

  const team = getActiveTeam();
  const participants = team.participants;

  // Reserve space above the cloud for turn bar during active sessions
  const sessionActive = session.selectionHistory.length > 0 || transient.currentWinner || transient.isPicking;
  // Bar is anchored at top:12px; reserve its height + gap so names start below
  const barHeight = sessionActive ? (DOM.turnBar?.offsetHeight || 130) : 0;
  // Idle: leave room for the Start button (see .start-cta).
  const reserveTop = sessionActive ? barHeight + 32 : (DOM.startCta?.offsetHeight || 90) + 40;
  const layout = Layout.compute(participants, cw, ch, { reserveTop });
  transient.layoutMeta = [];

  const selectedNames = new Set(session.selectionHistory.map(h => h.name));
  const away = getAwayNames(team);
  const { waiting, returning } = getSkipState(team);
  const rafflePlaces = new Map(session.selectionHistory.filter(h => h.mode === "raffle" && h.place).map(h => [h.name, h.place]));
  const chances = participants.map(p => p.chances);
  const allSame = chances.length > 0 && chances.every(c => c === chances[0]);

  layout.forEach(item => {
    const el = document.createElement("div");
    el.className = "name-tag idle";
    el.setAttribute("data-chances", item.chances);
    el.setAttribute("data-name", item.name);
    el.title = item.name;

    const nameSpan = document.createElement("span");
    nameSpan.className = "name-text";
    nameSpan.textContent = item.name;
    el.appendChild(nameSpan);
    if (!allSame) {
      const dotsSpan = document.createElement("span");
      dotsSpan.className = "ticket-dots";
      for (let d = 0; d < item.chances; d++) {
        const dot = document.createElement("span");
        dot.className = "ticket-dot";
        dotsSpan.appendChild(dot);
      }
      el.appendChild(dotsSpan);
    }

    if (allSame) el.classList.add("hide-dots");

    el.style.left = item.x + "px";
    el.style.top = item.y + "px";
    if (item.scale && item.scale !== 1) {
      el.style.fontSize = (1.25 * item.scale) + "rem";
    }

    if (rafflePlaces.has(item.name)) {
      decorateRaffleWinner(el, rafflePlaces.get(item.name));
      if (transient.currentWinner === item.name) el.classList.add("active-winner");
    } else if (transient.currentWinner === item.name) {
      el.classList.remove("idle");
      el.classList.add("active-winner");
    } else if (away.has(item.name)) {
      el.classList.replace("idle", "away");
    } else if (waiting.has(item.name)) {
      el.classList.add("skipped");
      if (!returning) el.classList.remove("idle");
    } else if (selectedNames.has(item.name)) {
      el.classList.remove("idle");
      el.classList.add("previously-selected");
    }

    if (!sessionActive) {
      // Idle: names are toggles for "out today"
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.setAttribute("aria-pressed", away.has(item.name) ? "true" : "false");
      el.title = item.name + (away.has(item.name) ? " is out today (click to bring back)" : " (click to mark out today)");
    }

    container.appendChild(el);

    transient.layoutMeta.push({
      name: item.name, chances: item.chances, scale: item.scale || 1,
      x: item.x, y: item.y, w: item.w, h: item.h,
      region: item.region, el
    });
  });

  positionBarAboveCloud();
}

// ─── Topic Cloud (for Social mode topic selection animation) ────────

export function renderTopicCloud(topics, usedTopics) {
  const container = DOM.cloudContainer;
  container.replaceChildren();
  const rect = container.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;

  if (cw < 50 || ch < 50) return [];

  const usedSet = new Set(usedTopics);
  const MAX_DISPLAY = 40;
  const TOPIC_SCALE = 0.7;
  const truncate = (t) => t.length > MAX_DISPLAY ? t.slice(0, MAX_DISPLAY - 1) + "\u2026" : t;
  const fakeParticipants = topics.map(t => ({ name: truncate(t), chances: 1, scale: TOPIC_SCALE }));

  let reserveTop = 0;
  const contRect = container.getBoundingClientRect();
  const bars = [DOM.topicBar, DOM.turnBar];
  for (const bar of bars) {
    if (bar && bar.classList.contains("visible") || (bar && bar.style.display !== "none" && bar.offsetHeight > 0)) {
      const barRect = bar.getBoundingClientRect();
      const measured = barRect.bottom - contRect.top + 20;
      if (measured > 20) { reserveTop = measured; break; }
    }
  }
  if (reserveTop < 20) reserveTop = 80;
  const layout = Layout.compute(fakeParticipants, cw, ch, { cssClass: "name-tag topic-tag idle", reserveTop, layout: "brick" });
  const topicMeta = [];

  layout.forEach((item, i) => {
    const fullTopic = topics[i];
    const el = document.createElement("div");
    el.className = "name-tag topic-tag" + (usedSet.has(fullTopic) ? " previously-selected" : " idle");
    el.setAttribute("data-name", fullTopic);
    el.title = fullTopic;

    const textSpan = document.createElement("span");
    textSpan.className = "name-text";
    textSpan.textContent = item.name;
    el.appendChild(textSpan);

    el.style.left = item.x + "px";
    el.style.top = item.y + "px";
    el.style.fontSize = (1.25 * (item.scale || TOPIC_SCALE)) + "rem"; // must match what layout measured

    container.appendChild(el);

    topicMeta.push({
      name: fullTopic, chances: 1, scale: item.scale || 1,
      x: item.x, y: item.y, w: item.w, h: item.h,
      region: item.region, el
    });
  });

  return topicMeta;
}

// ─── Position Bar Above Cloud ───────────────────────────────────────

export function positionBarAboveCloud() {
  // Anchor bars at a fixed top position; the cloud's reserveTop pushes names below
  const barTop = 12;
  if (DOM.turnBar) DOM.turnBar.style.top = barTop + "px";
  if (DOM.topicBar) {
    const turnBarVisible = DOM.turnBar && DOM.turnBar.classList.contains("visible");
    if (turnBarVisible) {
      const turnBarBottom = barTop + (DOM.turnBar.offsetHeight || 120);
      DOM.topicBar.style.top = (turnBarBottom + 8) + "px";
    } else {
      DOM.topicBar.style.top = barTop + "px";
    }
  }
}
