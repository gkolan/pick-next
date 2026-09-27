/**
 * theme.js: Light / dark / follow-system theme preference
 *
 * The tokens live in styles.css; this only sets <html data-theme>.
 * index.html applies the saved preference inline before first paint.
 */

export const THEME_KEY = "picknext_theme";
const ORDER = ["system", "light", "dark"];

const ICONS = {
  system: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};

export function getThemePref() {
  try { return ORDER.includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : "system"; }
  catch { return "system"; }
}

export function applyTheme(pref) {
  if (pref === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
}

function paintButton(btn, pref) {
  btn.innerHTML = ICONS[pref];
  const label = "Theme: " + pref + " (click to change)";
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

export function initThemeToggle(btn) {
  if (!btn) return;
  paintButton(btn, getThemePref());
  btn.addEventListener("click", () => {
    const next = ORDER[(ORDER.indexOf(getThemePref()) + 1) % ORDER.length];
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode: session-only */ }
    applyTheme(next);
    paintButton(btn, next);
  });
}
