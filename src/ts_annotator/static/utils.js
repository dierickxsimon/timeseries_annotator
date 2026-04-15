/** Clamp a number between lo and hi. */
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Format a sample index using the sample rate for display. */
export function formatIdx(idx, sampleRate) {
  return sampleRate && sampleRate !== 1
    ? (idx / sampleRate).toFixed(2)
    : String(idx);
}

/** Create an SVG element with attributes. */
export function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Compute the y-axis extent (min, max) with padding.
 * @param {number[]} data - Full data array.
 * @param {number} start - Start index.
 * @param {number} end - End index (inclusive).
 * @returns {[number, number]} [yMin, yMax] with 8% padding.
 */
export function computeYExtent(data, start, end) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i <= end; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const pad = (max - min) * 0.08 || 1;
  return [min - pad, max + pad];
}
