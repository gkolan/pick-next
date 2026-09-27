/**
 * editor.js: Participant editor dialog
 *
 * Manages the modal dialog for adding, removing, renaming participants
 * and setting their chances and optional per-person timer.
 */

import { getActiveTeam, getData, session, transient, persistData } from "./state.js";
import { DOM } from "./domCache.js";
import { MAX_PARTICIPANTS, MAX_CHANCES, TIMER_MIN, TIMER_MAX } from "./config.js";
import { showToast } from "./eventsDialog.js";
import { renderAll } from "./render.js";
import { renameTeam } from "./teams.js";

export function openEditor() {
  if (transient.isPicking) return;
  DOM.editorError.textContent = "";
  DOM.editorRows.replaceChildren();
  const team = getActiveTeam();
  DOM.editorTeamName.value = team.name;
  DOM.editorDefaultTimer.value = team.settings.timerDurationSec;
  team.participants.forEach(p => addEditorRow(p.name, p.chances, p.timerSec));
  addEditorRow();
  DOM.editorDialog.showModal();
  const lastRow = DOM.editorRows.lastElementChild;
  if (lastRow) lastRow.querySelector(".editor-name-input").focus();
}

export function closeEditor() {
  DOM.editorDialog.close();
}

// Bulk paste names
export function initEditorExtras() {
  if (DOM.editorPasteToggle) {
    DOM.editorPasteToggle.addEventListener("click", () => {
      const area = DOM.editorPasteArea;
      area.style.display = area.style.display === "none" ? "" : "none";
      if (area.style.display !== "none") DOM.editorPasteInput.focus();
    });
  }
  if (DOM.editorPasteAdd) {
    DOM.editorPasteAdd.addEventListener("click", () => {
      const text = DOM.editorPasteInput.value;
      const names = text.split(/[,\n]/).map(n => n.trim()).filter(Boolean);
      const existing = new Set([...DOM.editorRows.querySelectorAll(".editor-name-input")].map(i => i.value.trim().toLowerCase()).filter(Boolean));
      let added = 0;
      for (const name of names) {
        if (!existing.has(name.toLowerCase()) && existing.size < MAX_PARTICIPANTS) {
          addEditorRow(name, 1, null);
          existing.add(name.toLowerCase());
          added++;
        }
      }
      DOM.editorPasteInput.value = "";
      DOM.editorPasteArea.style.display = "none";
      if (typeof showToast === "function") showToast(added + " name" + (added !== 1 ? "s" : "") + " added");
    });
  }
  // Enter key saves when Save button is focused
  if (DOM.editorDialog) {
    DOM.editorDialog.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement === DOM.saveEditorBtn) { e.preventDefault(); saveEditor(); }
    });
  }
}

export function maybeAddEmptyRow(nameInput) {
  nameInput.addEventListener("input", () => {
    const row = nameInput.closest(".editor-row");
    if (row === DOM.editorRows.lastElementChild && nameInput.value.trim() !== "") {
      addEditorRow();
    }
  });
}

export function addEditorRow(name = "", chances = 1, timerSec = null) {
  const row = DOM.rowTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = row.querySelector(".editor-name-input");
  nameInput.value = name;
  row.querySelector(".editor-chances-input").value = String(chances);
  const timerInput = row.querySelector(".editor-timer-input");
  if (timerInput) timerInput.value = timerSec != null ? String(timerSec) : "";
  row.querySelector(".editor-remove-btn").addEventListener("click", () => row.remove());
  maybeAddEmptyRow(nameInput);
  DOM.editorRows.appendChild(row);
}

export function saveEditor() {
  const newTeamName = DOM.editorTeamName.value.trim();
  if (newTeamName && newTeamName !== getActiveTeam().name) {
    renameTeam(getData().activeTeamId, newTeamName);
  }

  const newTimer = parseInt(DOM.editorDefaultTimer.value, 10);
  if (!isNaN(newTimer) && newTimer >= TIMER_MIN && newTimer <= TIMER_MAX) {
    getActiveTeam().settings.timerDurationSec = newTimer;
  }

  const rows = DOM.editorRows.querySelectorAll(".editor-row");
  const participants = [];
  const seenNames = new Set();
  let errorMsg = "";

  rows.forEach(row => {
    const nameInput = row.querySelector(".editor-name-input");
    const chancesInput = row.querySelector(".editor-chances-input");
    const timerInput = row.querySelector(".editor-timer-input");
    const name = nameInput.value.trim();
    const chances = parseInt(chancesInput.value, 10);
    const timerRaw = timerInput ? timerInput.value.trim() : "";
    const timerSec = timerRaw === "" ? null : parseInt(timerRaw, 10);

    nameInput.classList.remove("invalid");
    chancesInput.classList.remove("invalid");
    if (timerInput) timerInput.classList.remove("invalid");

    if (!name) return;
    if (seenNames.has(name.toLowerCase())) {
      nameInput.classList.add("invalid");
      errorMsg = "Names must be unique.";
      return;
    }
    if (!Number.isInteger(chances) || chances < 1 || chances > MAX_CHANCES) {
      chancesInput.classList.add("invalid");
      errorMsg = "Chances must be 1\u2013" + MAX_CHANCES + ".";
      return;
    }
    if (timerSec !== null && (!Number.isInteger(timerSec) || timerSec < TIMER_MIN || timerSec > TIMER_MAX)) {
      if (timerInput) timerInput.classList.add("invalid");
      errorMsg = "Timer must be blank or " + TIMER_MIN + "\u2013" + TIMER_MAX + "s.";
      return;
    }

    seenNames.add(name.toLowerCase());
    participants.push({ name, chances, timerSec });
  });

  if (errorMsg) { DOM.editorError.textContent = errorMsg; return; }
  if (participants.length === 0) {
    DOM.editorError.textContent = "Add at least one participant.";
    return;
  }
  if (participants.length > MAX_PARTICIPANTS) {
    DOM.editorError.textContent = "Maximum " + MAX_PARTICIPANTS + " participants.";
    return;
  }

  const team = getActiveTeam();
  team.participants = participants;

  session.selectionHistory = session.selectionHistory.filter(
    h => participants.some(p => p.name === h.name)
  );

  if (!participants.some(p => p.name === transient.currentWinner)) {
    transient.currentWinner = null;
  }

  persistData();
  closeEditor();
  renderAll();
  if (typeof showToast === "function") showToast("Team saved");
}
