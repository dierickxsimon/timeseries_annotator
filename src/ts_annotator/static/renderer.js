import { TOKENS as T, MARGINS as M } from "./tokens.js";
import { svgEl, formatIdx } from "./utils.js";

/**
 * Draw the full chart into an SVG element.
 *
 * @param {SVGSVGElement} svg - Target SVG element (will be cleared).
 * @param {object} params - Drawing parameters.
 * @param {number[]} params.data - Full data array.
 * @param {number[]} params.viewRange - [startIdx, endIdx].
 * @param {object} params.scales - Scales object from createScales().
 * @param {object[]} params.annotations - Current annotations.
 * @param {object|null} params.dragState - Active drag state or null.
 * @param {number|null} params.hoverIdx - Hovered data index or null.
 * @param {object[]} params.labels - Label configs.
 * @param {number} params.width - SVG width.
 * @param {number} params.height - SVG height.
 * @param {number} params.sampleRate - Sample rate for axis formatting.
 * @param {string} params.xLabel - X-axis label.
 * @param {string} params.yLabel - Y-axis label.
 */
export function drawChart(svg, params) {
  const {
    data, viewRange, scales, annotations, dragState,
    hoverIdx, labels, width, height, sampleRate, xLabel, yLabel,
  } = params;

  const { xScale, yScale, plotW, plotH, yMin, yMax } = scales;
  const [s, e] = viewRange;

  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.innerHTML = "";

  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const v = yMin + i * (yMax - yMin) / 5;
    const y = yScale(v);
    svg.appendChild(svgEl("line", {
      x1: M.left, x2: width - M.right,
      y1: y, y2: y, stroke: T.gridLine, "stroke-width": 1,
    }));
  }

  // Range annotations (background rectangles)
  for (const a of annotations.filter((a) => a.type === "range")) {
    const x1 = xScale(a.value[0]);
    const x2 = xScale(a.value[1]);
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);

    svg.appendChild(svgEl("rect", {
      x: xMin, y: M.top, width: xMax - xMin, height: plotH,
      fill: a.color, opacity: 0.1,
    }));
    svg.appendChild(svgEl("line", {
      x1: xMin, x2: xMin, y1: M.top, y2: M.top + plotH,
      stroke: a.color, "stroke-width": 1.5, opacity: 0.4,
    }));
    svg.appendChild(svgEl("line", {
      x1: xMax, x2: xMax, y1: M.top, y2: M.top + plotH,
      stroke: a.color, "stroke-width": 1.5, opacity: 0.4,
    }));
    const txt = svgEl("text", {
      x: xMin + 4, y: M.top + 13,
      fill: a.color, "font-size": "9.5px", "font-family": T.fontMono, opacity: 0.7,
    });
    txt.textContent = `${a.name} [${a.value[0]}\u2013${a.value[1]}]`;
    svg.appendChild(txt);
  }

  // Drag preview
  if (dragState && hoverIdx != null) {
    const label = labels.find((l) => l.id === dragState.labelId);
    if (label) {
      const x1 = xScale(dragState.startIdx);
      const x2 = xScale(hoverIdx);
      svg.appendChild(svgEl("rect", {
        x: Math.min(x1, x2), y: M.top,
        width: Math.abs(x2 - x1), height: plotH,
        fill: label.color, opacity: 0.15,
        stroke: label.color, "stroke-width": 1, "stroke-dasharray": "4 2",
      }));
    }
  }

  // Signal path (decimated for performance)
  const step = Math.max(1, Math.floor((e - s + 1) / plotW));
  let d = "";
  for (let i = s; i <= e; i += step) {
    const px = xScale(i);
    const py = yScale(data[i]);
    d += (i === s ? "M" : "L") + px.toFixed(1) + "," + py.toFixed(1);
  }
  svg.appendChild(svgEl("path", {
    d, fill: "none", stroke: T.signal,
    "stroke-width": 1.5, "stroke-linejoin": "round",
  }));

  // Point annotations
  for (const a of annotations.filter((a) => a.type === "point")) {
    const px = xScale(a.value);
    const py = yScale(data[a.value]);

    svg.appendChild(svgEl("line", {
      x1: px, x2: px, y1: M.top, y2: M.top + plotH,
      stroke: a.color, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.4,
    }));
    svg.appendChild(svgEl("circle", {
      cx: px, cy: py, r: 4.5,
      fill: a.color, stroke: "#fff", "stroke-width": 2,
    }));
    const txt = svgEl("text", {
      x: px + 7, y: py - 7,
      fill: a.color, "font-size": "9.5px", "font-family": T.fontMono, opacity: 0.8,
    });
    txt.textContent = `${a.name} [${a.value}]`;
    svg.appendChild(txt);
  }

  // Crosshair
  if (hoverIdx != null && !dragState) {
    svg.appendChild(svgEl("line", {
      x1: xScale(hoverIdx), x2: xScale(hoverIdx),
      y1: M.top, y2: M.top + plotH,
      stroke: T.crosshair, "stroke-width": 1,
    }));
  }

  // X-axis ticks
  const xCount = Math.min(10, e - s);
  const xStep = (e - s) / xCount;
  for (let i = 0; i <= xCount; i++) {
    const idx = Math.round(s + i * xStep);
    const px = xScale(idx);
    svg.appendChild(svgEl("line", {
      x1: px, x2: px,
      y1: M.top + plotH, y2: M.top + plotH + 4,
      stroke: T.textDim, "stroke-width": 1,
    }));
    const t = svgEl("text", {
      x: px, y: M.top + plotH + 16,
      "text-anchor": "middle", fill: T.textDim,
      "font-size": "9.5px", "font-family": T.fontMono,
    });
    t.textContent = formatIdx(idx, sampleRate);
    svg.appendChild(t);
  }

  // Y-axis ticks
  for (let i = 0; i <= 5; i++) {
    const v = yMin + i * (yMax - yMin) / 5;
    const y = yScale(v);
    const t = svgEl("text", {
      x: M.left - 6, y: y + 3,
      "text-anchor": "end", fill: T.textDim,
      "font-size": "9.5px", "font-family": T.fontMono,
    });
    t.textContent = v.toFixed(1);
    svg.appendChild(t);
  }

  // Axis labels
  const xl = svgEl("text", {
    x: M.left + plotW / 2, y: height - 4,
    "text-anchor": "middle", fill: T.textMuted,
    "font-size": "10.5px", "font-family": T.fontMono,
  });
  xl.textContent = xLabel;
  svg.appendChild(xl);

  const yl = svgEl("text", {
    x: 12, y: M.top + plotH / 2,
    "text-anchor": "middle", fill: T.textMuted,
    "font-size": "10.5px", "font-family": T.fontMono,
    transform: `rotate(-90,12,${M.top + plotH / 2})`,
  });
  yl.textContent = yLabel;
  svg.appendChild(yl);
}
