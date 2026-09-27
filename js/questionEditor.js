/**
 * questionEditor.js: Question list editor dialog (Hot Seat mode)
 *
 * Mirrors the topicEditor.js pattern for managing question lists.
 */

import { getActiveQuestionList, transient, persistData } from "./state.js";
import { DOM } from "./domCache.js";
import { MAX_QUESTIONS } from "./config.js";
import { renderQuestionListDropdown, updateUI } from "./render.js";

import { showToast } from "./eventsDialog.js";
export function openQuestionEditor() {
  if (transient.isPicking) return;
  const qList = getActiveQuestionList();
  if (!qList) return;
  DOM.questionEditorError.textContent = "";
  DOM.questionEditorRows.replaceChildren();
  qList.questions.forEach(q => addQuestionRow(q));
  DOM.questionEditorDialog.showModal();
}

export function closeQuestionEditor() {
  DOM.questionEditorDialog.close();
}

export function addQuestionRow(text = "") {
  const row = DOM.questionRowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".editor-question-input").value = text;
  row.querySelector(".editor-remove-btn").addEventListener("click", () => row.remove());
  DOM.questionEditorRows.appendChild(row);
}

export function saveQuestionEditor() {
  const rows = DOM.questionEditorRows.querySelectorAll(".editor-row");
  const questions = [];
  let errorMsg = "";

  rows.forEach(row => {
    const input = row.querySelector(".editor-question-input");
    const text = input.value.trim();
    input.classList.remove("invalid");
    if (!text) {
      input.classList.add("invalid");
      errorMsg = "Questions cannot be empty.";
      return;
    }
    questions.push(text);
  });

  if (errorMsg) { DOM.questionEditorError.textContent = errorMsg; return; }
  if (questions.length > MAX_QUESTIONS) {
    DOM.questionEditorError.textContent = "Maximum " + MAX_QUESTIONS + " questions.";
    return;
  }

  const qList = getActiveQuestionList();
  qList.questions = questions;
  persistData();
  closeQuestionEditor();
  renderQuestionListDropdown();
  updateUI();
  if (typeof showToast === "function") showToast("Questions saved");
}
