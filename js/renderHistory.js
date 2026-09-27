/**
 * renderHistory.js: History list, status bar, and dropdown rendering
 */

import { getData, session } from "./state.js";
import { DOM } from "./domCache.js";
import { formatOrdinal } from "./config.js";

// ─── History List ───────────────────────────────────────────────────

export function formatTime(timestamp) {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return h + ":" + m + ":" + s;
}

export function renderHistory() {
  const history = session.selectionHistory;
  DOM.historyList.replaceChildren();
  [...history].reverse().forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const label = item.place ? formatOrdinal(item.place) : "#" + (history.length - i);
    const numSpan = document.createElement("span");
    numSpan.className = "history-number";
    numSpan.textContent = label;
    const nameSpan = document.createElement("span");
    nameSpan.className = "history-name";
    nameSpan.textContent = item.name;
    const timeSpan = document.createElement("span");
    timeSpan.className = "history-time";
    timeSpan.textContent = formatTime(item.timestamp);
    li.appendChild(numSpan);
    li.appendChild(nameSpan);
    li.appendChild(timeSpan);
    DOM.historyList.appendChild(li);
  });
}

// ─── Status Bar ─────────────────────────────────────────────────────

export function updateStatus(text, picking) {
  DOM.statusText.textContent = text;
  DOM.statusDot.className = "status-dot" + (picking ? " picking" : "");
}

// ─── Team Dropdown ──────────────────────────────────────────────────

export function renderTeamDropdown() {
  const data = getData();
  DOM.teamSelect.replaceChildren();
  for (const [id, team] of Object.entries(data.teams)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = team.name + "   [" + team.participants.length + "]";
    if (id === data.activeTeamId) opt.selected = true;
    DOM.teamSelect.appendChild(opt);
  }
}

// ─── Topic List Dropdown ────────────────────────────────────────────

export function renderTopicListDropdown() {
  const data = getData();
  const selects = [DOM.topicListSelect, DOM.icebreakerTopicListSelect];
  selects.forEach(sel => {
    if (!sel) return;
    sel.replaceChildren();
    for (const [id, list] of Object.entries(data.topicLists)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = list.name + "   [" + list.topics.length + "]";
      if (id === data.activeTopicListId) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

export function renderQuestionListDropdown() {
  const data = getData();
  if (!data.questionLists || !DOM.hotseatQuestionListSelect) return;
  DOM.hotseatQuestionListSelect.replaceChildren();
  for (const [id, list] of Object.entries(data.questionLists)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = list.name + "   [" + list.questions.length + "]";
    if (id === data.activeQuestionListId) opt.selected = true;
    DOM.hotseatQuestionListSelect.appendChild(opt);
  }
}
