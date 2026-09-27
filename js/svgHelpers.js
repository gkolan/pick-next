/**
 * svgHelpers.js: SVG icon creation for buttons (built with DOM APIs)
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

export function createSvg(w, h) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");
  return svg;
}

export function createPlaySvg() {
  const svg = createSvg(14, 14);
  const poly = document.createElementNS(SVG_NS, "polygon");
  poly.setAttribute("points", "5,3 19,12 5,21");
  svg.appendChild(poly);
  return svg;
}

export function createPauseSvg() {
  const svg = createSvg(14, 14);
  const r1 = document.createElementNS(SVG_NS, "rect");
  r1.setAttribute("x", "6"); r1.setAttribute("y", "4");
  r1.setAttribute("width", "4"); r1.setAttribute("height", "16");
  const r2 = document.createElementNS(SVG_NS, "rect");
  r2.setAttribute("x", "14"); r2.setAttribute("y", "4");
  r2.setAttribute("width", "4"); r2.setAttribute("height", "16");
  svg.appendChild(r1);
  svg.appendChild(r2);
  return svg;
}

export function setButtonContent(btn, svgEl, text) {
  btn.replaceChildren(svgEl, document.createTextNode(text));
}
