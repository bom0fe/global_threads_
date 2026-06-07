// Year/month timeline slider with an options panel for view-mode toggles.
import { useState, useRef, useCallback, useEffect } from "react";
import "./Timelineslider.css";

const MIN_YEAR = 2019;
const MAX_YEAR = 2026;
const YEARS    = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Convert (year, month) to a slider index based on the current mode.
function toIndex(year, month, mode) {
  if (mode === "yearly") return year - MIN_YEAR;
  return (year - MIN_YEAR) * 12 + (month - 1);
}
function fromIndex(idx, mode) {
  if (mode === "yearly") {
    return { year: MIN_YEAR + idx, month: 1 };
  }
  return { year: MIN_YEAR + Math.floor(idx / 12), month: (idx % 12) + 1 };
}
// Upper bound of the slider track; monthly mode caps at April 2026.
function maxIndex(mode) {
  if (mode === "yearly") return YEARS.length - 1;
  return toIndex(2026, 4, "monthly");
}

export default function TimelineSlider({ onChange, colorMode, onColorModeChange }) {
  const [mode,       setMode]       = useState("yearly");
  const [sliderIdx,  setSliderIdx]  = useState(0);
  const [optionOpen, setOptionOpen] = useState(false);

  const trackRef  = useRef(null);
  const isDragging = useRef(false);

  const max = maxIndex(mode);
  const { year, month } = fromIndex(sliderIdx, mode);

  // Keep the cursor pointing at the same date when switching yearly/monthly.
  const switchMode = (newMode) => {
    const { year: y, month: m } = fromIndex(sliderIdx, mode);
    setSliderIdx(toIndex(y, newMode === "monthly" ? m : 1, newMode));
    setMode(newMode);
    setOptionOpen(false);
  };

  // Translate a pointer X coordinate into a slider index.
  const posToIdx = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * max);
  }, [max]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setSliderIdx(posToIdx(e.clientX));
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    setSliderIdx(posToIdx(e.clientX));
  };
  const onPointerUp = () => { isDragging.current = false; };

  // Keyboard nudging.
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft")  setSliderIdx((v) => Math.max(0, v - 1));
    if (e.key === "ArrowRight") setSliderIdx((v) => Math.min(max, v + 1));
  };

  // Bubble the current period up to the parent.
  useEffect(() => {
    onChange?.({ year, month, mode });
  }, [year, month, mode, onChange]);

  // Build tick marks (full years in yearly mode, every month in monthly mode).
  const ticks = mode === "yearly"
    ? YEARS.map((y, i) => ({ idx: i, label: String(y) }))
    : YEARS.flatMap((y, yi) =>
        MONTHS.map((m, mi) => {
          const idx = yi * 12 + mi;
          if (idx > max) return null;
          return {
            idx,
            label: mi === 0 ? String(y) : (mi === 6 ? "Jul" : ""),
            minor: mi !== 0,
          };
        }).filter(Boolean)
      );

  const pct = (sliderIdx / max) * 100;

  const displayLabel = mode === "yearly"
    ? String(year)
    : `${year} ${MONTHS[month - 1]}`;

  return (
    <div className="tls-root">
      {/* Options popover (color mode + yearly/monthly switch) */}
      <div className="tls-option-wrap">
        <button
          className={`tls-option-btn ${optionOpen ? "open" : ""}`}
          onClick={() => setOptionOpen((v) => !v)}
          title="View options"
        >
          <span className="tls-option-icon">⋮⋮</span>
          <span>Options</span>
        </button>

        {optionOpen && (
          <div className="tls-option-panel">
            <p className="tls-panel-title">Timeline Mode</p>
            <div className="tls-toggle-row" onClick={() => onColorModeChange?.(colorMode === 'volatility' ? 'commodity' : 'volatility')}>
              <span className="tls-toggle-label">Volatility view</span>
              <span className={`tls-switch ${colorMode === 'volatility' ? "on" : ""}`}>
                <span className="tls-thumb" />
              </span>
            </div>
            <div className="tls-toggle-row" onClick={() => switchMode("yearly")}>
              <span className="tls-toggle-label">Yearly view</span>
              <span className={`tls-switch ${mode === "yearly" ? "on" : ""}`}>
                <span className="tls-thumb" />
              </span>
            </div>
            <div className="tls-toggle-row" onClick={() => switchMode("monthly")}>
              <span className="tls-toggle-label">Monthly view</span>
              <span className={`tls-switch ${mode === "monthly" ? "on" : ""}`}>
                <span className="tls-thumb" />
              </span>
            </div>
            <div className="tls-divider" />
            <div className="tls-info-row">
              <span className="tls-info-label">Current</span>
              <span className="tls-info-value">{displayLabel}</span>
            </div>
            <div className="tls-info-row">
              <span className="tls-info-label">Range</span>
              <span className="tls-info-value">2019 – 2026</span>
            </div>
          </div>
        )}
      </div>

      {/* Track + handle */}
      <div className="tls-center">
        <div className="tls-current-label">{displayLabel}</div>
        <div
          className="tls-track-wrap"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Timeline"
          role="slider"
          aria-valuenow={sliderIdx}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div className="tls-track">
            <div className="tls-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="tls-ticks">
            {ticks.map((t) => (
              <div
                key={t.idx}
                className={`tls-tick ${t.minor ? "minor" : "major"} ${t.idx === sliderIdx ? "active" : ""}`}
                style={{ left: `${(t.idx / max) * 100}%` }}
                onClick={(e) => { e.stopPropagation(); setSliderIdx(t.idx); }}
              >
                {t.label && <span className="tls-tick-label">{t.label}</span>}
              </div>
            ))}
          </div>
          <div
            className="tls-handle"
            style={{ left: `${pct}%` }}
          >
            <div className="tls-handle-inner" />
            <div className="tls-handle-tooltip">{displayLabel}</div>
          </div>
        </div>

        {/* Year-label row for clickable year jumps */}
        {mode === "yearly" && (
          <div className="tls-year-labels">
            {YEARS.map((y, i) => (
              <div
                key={y}
                className={`tls-year-label ${year === y ? "active" : ""}`}
                style={{ left: `${(i / (YEARS.length - 1)) * 100}%` }}
                onClick={() => setSliderIdx(i)}
              >
              </div>
            ))}
          </div>
        )}

        {/* Year ruler shown above the monthly slider */}
        {mode === "monthly" && (
          <div className="tls-month-range">
            {YEARS.map((y, yi) => (
              <div
                key={y}
                className={`tls-month-year-label ${year === y ? "active" : ""}`}
                style={{ left: `${(yi / (YEARS.length - 1)) * 100}%` }}
              >
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Y/M quick-switch chips */}
      <div className="tls-mode-chip-wrap">
        <button
          className={`tls-mode-chip ${mode === "yearly" ? "active" : ""}`}
          onClick={() => switchMode("yearly")}
        >Y</button>
        <button
          className={`tls-mode-chip ${mode === "monthly" ? "active" : ""}`}
          onClick={() => switchMode("monthly")}
        >M</button>
      </div>
    </div>
  );
}
