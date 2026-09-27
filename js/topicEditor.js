/**
 * topicEditor.js: Topic list editor dialog
 *
 * Manages the modal dialog for adding, removing, and editing topics.
 */

import { getActiveTopicList, transient, persistData } from "./state.js";
import { DOM } from "./domCache.js";
import { MAX_TOPICS } from "./config.js";
import { renderTopicListDropdown, updateUI } from "./render.js";

import { showToast } from "./eventsDialog.js";
export function openTopicEditor() {
  if (transient.isPicking) return;
  const topicList = getActiveTopicList();
  if (!topicList) return;
  DOM.topicEditorError.textContent = "";
  DOM.topicEditorRows.replaceChildren();
  topicList.topics.forEach(t => addTopicRow(t));
  DOM.topicEditorDialog.showModal();
}

export function closeTopicEditor() {
  DOM.topicEditorDialog.close();
}

export function addTopicRow(text = "") {
  const row = DOM.topicRowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".editor-topic-input").value = text;
  row.querySelector(".editor-remove-btn").addEventListener("click", () => row.remove());
  DOM.topicEditorRows.appendChild(row);
}

export function saveTopicEditor() {
  const rows = DOM.topicEditorRows.querySelectorAll(".topic-row");
  const topics = [];
  let errorMsg = "";

  rows.forEach(row => {
    const input = row.querySelector(".editor-topic-input");
    const text = input.value.trim();
    input.classList.remove("invalid");
    if (!text) {
      input.classList.add("invalid");
      errorMsg = "Topics cannot be empty.";
      return;
    }
    topics.push(text);
  });

  if (errorMsg) { DOM.topicEditorError.textContent = errorMsg; return; }
  if (topics.length > MAX_TOPICS) {
    DOM.topicEditorError.textContent = "Maximum " + MAX_TOPICS + " topics.";
    return;
  }

  const topicList = getActiveTopicList();
  topicList.topics = topics;
  persistData();
  closeTopicEditor();
  renderTopicListDropdown();
  updateUI();
  if (typeof showToast === "function") showToast("Topics saved");
}
