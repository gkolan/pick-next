/**
 * layoutBrick.js: Brick/offset layout algorithm
 *
 * Alternating wide/narrow rows with half-cell offset for visual interest.
 * Deterministic: same input always produces same positions.
 * Uses LAY_GAP, LAY_MARGIN, layMeasureText, layGetRegion from layoutHelpers.js.
 */

import { LAY_GAP, LAY_MARGIN, layGetRegion, layMeasureText } from "./layoutHelpers.js";

export function getLastRowCount(total, cols) {
  let remaining = total;
  let row = 0;
  let lastCount = 0;
  while (remaining > 0) {
    const isNarrow = row % 2 === 1;
    const rowCols = isNarrow ? Math.max(1, cols - 1) : cols;
    lastCount = Math.min(rowCols, remaining);
    remaining -= lastCount;
    row++;
  }
  return lastCount;
}

export function generateBrickPositions(count, cols) {
  const positions = [];
  let row = 0;
  let remaining = count;

  while (remaining > 0) {
    const isNarrow = row % 2 === 1;
    const rowCols = isNarrow ? Math.max(1, cols - 1) : cols;
    const itemsThisRow = Math.min(rowCols, remaining);

    for (let col = 0; col < itemsThisRow; col++) {
      positions.push({ row, col, isNarrow, rowCols: itemsThisRow });
    }

    remaining -= itemsThisRow;
    row++;
  }

  return positions;
}

export function computeBrick(items, participants, n, availW, availH, cx, cy, containerW, containerH, cssClass, reserveTop) {
  const maxW = Math.max(...items.map(i => i.w));
  const avgH = items.reduce((s, i) => s + i.h, 0) / n;

  const cellW = maxW + LAY_GAP;
  const cellH = avgH + LAY_GAP;

  let cols = Math.max(2, Math.floor(availW / cellW));
  cols = Math.min(cols, n);
  if (n > 3) cols = Math.min(cols, Math.ceil(Math.sqrt(n * 1.5)));

  // Avoid orphan: if last row would have a single lonely item, try nearby col counts
  if (cols > 2 && getLastRowCount(n, cols) === 1) {
    // Try one more col first (often a better fit), then try fewer
    const maxCols = Math.min(n, Math.floor(availW / cellW));
    if (cols + 1 <= maxCols && getLastRowCount(n, cols + 1) > 1) {
      cols = cols + 1;
    } else {
      while (cols > 2 && getLastRowCount(n, cols) === 1) cols--;
    }
  }

  let brickPos = generateBrickPositions(n, cols);
  const totalRows = brickPos.length > 0 ? brickPos[brickPos.length - 1].row + 1 : 0;

  const gridW = cols * cellW;
  const gridH = totalRows * cellH;
  let scale = Math.min(1, availW / gridW, availH / gridH);
  scale = Math.max(0.45, scale);

  let finalItems = items;
  let finalCellW = cellW;
  let finalCellH = cellH;
  let finalCols = cols;

  if (scale < 0.95) {
    finalItems = participants.map(p => {
      const s = (p.scale || 1) * scale;
      const size = layMeasureText(p.name, p.chances, s, cssClass);
      return { name: p.name, chances: p.chances, scale: s, w: size.w, h: size.h };
    });
    const sMaxW = Math.max(...finalItems.map(i => i.w));
    const sAvgH = finalItems.reduce((s, i) => s + i.h, 0) / n;
    finalCellW = sMaxW + LAY_GAP;
    finalCellH = sAvgH + LAY_GAP;
    finalCols = Math.max(2, Math.floor(availW / finalCellW));
    finalCols = Math.min(finalCols, n);
    if (finalCols > 2 && getLastRowCount(n, finalCols) === 1) {
      const maxFC = Math.min(n, Math.floor(availW / finalCellW));
      if (finalCols + 1 <= maxFC && getLastRowCount(n, finalCols + 1) > 1) {
        finalCols = finalCols + 1;
      } else {
        while (finalCols > 2 && getLastRowCount(n, finalCols) === 1) finalCols--;
      }
    }
    brickPos = generateBrickPositions(n, finalCols);
  }

  const finalRows = brickPos.length > 0 ? brickPos[brickPos.length - 1].row + 1 : 0;
  const totalW = finalCols * finalCellW;
  const totalH = finalRows * finalCellH;
  const startX = cx - totalW / 2;
  const startY = cy - totalH / 2;
  const halfOffset = finalCellW / 2;

  const placed = [];
  let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;

  for (let i = 0; i < n; i++) {
    const item = finalItems[i];
    const bp = brickPos[i];

    let x = startX + bp.col * finalCellW + (finalCellW - item.w) / 2;
    const y = startY + bp.row * finalCellH + (finalCellH - item.h) / 2;

    if (bp.isNarrow) x += halfOffset;

    const expectedCols = bp.isNarrow ? Math.max(1, finalCols - 1) : finalCols;
    if (bp.rowCols < expectedCols) {
      x += (expectedCols - bp.rowCols) * finalCellW / 2;
    }

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
