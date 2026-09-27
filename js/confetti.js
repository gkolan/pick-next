/**
 * confetti.js: Big moments: sticker confetti rain and the winner celebration card
 *
 * Plain divs animated by GSAP; motion is skipped for prefers-reduced-motion
 * (the celebration card still shows, just without flying pieces).
 */

import { gsap } from "gsap";
import { sfx } from "./sound.js";

const COLORS = ["var(--sun)", "var(--mint)", "var(--sky)", "var(--rose)", "var(--peach)", "var(--accent)"];

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Rain confetti from the top. `emoji` mixes emoji pieces in with the paper ones. */
export function confetti(count = 70, emoji = []) {
  if (reducedMotion()) return;

  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    if (emoji.length && i % 3 === 0) {
      el.className = "confetti-emoji";
      el.textContent = emoji[i % emoji.length];
      el.style.fontSize = (22 + Math.random() * 18) + "px";
    } else {
      el.className = "confetti-piece" + (i % 4 === 0 ? " round" : "");
      const size = 8 + Math.random() * 8;
      el.style.width = size + "px";
      el.style.height = (i % 3 === 0 ? size : size * 0.55) + "px";
      el.style.background = COLORS[i % COLORS.length];
    }
    layer.appendChild(el);
    gsap.set(el, { x: Math.random() * w, y: -40 - Math.random() * h * 0.4, rotation: Math.random() * 360 });
    gsap.to(el, {
      y: h + 60,
      x: "+=" + (Math.random() * 160 - 80),
      rotation: "+=" + (Math.random() * 720 - 360),
      duration: 1.8 + Math.random() * 1.6,
      ease: "power1.in",
      delay: Math.random() * 0.4
    });
  }
  gsap.delayedCall(4, () => layer.remove());
}

/**
 * Pop a sticker card over the stage: big emoji, a kicker line, the name, optional sub line.
 * `big` = grand moment (raffle 1st place): longer hold, fanfare, more confetti.
 * Never blocks input (pointer-events: none) and removes itself.
 */
export function celebrate({ emoji, kicker, name, sub = "", tone = "var(--sun)", big = false, burst = [], hold = big ? 2.6 : 1.5 }) {
  document.querySelector(".celebrate-card")?.remove();

  const card = document.createElement("div");
  card.className = "celebrate-card" + (big ? " big" : "");
  card.style.setProperty("--celebrate", tone);
  card.setAttribute("role", "status");
  const parts = [
    ["celebrate-emoji", emoji],
    ["celebrate-kicker", kicker],
    ["celebrate-name", name],
    ["celebrate-sub", sub]
  ];
  for (const [cls, text] of parts) {
    if (!text) continue;
    const el = document.createElement("div");
    el.className = cls;
    el.textContent = text; // names/topics are user text: never innerHTML
    card.appendChild(el);
  }
  document.body.appendChild(card);

  if (big) sfx.fanfare(); else sfx.win();
  confetti(big ? 110 : 40, burst.length ? burst : [emoji]);

  if (reducedMotion()) {
    gsap.delayedCall(hold + 0.4, () => card.remove());
    return;
  }
  gsap.timeline({ onComplete: () => card.remove() })
    .fromTo(card, { scale: 0.3, rotation: -12, opacity: 0 }, { scale: 1, rotation: -2, opacity: 1, duration: 0.45, ease: "back.out(2.2)" })
    .fromTo(card.querySelector(".celebrate-emoji"), { scale: 0.4 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }, "<0.1")
    .to(card, { scale: 0.85, opacity: 0, y: -30, duration: 0.3, ease: "power2.in" }, "+=" + hold);
}
