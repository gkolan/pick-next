/**
 * layoutHelpers.js: Shared layout constants and measurement
 *
 * Used by both layoutBrick.js and layout.js.
 * Must be loaded before either layout file in the build.
 */

export const LAY_GAP    = 12;  // Minimum px gap between tags
export const LAY_MARGIN = 8;   // Minimum px from container edge

export function layMeasureText(name, chances, scale, cssClass) {
  const s = scale || 1;
  const span = document.createElement("span");
  span.className = cssClass || "name-tag idle";
  span.setAttribute("data-chances", chances);
  span.style.visibility = "hidden";
  span.style.position = "absolute";
  if (s !== 1) span.style.fontSize = (1.25 * s) + "rem";
  const nameSpan = document.createElement("span");
  nameSpan.className = "name-text";
  nameSpan.textContent = name;
  span.appendChild(nameSpan);
  const dotsSpan = document.createElement("span");
  dotsSpan.className = "ticket-dots";
  for (let d = 0; d < chances; d++) {
    const dot = document.createElement("span");
    dot.className = "ticket-dot";
    dotsSpan.appendChild(dot);
  }
  span.appendChild(dotsSpan);
  document.body.appendChild(span);
  const rect = span.getBoundingClientRect();
  document.body.removeChild(span);
  return { w: Math.ceil(rect.width) + 4, h: Math.ceil(rect.height) + 4 };
}

export function layGetRegion(x, y, cw, ch) {
  const col = x < cw / 3 ? 0 : x < (2 * cw / 3) ? 1 : 2;
  const row = y < ch / 3 ? 0 : y < (2 * ch / 3) ? 1 : 2;
  return row * 3 + col;
}
