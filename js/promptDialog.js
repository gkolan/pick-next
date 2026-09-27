/**
 * promptDialog.js: In-app prompt, confirm and alert dialogs
 *
 * API:
 *   appPrompt(title, options)  → Promise<string|null>
 *   appConfirm(title, message, options) → Promise<boolean>
 */

import { DOM } from "./domCache.js";
import { addBackdropDismiss } from "./eventsDialog.js";

export let _resolve = null;

export function cleanup() {
  DOM.appPromptDialog.classList.remove("danger");
  DOM.appPromptInput.classList.remove("invalid");
  DOM.appPromptError.textContent = "";
  DOM.appPromptInput.value = "";
  DOM.appPromptMessage.textContent = "";
  DOM.appPromptInputWrap.style.display = "";
  if (DOM.appPromptDialog.open) DOM.appPromptDialog.close();
}

export function settle(value) {
  if (_resolve) { const r = _resolve; _resolve = null; cleanup(); r(value); }
}

export function initPromptDialog() {
  DOM.appPromptClose.addEventListener("click", () => settle(null));
  DOM.appPromptCancel.addEventListener("click", () => settle(null));
  DOM.appPromptDialog.addEventListener("cancel", (e) => { e.preventDefault(); settle(null); });
  addBackdropDismiss(DOM.appPromptDialog, () => settle(null));
}

/**
 * Show a styled prompt dialog.
 * @param {string} title
 * @param {object} [options]
 * @param {string} [options.placeholder]
 * @param {string} [options.defaultValue]
 * @param {string} [options.confirmLabel]
 * @param {function} [options.validate] receives the value and, returns error string or null
 * @returns {Promise<string|null>} the entered text, or null if cancelled
 */
export function appPrompt(title, { placeholder, defaultValue, confirmLabel, validate } = {}) {
  cleanup();
  DOM.appPromptTitle.textContent = title;
  DOM.appPromptInputWrap.style.display = "";
  DOM.appPromptInput.placeholder = placeholder || "";
  DOM.appPromptInput.value = defaultValue || "";
  DOM.appPromptConfirm.textContent = confirmLabel || "Confirm";

  return new Promise((resolve) => {
    _resolve = resolve;
    DOM.appPromptDialog.showModal();
    DOM.appPromptInput.focus();

    // Enter key in input submits
    const onKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doConfirm();
      }
    };
    DOM.appPromptInput.addEventListener("keydown", onKeydown);

    function doConfirm() {
      const val = DOM.appPromptInput.value.trim();
      if (validate) {
        const err = validate(val);
        if (err) {
          DOM.appPromptInput.classList.add("invalid");
          DOM.appPromptError.textContent = err;
          return;
        }
      }
      DOM.appPromptInput.removeEventListener("keydown", onKeydown);
      settle(val || null);
    }

    // Clear validation on input
    DOM.appPromptInput.addEventListener("input", () => {
      DOM.appPromptInput.classList.remove("invalid");
      DOM.appPromptError.textContent = "";
    }, { once: false });

    DOM.appPromptConfirm.onclick = doConfirm;
  });
}

/**
 * Show a styled confirm dialog.
 * @param {string} title
 * @param {string} message
 * @param {object} [options]
 * @param {string} [options.confirmLabel]
 * @param {boolean} [options.danger] makes the confirm button red
 * @returns {Promise<boolean>}
 */
export function appConfirm(title, message, { confirmLabel, danger } = {}) {
  cleanup();
  DOM.appPromptTitle.textContent = title;
  DOM.appPromptMessage.textContent = message || "";
  DOM.appPromptInputWrap.style.display = "none";
  DOM.appPromptConfirm.textContent = confirmLabel || "Confirm";
  if (danger) DOM.appPromptDialog.classList.add("danger");

  return new Promise((resolve) => {
    _resolve = (val) => resolve(val !== null);
    DOM.appPromptDialog.showModal();
    DOM.appPromptConfirm.focus();
    DOM.appPromptConfirm.onclick = () => settle(true);
  });
}
