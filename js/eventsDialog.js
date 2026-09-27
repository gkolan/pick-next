/**
 * eventsDialog.js: Dialog, export/import, and mobile event bindings
 *
 * Handles editor dialogs, data export/import, hamburger menu, keyboard, and resize.
 */

import { getActiveTeam, session, transient, initState } from "./state.js";
import { DOM } from "./domCache.js";
import { exportJSON, importJSON } from "./storage.js";
import { renderCloud, renderAll } from "./render.js";
import { beginPickCycle, isPickBusy } from "./pick.js";
import { cancelPick, endSession, showRecapEarly } from "./session.js";
import { closeEditor, saveEditor, initEditorExtras } from "./editor.js";
import { addTopicRow, closeTopicEditor, saveTopicEditor } from "./topicEditor.js";
import { addQuestionRow, closeQuestionEditor, saveQuestionEditor } from "./questionEditor.js";
import { appConfirm } from "./promptDialog.js";

export function openSidebar() {
  DOM.sidebar.classList.add("open");
  DOM.sidebarBackdrop.classList.add("visible");
  DOM.fabSettingsBtn.setAttribute("aria-expanded", "true");
  DOM.sidebarCloseBtn.focus();
}

export function closeSidebar() {
  if (!DOM.sidebar.classList.contains("open")) return;
  DOM.sidebar.classList.remove("open");
  DOM.sidebarBackdrop.classList.remove("visible");
  DOM.fabSettingsBtn.setAttribute("aria-expanded", "false");
}

// ─── Backdrop Dismiss Helper ───────────────────────────────────────
export function addBackdropDismiss(dialog, closeFn) {
  dialog.addEventListener("click", (e) => {
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
      if (closeFn) closeFn(); else dialog.close();
    }
  });
}

export function bindDialogEvents() {
  DOM.saveEditorBtn.addEventListener("click", saveEditor);
  DOM.closeEditorBtn.addEventListener("click", closeEditor);
  DOM.editorDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeEditor(); });
  addBackdropDismiss(DOM.editorDialog, closeEditor);
  initEditorExtras();

  DOM.addTopicBtn.addEventListener("click", () => addTopicRow());
  DOM.saveTopicEditorBtn.addEventListener("click", saveTopicEditor);
  DOM.closeTopicEditorBtn.addEventListener("click", closeTopicEditor);
  DOM.topicEditorDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeTopicEditor(); });
  addBackdropDismiss(DOM.topicEditorDialog, closeTopicEditor);
  // Enter saves when Save button focused
  DOM.topicEditorDialog.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement === DOM.saveTopicEditorBtn) { e.preventDefault(); saveTopicEditor(); }
  });

  if (DOM.addQuestionBtn) DOM.addQuestionBtn.addEventListener("click", () => addQuestionRow());
  if (DOM.saveQuestionEditorBtn) DOM.saveQuestionEditorBtn.addEventListener("click", saveQuestionEditor);
  if (DOM.closeQuestionEditorBtn) DOM.closeQuestionEditorBtn.addEventListener("click", closeQuestionEditor);
  if (DOM.questionEditorDialog) {
    DOM.questionEditorDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeQuestionEditor(); });
    addBackdropDismiss(DOM.questionEditorDialog, closeQuestionEditor);
    // Enter saves when Save button focused
    DOM.questionEditorDialog.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement === DOM.saveQuestionEditorBtn) { e.preventDefault(); saveQuestionEditor(); }
    });
  }

  DOM.exportBtn.addEventListener("click", () => {
    const json = exportJSON();
    if (!json) { showToast("No data to export", 2000, "error"); return; }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "picknext-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported");
  });

  DOM.importBtn.addEventListener("click", () => DOM.importFileInput.click());
  DOM.importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const ok = await appConfirm("Replace All Data?", "This will replace all teams, settings, and history. This cannot be undone.", { confirmLabel: "Import & Replace", danger: true });
      if (!ok) { DOM.importFileInput.value = ""; return; }
      const result = importJSON(reader.result);
      if (result) {
        endSession();
        initState();
        transient.timerRemaining = getActiveTeam().settings.timerDurationSec;
        renderAll();
        showToast("Data imported successfully");
      } else { showToast("Could not import: invalid file or browser storage unavailable", 3000, "error"); }
      DOM.importFileInput.value = "";
    };
    reader.readAsText(file);
  });
}

// ─── Toast Notifications ───────────────────────────────────────────

export function showToast(message, duration = 2000, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast" + (type ? " " + type : "");
  // Force reflow before adding visible class
  toast.offsetHeight;
  toast.classList.add("visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), duration);
}

export function bindMobileEvents() {
  // Settings FAB toggles the settings drawer
  DOM.fabSettingsBtn.addEventListener("click", () => {
    if (DOM.sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
  });
  DOM.startTeam.addEventListener("click", openSidebar); // team switcher lives in Settings
  DOM.sidebarCloseBtn.addEventListener("click", () => { closeSidebar(); DOM.fabSettingsBtn.focus(); });
  DOM.sidebarBackdrop.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    const _tag = document.activeElement.tagName;
    const inInput = _tag === "INPUT" || _tag === "TEXTAREA" || _tag === "SELECT";
    const anyDialogOpen = DOM.editorDialog.open || DOM.topicEditorDialog.open || (DOM.questionEditorDialog && DOM.questionEditorDialog.open);

    // Escape priority chain
    if (e.key === "Escape") {
      // 1. Close keyboard help overlay
      if (DOM.keyboardHelp && DOM.keyboardHelp.style.display !== "none") {
        DOM.keyboardHelp.style.display = "none"; return;
      }
      // 2. Cancel suspense animation
      if (transient.isPicking) {
        e.preventDefault();
        cancelPick();
        return;
      }
      // 4. Close sidebar
      if (DOM.sidebar.classList.contains("open")) { closeSidebar(); return; }
      // 5. Exit presenter mode
      if (document.getElementById("app").classList.contains("presenter-mode")) {
        // The browser exits fullscreen; the fullscreenchange listener cleans up
        return;
      }
      // 6. Same as the Exit button: running session → recap, recap → start screen
      if (!document.querySelector("dialog[open]") && (session.selectionHistory.length > 0 || transient.currentWinner || session.endedAt)) {
        DOM.exitBtn.click();
      }
      return;
    }

    // "?" toggles keyboard help
    if (e.key === "?" && !inInput && !anyDialogOpen) {
      e.preventDefault();
      if (DOM.keyboardHelp) {
        DOM.keyboardHelp.style.display = DOM.keyboardHelp.style.display === "none" ? "" : "none";
      }
      return;
    }

    // Skip dialog-level shortcuts if any dialog is open
    if (anyDialogOpen) return;

    // Space → start/pick next
    if (e.key === " " && !inInput && _tag !== "BUTTON") {
      e.preventDefault();
      if (!isPickBusy()) beginPickCycle("keyboard");
      return;
    }

    // S → Skip current person
    if ((e.key === "s" || e.key === "S") && !inInput && transient.currentWinner && !transient.isPicking) {
      e.preventDefault();
      if (DOM.skipBtn && DOM.skipBtn.style.display !== "none") DOM.skipBtn.click();
      return;
    }

    // P → Pause/Resume
    if ((e.key === "p" || e.key === "P") && !inInput && transient.isTimerRunning && !transient.isPicking) {
      e.preventDefault();
      if (DOM.pauseBtn) DOM.pauseBtn.click();
      return;
    }

    // E → End session early
    if ((e.key === "e" || e.key === "E") && !inInput && !transient.isPicking && session.selectionHistory.length > 0) {
      e.preventDefault();
      showRecapEarly();
      return;
    }
  });

  const relayout = () => {
    if (transient.resizeRaf) cancelAnimationFrame(transient.resizeRaf);
    transient.resizeRaf = requestAnimationFrame(() => {
      if (!transient.isPicking) renderCloud();
    });
  };
  window.addEventListener("resize", relayout);
  // Tags are measured in the DOM, so re-measure once the display font arrives.
  document.fonts?.ready.then(relayout);
}
