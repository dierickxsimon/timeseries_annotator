/**
 * widget.js — anywidget ESM entry point for ts-annotator.
 *
 * Reads model traitlets: data_json, labels_json, sample_rate, x_label, y_label
 * Writes back: annotations_json
 *
 * All rendering, scaling, and UI logic is delegated to submodules.
 * This file handles state management and event wiring.
 */

import { TOKENS as T } from "./tokens.js";
import { clamp } from "./utils.js";
import { createScales } from "./scales.js";
import { drawChart } from "./renderer.js";
import { computeOutput } from "./state.js";
import {
  buildUI,
  updateButtons,
  updateStatus,
  drawAnnotationList,
} from "./ui.js";

const CHART_HEIGHT = 300;

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
      const points = Array.isArray(labelOutput.value)
        ? labelOutput.value
        : [labelOutput.value];

      points.forEach((point) => {
        if (Number.isFinite(point)) {
          annotations.push({
            labelId: label.id,
            name: label.name,
            color: label.color,
            type: "point",
            value: Math.round(point),
          });
        }
      });
      return;
    }

    const ranges =
      Array.isArray(labelOutput.value) && Array.isArray(labelOutput.value[0])
        ? labelOutput.value
        : [labelOutput.value];

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
          value: [Math.min(start, end), Math.max(start, end)],
        });
      }
    });
  });

  return annotations;
}

export function render(context, maybeEl) {
  let model = null;
  let el = null;

  if (
    context &&
    typeof context === "object" &&
    "model" in context &&
    "el" in context
  ) {
    model = context.model;
    el = context.el;
  } else if (context && maybeEl) {
    model = context;
    el = maybeEl;
  }

  // Some hosts may probe render() without args while validating modules.
  if (!model || !el) {
    return () => {};
  }

  // ── Parse model data ──────────────────────────────────────
  const rawData = JSON.parse(model.get("data_json"));
  const labelConfigs = JSON.parse(model.get("labels_json"));
  const sampleRate = model.get("sample_rate") || 1;
  const xLabel = model.get("x_label") || "Sample";
  const yLabel = model.get("y_label") || "Value";

  const labels = labelConfigs.map((l, i) => ({ ...l, id: i }));

  // ── Mutable state ─────────────────────────────────────────
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

  // ── Clear previous content ─────────────────────────────────
  el.innerHTML = "";

  // ── Build DOM ─────────────────────────────────────────────
  const ui = buildUI(el, labels, rawData.length);

  // ── Label button click handlers ───────────────────────────
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

  // ── Resize observer ───────────────────────────────────────
  const resizeObs = new ResizeObserver((entries) => {
    width = Math.max(400, entries[0].contentRect.width);
    redraw();
  });
  resizeObs.observe(ui.svgContainer);

  // ── Cursor ────────────────────────────────────────────────
  function updateCursor() {
    if (activeLabel != null) {
      ui.svg.style.cursor =
        labels[activeLabel].type === "point" ? "crosshair" : "col-resize";
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

  // ── Sync to model ─────────────────────────────────────────
  function syncModel() {
    const output = computeOutput(labels, annotations);
    model.set("annotations_json", JSON.stringify(output));
    model.save_changes();
  }

  // ── Redraw ────────────────────────────────────────────────
  function redraw() {
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg,
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
      yLabel,
    });

    updateStatus(ui.status, labels, activeLabel, hoverIdx, rawData);
    updateCursor();

    drawAnnotationList(ui.annoContainer, annotations, (idx) => {
      annotations.splice(idx, 1);
      syncModel();
      redraw();
    });
  }

  // ── SVG event handlers ────────────────────────────────────
  ui.svg.addEventListener("mousemove", (e) => {
    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg,
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
        baseRange: [...viewRange],
      };
      updateCursor();
      return;
    }

    const scales = createScales(
      rawData,
      viewRange,
      width,
      CHART_HEIGHT,
      ui.svg,
    );
    const label = labels[activeLabel];
    const idx = scales.idxFromClientX(e.clientX);

    if (label.type === "point") {
      annotations.push({
        labelId: label.id,
        name: label.name,
        color: label.color,
        type: "point",
        value: idx,
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
      ui.svg,
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
        value: [s, eIdx],
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
        ui.svg,
      );

      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        const [s, eR] = viewRange;
        const range = eR - s;
        if (range < rawData.length - 1) {
          const delta = Math.round(
            (e.deltaX / Math.max(1, scales.plotW)) * range,
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
        rawData.length - 1,
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
    { passive: false },
  );

  // ── Keyboard ──────────────────────────────────────────────
  const keyHandler = (e) => {
    if (e.key === "Escape") {
      activeLabel = null;
      dragState = null;
      panState = null;
      updateButtons(ui.labelBtns, labels, activeLabel);
      redraw();
      return;
    }

    if (
      activeLabel == null &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
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

  // ── Initial draw ──────────────────────────────────────────
  redraw();

  // ── Listen for external model changes (Marimo reactivity) ──
  const handleModelChange = (e) => {
    // When inputs change from outside (parent re-runs), re-initialize
    if (
      e.name === "data_json" ||
      e.name === "labels_json" ||
      e.name === "sample_rate" ||
      e.name === "x_label" ||
      e.name === "y_label"
    ) {
      // Acknowledge the change by clearing state and triggering redraw
      viewRange = [0, rawData.length - 1];
      activeLabel = null;
      dragState = null;
      hoverIdx = null;
      redraw();
    }
  };

  model.on("change", handleModelChange);

  // ── Cleanup (anywidget lifecycle) ─────────────────────────
  return () => {
    model.off("change", handleModelChange);
    resizeObs.disconnect();
    document.removeEventListener("keydown", keyHandler);
  };
}

// Canonical anywidget module shape for strict validators.
export default { render };
