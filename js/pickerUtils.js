/**
 * pickerUtils.js: Cryptographic random helpers for runPicker
 *
 * All functions are pure (no closure state) and use crypto.getRandomValues
 * for uniform distribution. Used by pickerSequence.js, pickerTiming.js,
 * and runPicker.js.
 */

export function rpRandUint32() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

export function rpRandInt(max) {
  if (max <= 1) return 0;
  const t = 0x100000000 % max;
  let r;
  do { r = rpRandUint32(); } while (r < t);
  return r % max;
}

export function rpRandFloat() {
  return rpRandUint32() / 0x100000000;
}

export function rpRandBetween(lo, hi) {
  return lo + rpRandFloat() * (hi - lo);
}

export function rpShuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rpRandInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rpClamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
