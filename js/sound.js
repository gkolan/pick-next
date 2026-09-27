/**
 * sound.js: Tiny synthesized sound effects (WebAudio, no audio files)
 *
 * Roulette ticks, a reveal jingle, a raffle fanfare and a time's-up buzz.
 * The header speaker button mutes everything; the choice is remembered.
 */

const KEY = "picknext_sound";
let ctx = null;

export function isMuted() {
  try { return localStorage.getItem(KEY) === "off"; } catch { return false; }
}

function tone(freq, at, dur, type = "square", gain = 0.04) {
  if (isMuted()) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx ||= new AC();
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  /** Roulette hop; pitch climbs as suspense builds (progress 0..1). */
  tick: (progress = 0) => tone(500 + progress * 700, 0, 0.035, "square", 0.025),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.28, "triangle", 0.08)),
  fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 6 ? 0.7 : 0.2, "triangle", 0.09)),
  buzz: () => { tone(160, 0, 0.35, "sawtooth", 0.05); tone(120, 0.3, 0.45, "sawtooth", 0.05); }
};

const SPEAKER = '<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/>';
const ICON_ON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + SPEAKER + '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_OFF = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + SPEAKER + '<path d="m16 9 6 6M22 9l-6 6"/></svg>';

export function initSoundToggle(btn) {
  if (!btn) return;
  const paint = () => {
    const muted = isMuted();
    btn.innerHTML = muted ? ICON_OFF : ICON_ON;
    btn.title = muted ? "Sound off (click to turn on)" : "Sound on (click to mute)";
    btn.setAttribute("aria-label", btn.title);
  };
  paint();
  btn.addEventListener("click", () => {
    try { localStorage.setItem(KEY, isMuted() ? "on" : "off"); } catch { /* private mode */ }
    paint();
    sfx.tick(1);
  });
}
