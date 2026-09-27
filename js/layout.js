/**
 * layout.js: Layout engine entry point & rectangular grid
 *
 * Two layout modes:
 *   - "brick" (default): via computeBrick in layoutBrick.js
 *   - "rect": Centered rectangular grid (below)
 *
 * Both are deterministic. Shared helpers in layoutHelpers.js.
 */

import { computeBrick } from "./layoutBrick.js";
import { LAY_GAP, LAY_MARGIN, layGetRegion, layMeasureText } from "./layoutHelpers.js";

// ─── Rectangular Grid Layout ────────────────────────────────────────

export function computeRect(items, participants, n, availW, availH, cx, cy, containerW, containerH, cssClass, reserveTop) {
  const maxW = Math.max(...items.map(i => i.w));
  const maxH = Math.max(...items.map(i => i.h));
  const cellW = maxW + LAY_GAP;
  const cellH = maxH + LAY_GAP;

  let cols = Math.max(1, Math.floor(availW / cellW));
  cols = Math.min(cols, n);
  const rows = Math.ceil(n / cols);

  let scale = Math.min(1, availW / (cols * cellW), availH / (rows * cellH));
  scale = Math.max(0.45, scale);

  let finalItems = items;
  let finalCellW = cellW;
  let finalCellH = cellH;
  if (scale < 0.95) {
    finalItems = participants.map(p => {
      const s = (p.scale || 1) * scale;
      const size = layMeasureText(p.name, p.chances, s, cssClass);
      return { name: p.name, chances: p.chances, scale: s, w: size.w, h: size.h };
    });
    const sMaxW = Math.max(...finalItems.map(i => i.w));
    const sMaxH = Math.max(...finalItems.map(i => i.h));
    finalCellW = sMaxW + LAY_GAP;
    finalCellH = sMaxH + LAY_GAP;
    cols = Math.min(Math.max(1, Math.floor(availW / finalCellW)), n);
  }

  const finalRows = Math.ceil(n / cols);
  const gridW = cols * finalCellW;
  const gridH = finalRows * finalCellH;
  const startX = cx - gridW / 2;
  const startY = cy - gridH / 2;

  const placed = [];
  let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;

  for (let i = 0; i < n; i++) {
    const item = finalItems[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    let x = startX + col * finalCellW + (finalCellW - item.w) / 2;
    const y = startY + row * finalCellH + (finalCellH - item.h) / 2;

    const itemsInRow = row === finalRows - 1 ? n - row * cols : cols;
    const rowOffset = (cols - itemsInRow) * finalCellW / 2;
    x += rowOffset;

    pMinX = Math.min(pMinX, x);
    pMaxX = Math.max(pMaxX, x + item.w);
    pMinY = Math.min(pMinY, y);
    pMaxY = Math.max(pMaxY, y + item.h);

    placed.push({
      name: item.name, chances: item.chances, scale: item.scale,
      x, y, w: item.w, h: item.h, region: 0
    });
  }

  let shiftX = 0, shiftY = 0;
  if (pMinX < LAY_MARGIN) shiftX = LAY_MARGIN - pMinX;
  else if (pMaxX > containerW - LAY_MARGIN) shiftX = (containerW - LAY_MARGIN) - pMaxX;
  const topBound = Math.max(LAY_MARGIN, reserveTop);
  if (pMinY < topBound) shiftY = topBound - pMinY;
  else if (pMaxY > containerH - LAY_MARGIN) shiftY = (containerH - LAY_MARGIN) - pMaxY;

  for (const p of placed) {
    p.x += shiftX;
    p.y += shiftY;
    p.region = layGetRegion(p.x + p.w / 2, p.y + p.h / 2, containerW, containerH);
  }
  return placed;
}

// ─── Main Entry Point ───────────────────────────────────────────────

export function compute(participants, containerW, containerH, opts) {
  const cssClass = opts && opts.cssClass || null;
  const reserveTop = opts && opts.reserveTop || 0;
  const layout = opts && opts.layout || "brick";

  const n = participants.length;
  if (n === 0) return [];

  const items = participants.map(p => {
    const size = layMeasureText(p.name, p.chances, p.scale, cssClass);
    return { name: p.name, chances: p.chances, scale: p.scale || 1, w: size.w, h: size.h };
  });

  const availW = containerW - 2 * LAY_MARGIN;
  const availH = containerH - reserveTop - 2 * LAY_MARGIN;
  const cx = containerW / 2;
  const cy = reserveTop + LAY_MARGIN + availH * 0.5;

  if (layout === "rect") {
    return computeRect(items, participants, n, availW, availH, cx, cy, containerW, containerH, cssClass, reserveTop);
  }
  return computeBrick(items, participants, n, availW, availH, cx, cy, containerW, containerH, cssClass, reserveTop);
}
