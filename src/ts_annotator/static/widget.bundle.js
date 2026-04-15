// src/ts_annotator/static/tokens.js
var TOKENS = {
  bg: "#FFFFFF",
  surface: "#F6F7F9",
  surfaceActive: "#EDEEF1",
  border: "#D8DBE0",
  borderFocus: "#3B7DED",
  text: "#1A1D23",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
  gridLine: "rgba(0,0,0,0.06)",
  crosshair: "rgba(59,125,237,0.35)",
  signal: "#3B7DED",
  fontMono: "'JetBrains Mono','Fira Code','SF Mono','Cascadia Code',monospace",
  fontSans: "'DM Sans','Segoe UI',system-ui,sans-serif"
};
var MARGINS = { top: 16, right: 12, bottom: 28, left: 44 };

// src/ts_annotator/static/utils.js
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function formatIdx(idx, sampleRate) {
  return sampleRate && sampleRate !== 1 ? (idx / sampleRate).toFixed(2) : String(idx);
}
function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}
function computeYExtent(data, start, end) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i <= end; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const pad = (max - min) * 0.08 || 1;
  return [min - pad, max + pad];
}

// src/ts_annotator/static/scales.js
function createScales(data, viewRange, width, height, svgEl2) {
  const [s, e] = viewRange;
  const plotW = width - MARGINS.left - MARGINS.right;
  const plotH = height - MARGINS.top - MARGINS.bottom;
  const [yMin, yMax] = computeYExtent(data, s, e);
  return {
    plotW,
    plotH,
    yMin,
    yMax,
    /** Map a data index to an x pixel coordinate. */
    xScale(idx) {
      return MARGINS.left + (idx - s) / (e - s) * plotW;
    },
    /** Map a data value to a y pixel coordinate. */
    yScale(v) {
      return MARGINS.top + plotH - (v - yMin) / (yMax - yMin) * plotH;
    },
    /** Map a mouse clientX to the nearest data index. */
    idxFromClientX(clientX) {
      const rect = svgEl2.getBoundingClientRect();
      const x = clientX - rect.left - MARGINS.left;
      return clamp(Math.round(s + x / plotW * (e - s)), s, e);
    }
  };
}

// src/ts_annotator/static/renderer.js
function drawChart(svg, params) {
  const {
    data,
    viewRange,
    scales,
    annotations,
    dragState,
    hoverIdx,
    labels,
    width,
    height,
    sampleRate,
    xLabel,
    yLabel
  } = params;
  const { xScale, yScale, plotW, plotH, yMin, yMax } = scales;
  const [s, e] = viewRange;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.innerHTML = "";
  for (let i = 0; i <= 5; i++) {
    const v = yMin + i * (yMax - yMin) / 5;
    const y = yScale(v);
    svg.appendChild(svgEl("line", {
      x1: MARGINS.left,
      x2: width - MARGINS.right,
      y1: y,
      y2: y,
      stroke: TOKENS.gridLine,
      "stroke-width": 1
    }));
  }
  for (const a of annotations.filter((a2) => a2.type === "range")) {
    const x1 = xScale(a.value[0]);
    const x2 = xScale(a.value[1]);
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    svg.appendChild(svgEl("rect", {
      x: xMin,
      y: MARGINS.top,
      width: xMax - xMin,
      height: plotH,
      fill: a.color,
      opacity: 0.1
    }));
    svg.appendChild(svgEl("line", {
      x1: xMin,
      x2: xMin,
      y1: MARGINS.top,
      y2: MARGINS.top + plotH,
      stroke: a.color,
      "stroke-width": 1.5,
      opacity: 0.4
    }));
    svg.appendChild(svgEl("line", {
      x1: xMax,
      x2: xMax,
      y1: MARGINS.top,
      y2: MARGINS.top + plotH,
      stroke: a.color,
      "stroke-width": 1.5,
      opacity: 0.4
    }));
    const txt = svgEl("text", {
      x: xMin + 4,
      y: MARGINS.top + 13,
      fill: a.color,
      "font-size": "9.5px",
      "font-family": TOKENS.fontMono,
      opacity: 0.7
    });
    txt.textContent = `${a.name} [${a.value[0]}\u2013${a.value[1]}]`;
    svg.appendChild(txt);
  }
  if (dragState && hoverIdx != null) {
    const label = labels.find((l) => l.id === dragState.labelId);
    if (label) {
      const x1 = xScale(dragState.startIdx);
      const x2 = xScale(hoverIdx);
      svg.appendChild(svgEl("rect", {
        x: Math.min(x1, x2),
        y: MARGINS.top,
        width: Math.abs(x2 - x1),
        height: plotH,
        fill: label.color,
        opacity: 0.15,
        stroke: label.color,
        "stroke-width": 1,
        "stroke-dasharray": "4 2"
      }));
    }
  }
  const step = Math.max(1, Math.floor((e - s + 1) / plotW));
  let d = "";
  for (let i = s; i <= e; i += step) {
    const px = xScale(i);
    const py = yScale(data[i]);
    d += (i === s ? "M" : "L") + px.toFixed(1) + "," + py.toFixed(1);
  }
  svg.appendChild(svgEl("path", {
    d,
    fill: "none",
    stroke: TOKENS.signal,
    "stroke-width": 1.5,
    "stroke-linejoin": "round"
  }));
  for (const a of annotations.filter((a2) => a2.type === "point")) {
    const px = xScale(a.value);
    const py = yScale(data[a.value]);
    svg.appendChild(svgEl("line", {
      x1: px,
      x2: px,
      y1: MARGINS.top,
      y2: MARGINS.top + plotH,
      stroke: a.color,
      "stroke-width": 1,
      "stroke-dasharray": "3 3",
      opacity: 0.4
    }));
    svg.appendChild(svgEl("circle", {
      cx: px,
      cy: py,
      r: 4.5,
      fill: a.color,
      stroke: "#fff",
      "stroke-width": 2
    }));
    const txt = svgEl("text", {
      x: px + 7,
      y: py - 7,
      fill: a.color,
      "font-size": "9.5px",
      "font-family": TOKENS.fontMono,
      opacity: 0.8
    });
    txt.textContent = `${a.name} [${a.value}]`;
    svg.appendChild(txt);
  }
  if (hoverIdx != null && !dragState) {
    svg.appendChild(svgEl("line", {
      x1: xScale(hoverIdx),
      x2: xScale(hoverIdx),
      y1: MARGINS.top,
      y2: MARGINS.top + plotH,
      stroke: TOKENS.crosshair,
      "stroke-width": 1
    }));
  }
  const xCount = Math.min(10, e - s);
  const xStep = (e - s) / xCount;
  for (let i = 0; i <= xCount; i++) {
    const idx = Math.round(s + i * xStep);
    const px = xScale(idx);
    svg.appendChild(svgEl("line", {
      x1: px,
      x2: px,
      y1: MARGINS.top + plotH,
      y2: MARGINS.top + plotH + 4,
      stroke: TOKENS.textDim,
      "stroke-width": 1
    }));
    const t = svgEl("text", {
      x: px,
      y: MARGINS.top + plotH + 16,
      "text-anchor": "middle",
      fill: TOKENS.textDim,
      "font-size": "9.5px",
      "font-family": TOKENS.fontMono
    });
    t.textContent = formatIdx(idx, sampleRate);
    svg.appendChild(t);
  }
  for (let i = 0; i <= 5; i++) {
    const v = yMin + i * (yMax - yMin) / 5;
    const y = yScale(v);
    const t = svgEl("text", {
      x: MARGINS.left - 6,
      y: y + 3,
      "text-anchor": "end",
      fill: TOKENS.textDim,
      "font-size": "9.5px",
      "font-family": TOKENS.fontMono
    });
    t.textContent = v.toFixed(1);
    svg.appendChild(t);
  }
  const xl = svgEl("text", {
    x: MARGINS.left + plotW / 2,
    y: height - 4,
    "text-anchor": "middle",
    fill: TOKENS.textMuted,
    "font-size": "10.5px",
    "font-family": TOKENS.fontMono
  });
  xl.textContent = xLabel;
  svg.appendChild(xl);
  const yl = svgEl("text", {
    x: 12,
    y: MARGINS.top + plotH / 2,
    "text-anchor": "middle",
    fill: TOKENS.textMuted,
    "font-size": "10.5px",
    "font-family": TOKENS.fontMono,
    transform: `rotate(-90,12,${MARGINS.top + plotH / 2})`
  });
  yl.textContent = yLabel;
  svg.appendChild(yl);
}

// src/ts_annotator/static/state.js
function computeOutput(labels, annotations) {
  return labels.map((label) => {
    const mine = annotations.filter((a) => a.labelId === label.id);
    let value = null;
    if (label.type === "point") {
      value = mine.length > 0 ? mine.map((a) => a.value) : null;
    } else {
      value = mine.length > 0 ? mine.map((a) => a.value) : null;
    }
    return { name: label.name, color: label.color, type: label.type, value };
  });
}

// src/ts_annotator/static/ui.js
function buildUI(el, labels, sampleCount) {
  el.style.fontFamily = TOKENS.fontMono;
  el.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    background: ${TOKENS.bg}; color: ${TOKENS.text};
    padding: 12px; box-sizing: border-box; font-size: 13px;
  `;
  el.appendChild(wrapper);
  const btnBar = document.createElement("div");
  btnBar.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;";
  wrapper.appendChild(btnBar);
  const labelBtns = labels.map((l) => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding:6px 12px;border-radius:4px;
      border:1px solid ${TOKENS.border};background:${TOKENS.surface};color:${TOKENS.text};
      font-family:${TOKENS.fontMono};font-size:12px;font-weight:500;
      cursor:pointer;outline:none;transition:all 0.15s;
    `;
    btn.textContent = l.name;
    btnBar.appendChild(btn);
    return btn;
  });
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  btnBar.appendChild(spacer);
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset Zoom";
  resetBtn.style.cssText = `
    padding:6px 12px;border-radius:4px;border:1px solid ${TOKENS.border};
    background:${TOKENS.surface};color:${TOKENS.text};
    font-family:${TOKENS.fontMono};font-size:12px;cursor:pointer;
  `;
  btnBar.appendChild(resetBtn);
  const status = document.createElement("div");
  status.style.cssText = `
    font-size:11px;color:${TOKENS.textMuted};margin-bottom:8px;
    height:14px;font-family:${TOKENS.fontMono};min-height:14px;
  `;
  wrapper.appendChild(status);
  const svgContainer = document.createElement("div");
  svgContainer.style.cssText = `
    background:${TOKENS.surface};border-radius:4px;
    border:1px solid ${TOKENS.border};overflow:hidden;
  `;
  wrapper.appendChild(svgContainer);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "display:block;user-select:none;";
  svgContainer.appendChild(svg);
  const annoContainer = document.createElement("div");
  annoContainer.style.cssText = "margin-top:10px;";
  wrapper.appendChild(annoContainer);
  return {
    wrapper,
    btnBar,
    labelBtns,
    status,
    svgContainer,
    svg,
    annoContainer,
    resetBtn
  };
}
function updateButtons(labelBtns, labels, activeLabel) {
  labelBtns.forEach((btn, i) => {
    const l = labels[i];
    const active = activeLabel === i;
    btn.style.background = active ? l.color : TOKENS.surface;
    btn.style.color = active ? TOKENS.bg : TOKENS.text;
    btn.style.borderColor = active ? l.color : TOKENS.border;
  });
}
function updateStatus(statusEl, labels, activeLabel, hoverIdx, data) {
  let text = "";
  if (activeLabel != null) {
    const l = labels[activeLabel];
    const action = l.type === "point" ? "click" : "drag";
    text = `[${l.name}] ${action} \xB7 esc`;
  } else {
    text = "scroll to zoom";
  }
  if (hoverIdx != null && data[hoverIdx] != null) {
    text += ` \xB7 idx: ${hoverIdx}`;
  }
  statusEl.textContent = text;
}
function drawAnnotationList(container, annotations, onRemove) {
  container.innerHTML = `
    <div style="font-size:11px;color:${TOKENS.textMuted};margin-bottom:6px;
      font-family:${TOKENS.fontMono};">
      Annotations (${annotations.length})
    </div>
  `;
  if (annotations.length === 0) {
    container.innerHTML += `
      <div style="padding:8px 12px;background:${TOKENS.surface};border-radius:4px;
        border:1px solid ${TOKENS.border};color:${TOKENS.textMuted};
        font-size:11px;font-family:${TOKENS.fontMono};">
        None
      </div>
    `;
    return;
  }
  const list = document.createElement("div");
  list.style.cssText = `
    background:${TOKENS.surface};border-radius:4px;border:1px solid ${TOKENS.border};
    max-height:150px;overflow-y:auto;font-size:11px;
  `;
  annotations.forEach((a, i) => {
    const row = document.createElement("div");
    row.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:4px 8px;
      font-family:${TOKENS.fontMono};
      ${i < annotations.length - 1 ? `border-bottom:1px solid ${TOKENS.border};` : ""}
    `;
    const dot = document.createElement("span");
    dot.style.cssText = `
      width:6px;height:6px;flex-shrink:0;
      border-radius:${a.type === "point" ? "50%" : "2px"};
      background:${a.color};
    `;
    row.appendChild(dot);
    const name = document.createElement("span");
    name.style.cssText = `color:${a.color};font-weight:500;min-width:70px;`;
    name.textContent = a.name;
    row.appendChild(name);
    const val = document.createElement("span");
    val.style.color = TOKENS.textMuted;
    val.textContent = a.type === "point" ? `${a.value}` : `[${a.value[0]}...${a.value[1]}]`;
    row.appendChild(val);
    const sp = document.createElement("div");
    sp.style.flex = "1";
    row.appendChild(sp);
    const rm = document.createElement("button");
    rm.textContent = "\u2715";
    rm.style.cssText = `
      background:none;border:none;color:${TOKENS.textMuted};
      cursor:pointer;font-size:13px;padding:0 4px;font-family:${TOKENS.fontMono};
    `;
    rm.addEventListener("click", () => onRemove(i));
    row.appendChild(rm);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// src/ts_annotator/static/widget.js
var CHART_HEIGHT = 300;
function expandInitialAnnotations(labels, output) {
  if (!Array.isArray(output)) {
    return [];
  }
  const annotations = [];
  labels.forEach((label, idx) => {
    const labelOutput = output[idx];
    if (!labelOutput || labelOutput.value == null) {
      return;
    }
    if (label.type === "point") {
      const points = Array.isArray(labelOutput.value) ? labelOutput.value : [labelOutput.value];
      points.forEach((point) => {
        if (Number.isFinite(point)) {
          annotations.push({
            labelId: label.id,
            name: label.name,
            color: label.color,
            type: "point",
            value: Math.round(point)
          });
        }
      });
      return;
    }
    const ranges = Array.isArray(labelOutput.value) && Array.isArray(labelOutput.value[0]) ? labelOutput.value : [labelOutput.value];
    ranges.forEach((range) => {
      if (!Array.isArray(range) || range.length !== 2) {
        return;
      }
      const start = Math.round(range[0]);
      const end = Math.round(range[1]);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        annotations.push({
          labelId: label.id,
          name: label.name,
          color: label.color,
          type: "range",
          value: [Math.min(start, end), Math.max(start, end)]
        });
      }
    });
  });
  return annotations;
}
function render(context, maybeEl) {
  let model = null;
  let el = null;
  if (context && typeof context === "object" && "model" in context && "el" in context) {
    model = context.model;
    el = context.el;
  } else if (context && maybeEl) {
    model = context;
    el = maybeEl;
  }
  if (!model || !el) {
    return () => {
    };
  }
  const rawData = JSON.parse(model.get("data_json"));
  const labelConfigs = JSON.parse(model.get("labels_json"));
  const sampleRate = model.get("sample_rate") || 1;
  const xLabel = model.get("x_label") || "Sample";
  const yLabel = model.get("y_label") || "Value";
  const labels = labelConfigs.map((l, i) => ({ ...l, id: i }));
  let activeLabel = null;
  let annotations = [];
  try {
    const output = JSON.parse(model.get("annotations_json") || "[]");
    annotations = expandInitialAnnotations(labels, output);
  } catch {
    annotations = [];
  }
  let hoverIdx = null;
  let viewRange = [0, rawData.length - 1];
  let dragState = null;
  let panState = null;
  let width = 900;
  el.innerHTML = "";
  const ui = buildUI(el, labels, rawData.length);
  ui.labelBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      activeLabel = activeLabel === i ? null : i;
      updateButtons(ui.labelBtns, labels, activeLabel);
      updateCursor();
      redraw();
    });
  });
  ui.resetBtn.addEventListener("click", () => {
    viewRange = [0, rawData.length - 1];
    redraw();
  });
  const resizeObs = new ResizeObserver((entries) => {
    width = Math.max(400, entries[0].contentRect.width);
    redraw();
  });
  resizeObs.observe(ui.svgContainer);
  function updateCursor() {
    if (activeLabel != null) {
      ui.svg.style.cursor = labels[activeLabel].type === "point" ? "crosshair" : "col-resize";
    } else if (panState) {
      ui.svg.style.cursor = "grabbing";
    } else if (viewRange[1] - viewRange[0] < rawData.length - 1) {
      ui.svg.style.cursor = "grab";
    } else {
      ui.svg.style.cursor = "default";
    }
  }
  function shiftViewBy(deltaIdx) {
    const [s, e] = viewRange;
    const range = e - s;
    if (range >= rawData.length - 1) {
      return;
    }
    const maxStart = rawData.length - 1 - range;
    const nextStart = clamp(s + deltaIdx, 0, maxStart);
    viewRange = [nextStart, nextStart + range];
  }
  function syncModel() {
    const output = computeOutput(labels, annotations);
    model.set("annotations_json", JSON.stringify(output));
    model.save_changes();
  }
  function redraw() {
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg
    );
    drawChart(ui.svg, {
      data: rawData,
      viewRange,
      scales,
      annotations,
      dragState,
      hoverIdx,
      labels,
      width,
      height: CHART_HEIGHT,
      sampleRate,
      xLabel,
      yLabel
    });
    updateStatus(ui.status, labels, activeLabel, hoverIdx, rawData);
    updateCursor();
    drawAnnotationList(ui.annoContainer, annotations, (idx) => {
      annotations.splice(idx, 1);
      syncModel();
      redraw();
    });
  }
  ui.svg.addEventListener("mousemove", (e) => {
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg
    );
    if (panState) {
      const [baseStart, baseEnd] = panState.baseRange;
      const range = baseEnd - baseStart;
      if (range < rawData.length - 1) {
        const startIdx = scales.idxFromClientX(panState.startClientX);
        const currentIdx = scales.idxFromClientX(e.clientX);
        const delta = startIdx - currentIdx;
        const maxStart = rawData.length - 1 - range;
        const nextStart = clamp(baseStart + delta, 0, maxStart);
        viewRange = [nextStart, nextStart + range];
      }
    }
    hoverIdx = scales.idxFromClientX(e.clientX);
    redraw();
  });
  ui.svg.addEventListener("mousedown", (e) => {
    if (activeLabel == null) {
      if (e.button !== 0) {
        return;
      }
      panState = {
        startClientX: e.clientX,
        baseRange: [...viewRange]
      };
      updateCursor();
      return;
    }
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg
    );
    const label = labels[activeLabel];
    const idx = scales.idxFromClientX(e.clientX);
    if (label.type === "point") {
      annotations.push({
        labelId: label.id,
        name: label.name,
        color: label.color,
        type: "point",
        value: idx
      });
      syncModel();
      redraw();
    } else {
      dragState = { labelId: label.id, startIdx: idx };
    }
  });
  ui.svg.addEventListener("mouseup", (e) => {
    if (panState) {
      panState = null;
      redraw();
      return;
    }
    if (!dragState) return;
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg
    );
    const endIdx = scales.idxFromClientX(e.clientX);
    const s = Math.min(dragState.startIdx, endIdx);
    const eIdx = Math.max(dragState.startIdx, endIdx);
    if (eIdx - s >= 2) {
      const label = labels[dragState.labelId];
      annotations.push({
        labelId: label.id,
        name: label.name,
        color: label.color,
        type: "range",
        value: [s, eIdx]
      });
      syncModel();
    }
    dragState = null;
    redraw();
  });
  ui.svg.addEventListener("mouseleave", () => {
    hoverIdx = null;
    dragState = null;
    panState = null;
    redraw();
  });
  ui.svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const scales = createScales(
        rawData,
        viewRange,
        width,
        CHART_HEIGHT,
        ui.svg
      );
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        const [s2, eR2] = viewRange;
        const range2 = eR2 - s2;
        if (range2 < rawData.length - 1) {
          const delta = Math.round(
            e.deltaX / Math.max(1, scales.plotW) * range2
          );
          shiftViewBy(delta);
          redraw();
        }
        return;
      }
      const [s, eR] = viewRange;
      const range = eR - s;
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const mouseIdx = scales.idxFromClientX(e.clientX);
      const frac = (mouseIdx - s) / range;
      const newRange = clamp(
        Math.round(range * factor),
        20,
        rawData.length - 1
      );
      let ns = Math.round(mouseIdx - frac * newRange);
      let ne = ns + newRange;
      if (ns < 0) {
        ns = 0;
        ne = newRange;
      }
      if (ne >= rawData.length) {
        ne = rawData.length - 1;
        ns = ne - newRange;
      }
      viewRange = [Math.max(0, ns), ne];
      redraw();
    },
    { passive: false }
  );
  const keyHandler = (e) => {
    if (e.key === "Escape") {
      activeLabel = null;
      dragState = null;
      panState = null;
      updateButtons(ui.labelBtns, labels, activeLabel);
      redraw();
      return;
    }
    if (activeLabel == null && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const [s, eR] = viewRange;
      const range = eR - s;
      if (range < rawData.length - 1) {
        const step = Math.max(1, Math.round(range * 0.1));
        shiftViewBy(e.key === "ArrowLeft" ? -step : step);
        redraw();
      }
    }
  };
  document.addEventListener("keydown", keyHandler);
  redraw();
  const handleModelChange = (e) => {
    if (e.name === "data_json" || e.name === "labels_json" || e.name === "sample_rate" || e.name === "x_label" || e.name === "y_label") {
      viewRange = [0, rawData.length - 1];
      activeLabel = null;
      dragState = null;
      hoverIdx = null;
      redraw();
    }
  };
  model.on("change", handleModelChange);
  return () => {
    model.off("change", handleModelChange);
    resizeObs.disconnect();
    document.removeEventListener("keydown", keyHandler);
  };
}
var widget_default = { render };
export {
  widget_default as default,
  render
};
