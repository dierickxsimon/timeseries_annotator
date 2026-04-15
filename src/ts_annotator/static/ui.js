import { TOKENS as T } from "./tokens.js";

/**
 * Build the widget DOM structure (minimalistic version).
 *
 * Returns references to interactive elements so the main widget.js
 * can wire up event handlers and update them.
 */
export function buildUI(el, labels, sampleCount) {
  el.style.fontFamily = T.fontMono;
  el.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    background: ${T.bg}; color: ${T.text};
    padding: 12px; box-sizing: border-box; font-size: 13px;
  `;
  el.appendChild(wrapper);

  // Minimal label buttons bar
  const btnBar = document.createElement("div");
  btnBar.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;";
  wrapper.appendChild(btnBar);

  const labelBtns = labels.map((l) => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding:6px 12px;border-radius:4px;
      border:1px solid ${T.border};background:${T.surface};color:${T.text};
      font-family:${T.fontMono};font-size:12px;font-weight:500;
      cursor:pointer;outline:none;transition:all 0.15s;
    `;
    btn.textContent = l.name;
    btnBar.appendChild(btn);
    return btn;
  });

  // Spacer + reset button
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  btnBar.appendChild(spacer);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset Zoom";
  resetBtn.style.cssText = `
    padding:6px 12px;border-radius:4px;border:1px solid ${T.border};
    background:${T.surface};color:${T.text};
    font-family:${T.fontMono};font-size:12px;cursor:pointer;
  `;
  btnBar.appendChild(resetBtn);

  // Minimal status line
  const status = document.createElement("div");
  status.style.cssText = `
    font-size:11px;color:${T.textMuted};margin-bottom:8px;
    height:14px;font-family:${T.fontMono};min-height:14px;
  `;
  wrapper.appendChild(status);

  // SVG container
  const svgContainer = document.createElement("div");
  svgContainer.style.cssText = `
    background:${T.surface};border-radius:4px;
    border:1px solid ${T.border};overflow:hidden;
  `;
  wrapper.appendChild(svgContainer);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "display:block;user-select:none;";
  svgContainer.appendChild(svg);

  // Annotation list container
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
    resetBtn,
  };
}

/**
 * Update label button active states.
 */
export function updateButtons(labelBtns, labels, activeLabel) {
  labelBtns.forEach((btn, i) => {
    const l = labels[i];
    const active = activeLabel === i;
    btn.style.background = active ? l.color : T.surface;
    btn.style.color = active ? T.bg : T.text;
    btn.style.borderColor = active ? l.color : T.border;
  });
}

/**
 * Update the status line text (minimal version).
 */
export function updateStatus(statusEl, labels, activeLabel, hoverIdx, data) {
  let text = "";

  if (activeLabel != null) {
    const l = labels[activeLabel];
    const action = l.type === "point" ? "click" : "drag";
    text = `[${l.name}] ${action} · esc`;
  } else {
    text = "scroll to zoom";
  }

  if (hoverIdx != null && data[hoverIdx] != null) {
    text += ` · idx: ${hoverIdx}`;
  }

  statusEl.textContent = text;
}

/**
 * Render the annotation list below the chart (minimal version).
 */
export function drawAnnotationList(container, annotations, onRemove) {
  container.innerHTML = `
    <div style="font-size:11px;color:${T.textMuted};margin-bottom:6px;
      font-family:${T.fontMono};">
      Annotations (${annotations.length})
    </div>
  `;

  if (annotations.length === 0) {
    container.innerHTML += `
      <div style="padding:8px 12px;background:${T.surface};border-radius:4px;
        border:1px solid ${T.border};color:${T.textMuted};
        font-size:11px;font-family:${T.fontMono};">
        None
      </div>
    `;
    return;
  }

  const list = document.createElement("div");
  list.style.cssText = `
    background:${T.surface};border-radius:4px;border:1px solid ${T.border};
    max-height:150px;overflow-y:auto;font-size:11px;
  `;

  annotations.forEach((a, i) => {
    const row = document.createElement("div");
    row.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:4px 8px;
      font-family:${T.fontMono};
      ${i < annotations.length - 1 ? `border-bottom:1px solid ${T.border};` : ""}
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
    val.style.color = T.textMuted;
    val.textContent =
      a.type === "point" ? `${a.value}` : `[${a.value[0]}...${a.value[1]}]`;
    row.appendChild(val);

    const sp = document.createElement("div");
    sp.style.flex = "1";
    row.appendChild(sp);

    const rm = document.createElement("button");
    rm.textContent = "✕";
    rm.style.cssText = `
      background:none;border:none;color:${T.textMuted};
      cursor:pointer;font-size:13px;padding:0 4px;font-family:${T.fontMono};
    `;
    rm.addEventListener("click", () => onRemove(i));
    row.appendChild(rm);

    list.appendChild(row);
  });

  container.appendChild(list);
}
