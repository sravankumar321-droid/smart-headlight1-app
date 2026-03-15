/* ─────────────────────────────────────────
   SmartBeam — script.js
   Adaptive Headlight Control Logic
───────────────────────────────────────── */

// ── State ──────────────────────────────────────────────
const state = {
  brightness: 75,
  mode: "Auto",
  lux: null,
};

// ── DOM References ─────────────────────────────────────
const els = {
  brightness:   document.getElementById("brightness"),
  brightnessVal: document.getElementById("brightnessValue"),
  modeLabel:    document.getElementById("modeLabel"),
  lux:          document.getElementById("lux"),
  luxBar:       document.getElementById("luxBar"),
  luxCondition: document.getElementById("luxCondition"),
  beamOuter:    document.getElementById("beamOuter"),
  beamCore:     document.getElementById("beamCore"),
  dotL:         document.getElementById("dotL"),
  dotR:         document.getElementById("dotR"),
  logScroll:    document.getElementById("logScroll"),
};

// ── Brightness ─────────────────────────────────────────
els.brightness.oninput = function () {
  setBrightness(+this.value, /*log=*/true);
};

function setBrightness(value, log = false) {
  state.brightness = Math.max(0, Math.min(100, value));
  els.brightness.value = state.brightness;
  els.brightnessVal.innerText = state.brightness + "%";
  updateBeam();
  if (log) addLog(`Brightness set to ${state.brightness}%`);
}

// ── Mode ───────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;

  // Support legacy id="mode" or new id="modeLabel"
  const modeEl = els.modeLabel || document.getElementById("mode");
  if (modeEl) {
    modeEl.innerText = modeEl.id === "mode" ? "Mode: " + mode : mode;
  }

  // Toggle active class on mode buttons
  document.querySelectorAll("[data-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  updateBeam();
  addLog(`Mode switched → ${mode}`, "info");

  // Re-run auto-adjust if a lux reading is already available
  if (state.mode === "Auto" && state.lux !== null) autoAdjust(state.lux);
}

// ── Sensor ─────────────────────────────────────────────
function simulateSensor() {
  const lux = Math.floor(Math.random() * 1000);
  state.lux = lux;

  // Support legacy full-string format or new number-only display
  if (els.lux) {
    els.lux.innerText = els.lux.id === "lux" && els.luxCondition
      ? lux.toLocaleString()
      : "Lux Level: " + lux;
  }

  // Animate bar fill
  if (els.luxBar) {
    els.luxBar.style.width = Math.min(lux / 1000, 1) * 100 + "%";
  }

  // Classify and log
  const { label, type } = classifyLux(lux);
  if (els.luxCondition) els.luxCondition.innerText = label;
  addLog(`Sensor: ${lux} lux — ${label}`, type);

  // Auto-brightness
  if (state.mode === "Auto") autoAdjust(lux);
}

function classifyLux(lux) {
  if (lux < 50)  return { label: "Night / Dark",      type: "warn" };
  if (lux < 200) return { label: "Dusk / Dawn",       type: "warn" };
  if (lux < 600) return { label: "Overcast / Cloudy", type: "" };
  return          { label: "Bright Daylight",          type: "" };
}

// ── Auto Brightness Adjustment ─────────────────────────
function autoAdjust(lux) {
  // Invert lux: darker outside → headlights brighter
  const suggested = Math.max(10, Math.round((1 - lux / 1000) * 100));
  setBrightness(suggested);
  addLog(`Auto-adjusted brightness → ${suggested}%`, "info");
}

// ── Beam Visualizer ────────────────────────────────────
const MODE_MULTIPLIERS = {
  "Auto":      1.0,
  "High Beam": 1.35,
  "Low Beam":  0.6,
  "Fog":       0.35,
};

const MODE_COLORS = {
  "Auto":      "0,212,255",
  "High Beam": "180,220,255",
  "Low Beam":  "0,212,255",
  "Fog":       "255,190,40",
};

function updateBeam() {
  if (!els.beamOuter) return;

  const pct        = state.brightness / 100;
  const multiplier = MODE_MULTIPLIERS[state.mode] ?? 1.0;
  const color      = MODE_COLORS[state.mode] ?? "0,212,255";
  const intensity  = pct * multiplier;

  const outerAlpha = Math.min(intensity * 0.22, 0.22).toFixed(3);
  const coreAlpha  = Math.min(intensity * 0.28, 0.28).toFixed(3);
  const blurPx     = (2 + intensity * 4).toFixed(1);
  const dotGlow    = Math.round(intensity * 30);
  const dotColor   = state.mode === "Fog"
    ? `rgba(255,220,100,${(0.6 + intensity * 0.4).toFixed(2)})`
    : `rgba(200,230,255,${(0.7 + intensity * 0.3).toFixed(2)})`;

  els.beamOuter.style.borderBottomColor = `rgba(${color},${outerAlpha})`;
  els.beamCore.style.borderBottomColor  = `rgba(${color},${coreAlpha})`;
  els.beamOuter.style.filter            = `blur(${blurPx}px)`;

  [els.dotL, els.dotR].forEach(dot => {
    if (!dot) return;
    dot.style.background = dotColor;
    dot.style.boxShadow  =
      `0 0 ${dotGlow}px ${Math.round(dotGlow / 2)}px rgba(${color},0.7),` +
      `0 0 ${dotGlow * 2}px rgba(${color},0.2)`;
  });
}

// ── Event Log ──────────────────────────────────────────
function addLog(msg, type = "") {
  if (!els.logScroll) return;

  const time  = new Date().toTimeString().slice(0, 8);
  const entry = document.createElement("div");
  entry.className = `log-entry${type ? " log-" + type : ""}`;
  entry.innerHTML =
    `<span class="log-time">${time}</span>` +
    `<span class="log-msg">${msg}</span>`;

  els.logScroll.prepend(entry);

  // Cap log at 50 entries
  while (els.logScroll.children.length > 50) {
    els.logScroll.removeChild(els.logScroll.lastChild);
  }
}

// ── Init ───────────────────────────────────────────────
(function init() {
  setBrightness(state.brightness);
  setMode(state.mode);
  addLog("SmartBeam system initialized", "info");
  addLog(`Mode: ${state.mode} | Brightness: ${state.brightness}%`);
})();
