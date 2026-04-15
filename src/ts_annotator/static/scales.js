import { MARGINS as M } from "./tokens.js";
import { clamp, computeYExtent } from "./utils.js";

/**
 * Create scaling functions for the chart.
 *
 * Returns an object with xScale, yScale, idxFromClientX that close
 * over the current viewRange, dimensions, and data. Call this whenever
 * the view changes to get updated scale functions.
 *
 * @param {number[]} data - Full data array.
 * @param {number[]} viewRange - [startIdx, endIdx].
 * @param {number} width - Total SVG width.
 * @param {number} height - Total SVG height.
 * @param {SVGSVGElement} svgEl - The SVG element (for clientX conversion).
 */
export function createScales(data, viewRange, width, height, svgEl) {
  const [s, e] = viewRange;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const [yMin, yMax] = computeYExtent(data, s, e);

  return {
    plotW,
    plotH,
    yMin,
    yMax,

    /** Map a data index to an x pixel coordinate. */
    xScale(idx) {
      return M.left + ((idx - s) / (e - s)) * plotW;
    },

    /** Map a data value to a y pixel coordinate. */
    yScale(v) {
      return M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    },

    /** Map a mouse clientX to the nearest data index. */
    idxFromClientX(clientX) {
      const rect = svgEl.getBoundingClientRect();
      const x = clientX - rect.left - M.left;
      return clamp(Math.round(s + (x / plotW) * (e - s)), s, e);
    },
  };
}
