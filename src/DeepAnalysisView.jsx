// 3D globe view: deep-dive trade flows, GDELT events, and country detail panel.
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Globe from "react-globe.gl";
import MultiSelectDropdown from "./MultiSelectDropdown";
import TimelineSlider from "./Timelineslider";
import "./DeepAnalysisView.css";

import {
  KOREA,
  COMMODITIES,
  useTradeData,
  filterByPeriod,
  totalByCountry,
} from "./tradedata";
import { useEventData, eventColor, eventIcon } from "./useEventData";

const COMMODITY_MAP = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));

// Convert "#rrggbb" + alpha to an rgba() string.
const hexRgba = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export default function DeepAnalysisView({ onBack }) {
  const globeEl = useRef();
  // Trade rows loaded from the CSV; countries derived from it.
  const { records: TRADE_RECORDS, countries: COUNTRIES, loading: tradeLoading, error: tradeError } = useTradeData("/data/global_threads_timeseries_uiv_2.csv");

  // Filter state (time, commodity, country, region, selection, panel/UI flags).
  const [period,           setPeriod]          = useState({ year: 2019, month: 1, mode: "yearly" });
  const [activeTypes,      setActiveTypes]      = useState(new Set());
  const [activeCountries,  setActiveCountries]  = useState(new Set());
  const [activeRegion,     setActiveRegion]     = useState(null);
  const [selectedCountry,  setSelectedCountry]  = useState(null);
  const [rightOpen,        setRightOpen]        = useState(true);
  const [isLoaded,         setIsLoaded]         = useState(false);
  const showEvents = true;
  // Arc coloring mode: "commodity" uses the commodity accent, "volatility" uses risk score.
  const [colorMode,       setColorMode]      = useState('commodity');
  const [riskData,        setRiskData]       = useState({});

  // GDELT event records for the active period.
  const { events: rawEvents } = useEventData(period);

  const COUNTRY_MAP = useMemo(
    () => Object.fromEntries(COUNTRIES.map((c) => [c.id, c])),
    [COUNTRIES]
  );
  const REGIONS = useMemo(
    () => [...new Set(COUNTRIES.map((c) => c.region))].sort(),
    [COUNTRIES]
  );

  // Initial camera position over east Asia.
  useEffect(() => {
    if (globeEl.current)
      globeEl.current.pointOfView({ lat: 35, lng: 120, altitude: 2.2 }, 0);
  }, []);

  // Stagger the loaded class so initial CSS transitions fire.
  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Load the per-(country, HS) risk score table once.
  useEffect(() => {
    fetch('/data/global_threads_risk.csv')
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const map = {};
        lines.slice(1).forEach(line => {
          const cols = line.split(',');
          const country = cols[0].trim();
          const hsCode  = String(parseInt(cols[1].trim()));
          const score   = parseFloat(cols[2]);
          map[`${country}__${hsCode}`] = score;
        });
        setRiskData(map);
      });
  }, []);
  
  const commodityItems = useMemo(
    () => COMMODITIES.map((c) => ({ id: c.id, label: c.name, sub: `HS ${c.hs}`, color: c.accent })),
    []
  );
  const countryItems = useMemo(
    () => COUNTRIES.map((c) => ({ id: c.id, label: c.name, sub: c.region, color: null })),
    [COUNTRIES]
  );

  // Restrict trade rows to the current time period and active filters.
  const periodRecords = useMemo(
    () => filterByPeriod(TRADE_RECORDS, period),
    [TRADE_RECORDS, period]
  );
  const filteredRecords = useMemo(
    () => periodRecords.filter(
      (r) => activeTypes.has(r.commodityId) && activeCountries.has(r.countryId)
    ),
    [periodRecords, activeTypes, activeCountries]
  );

  const countryTotals = useMemo(() => totalByCountry(filteredRecords), [filteredRecords]);

  const periodTotals = useMemo(() => {
    let exp = 0, imp = 0;
    filteredRecords.forEach((r) => {
      if (r.direction === "export") exp += r.value;
      else imp += r.value;
    });
    return { export: +exp.toFixed(0), import: +imp.toFixed(0) };
  }, [filteredRecords]);

  // Map a 1–10 risk score to a traffic-light color with the requested opacity.
  const riskToColor = (score, opacity) => {
    if (!score || isNaN(score)) return `rgba(120,120,120,${opacity * 0.4})`;
    const t = (score - 1) / 9;
    if (t < 0.33) return `rgba(56,  189, 248, ${opacity})`;
    if (t < 0.66) return `rgba(255, 165, 0,   ${opacity})`;
    return                `rgba(220, 50,  50,  ${opacity})`;
  };

  // Points to draw on the globe (Korea hub + each active partner sized by total trade).
  const pointsData = useMemo(() => {
    const maxTrade = Math.max(...Object.values(countryTotals), 1);
    return [
      { id: "korea", lat: KOREA.lat, lng: KOREA.lng, name: KOREA.name, isKorea: true, total: 0, radius: 1.8 },
      ...COUNTRIES
        .filter((c) => activeCountries.has(c.id) && (countryTotals[c.id] ?? 0) > 0)
        .map((c) => ({
          ...c,
          total: countryTotals[c.id] ?? 0,
          radius: 0.25 + ((countryTotals[c.id] ?? 0) / maxTrade) * 1.8,
        })),
    ];
  }, [countryTotals, activeCountries, COUNTRIES]);

  // Aggregate routes by (country, commodity, direction); each commodity gets a small
  // lat/lng offset so multi-commodity arcs to the same partner do not overlap.
  const arcsData = useMemo(() => {
    const aggMap = {};
    filteredRecords.forEach(({ countryId, commodityId, direction, value }) => {
      const key = `${countryId}__${commodityId}__${direction}`;
      aggMap[key] = (aggMap[key] ?? 0) + value;
    });
    const maxPerCommodity = {};
    Object.entries(aggMap).forEach(([key, total]) => {
      const commodityId = key.split("__")[1];
      if (!maxPerCommodity[commodityId] || total > maxPerCommodity[commodityId]) {
        maxPerCommodity[commodityId] = total;
      }
    });
    return Object.entries(aggMap).map(([key, total]) => {
      const [countryId, commodityId, direction] = key.split("__");
      const country   = COUNTRY_MAP[countryId];
      const commodity = COMMODITY_MAP[commodityId];
      if (!country || !commodity) return null;
      const isExport = direction === "export";
      const commodityIndex = COMMODITIES.findIndex(c => c.id === commodityId);
      const angle  = (commodityIndex / COMMODITIES.length) * 2 * Math.PI;
      const offset = 0.8;
      const latOff = offset * Math.cos(angle);
      const lngOff = offset * Math.sin(angle);
      return {
        key, countryId, commodityId, direction,
        startLat: isExport ? KOREA.lat   : country.lat + latOff,
        startLng: isExport ? KOREA.lng   : country.lng + lngOff,
        endLat:   isExport ? country.lat + latOff : KOREA.lat,
        endLng:   isExport ? country.lng + lngOff : KOREA.lng,
        color:    commodity.accent,
        value:    total,
        normVal: total / (maxPerCommodity[commodityId] || 1),
        countryName:   country.name,
        commodityName: commodity.name,
      };
    }).filter(Boolean);
  }, [filteredRecords, COUNTRY_MAP]);

  // Event markers placed on the globe (only events with valid coordinates).
  const htmlData = useMemo(() => {
    if (!showEvents || rawEvents.length === 0) return [];
    return rawEvents
      .filter((item) => item.event?.lat && item.event?.lng)
      .map((item) => ({
        lat:       item.event.lat,
        lng:       item.event.lng,
        color:     eventColor(item.event.event_polarity, item.event.goldstein ?? 0),
        icon:      eventIcon(item.event.event_polarity),
        label:     item.event.event_label ?? "",
        sourceUrl: item.event.source_url ?? item.gkg?.article_url ?? "",
        country:   item.event.location_name ?? item.event.location_country ?? "",
        polarity:  item.event.event_polarity ?? "neutral",
        goldstein: item.event.goldstein ?? 0,
        mentions:  item.event.num_mentions ?? 1,
        products:  item.event.url_detected_products ?? [],
        tone:      item.gkg?.tone ?? 0,
        themes:    item.gkg?.detected_themes ?? [],
        date:      item.event.event_date ?? "",
      }));
  }, [rawEvents, showEvents]);

  // Per-commodity totals for the country shown in the right detail panel.
  const selectedTrade = useMemo(() => {
    if (!selectedCountry) return null;
    const recs = filteredRecords.filter((r) => r.countryId === selectedCountry.id);
    const map = {};
    recs.forEach(({ commodityId, direction, value }) => {
      if (!map[commodityId]) map[commodityId] = { export: 0, import: 0 };
      map[commodityId][direction] += value;
    });
    return map;
  }, [selectedCountry, filteredRecords]);

  // Top six partners by total trade for the active filters.
  const topPartners = useMemo(() =>
    [...COUNTRIES]
      .filter((c) => (countryTotals[c.id] ?? 0) > 0)
      .sort((a, b) => (countryTotals[b.id] ?? 0) - (countryTotals[a.id] ?? 0))
      .slice(0, 6),
  [countryTotals, COUNTRIES]);
  const maxPartnerVal = topPartners[0] ? (countryTotals[topPartners[0].id] ?? 1) : 1;

  // Zoom in on a clicked point and open the detail panel.
  const handlePointClick = useCallback((pt) => {
    if (pt.isKorea) return;
    const country = COUNTRY_MAP[pt.id];
    if (!country) return;
    setSelectedCountry(country);
    setRightOpen(true);
    globeEl.current?.pointOfView({ lat: pt.lat, lng: pt.lng, altitude: 1.6 }, 800);
  }, [COUNTRY_MAP]);

  const handleRegionClick = (region) => {
    const next = activeRegion === region ? null : region;
    setActiveRegion(next);
    if (next) setActiveCountries(new Set(COUNTRIES.filter((c) => c.region === next).map((c) => c.id)));
    else      setActiveCountries(new Set(COUNTRIES.map((c) => c.id)));
  };

  const toggleType = (id) =>
    setActiveTypes((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const periodLabel = period.mode === "monthly"
    ? `${period.year} / ${String(period.month).padStart(2, "0")}`
    : String(period.year);

  const STATS = [
    { label: "Countries",   value: activeCountries.size },
    { label: "Commodities", value: activeTypes.size     },
    { label: "Routes",      value: arcsData.length      },
   { label: "Total Import", value: `${(periodTotals.import / 1e6).toFixed(1)}M` },
  ];

  // Loading / error guards.
  if (tradeLoading) return (
    <div className="app-loading">
      <div className="loading-spinner" />
      <p>Loading trade data…</p>
      <span>/trade_data.csv</span>
    </div>
  );
  if (tradeError) return (
    <div className="app-loading app-error">
      <div className="error-icon">⚠</div>
      <p>Failed to load CSV</p>
      <span>{tradeError}</span>
      <small>Please check public/trade_data.csv.</small>
    </div>
  );

  return (
    <div className={`app-shell ${isLoaded ? "loaded" : ""}`}>
      {/* Globe stage with points, arcs, and HTML event markers */}
      <main className="globe-stage">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          // Country markers
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d) => d.isKorea ? "#22d3ee" : selectedCountry?.id === d.id ? "#ffffff" : "#22d3ee"}
          pointAltitude={0.01}
          pointRadius={(d) => d.radius}
          pointResolution={32}
          pointLabel={(d) =>
            d.isKorea
              ? `<div class="globe-tooltip"><strong>🇰🇷 South Korea</strong><br/><span style="opacity:.7">Trade Hub · ${periodLabel}</span></div>`
              : `<div class="globe-tooltip">
                  <strong>${d.name}</strong><br/>
                  Import: <span style="color:#22d3ee">${(d.total ?? 0).toLocaleString()} kg</span><br/>
                  <span style="opacity:.6">${d.region}</span>
                </div>`
          }
          onPointClick={handlePointClick}
          // Trade flow arcs
          arcsData={arcsData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={(d) => {
            if (colorMode === 'volatility') {
              const hsCode = String(parseInt(COMMODITY_MAP[d.commodityId]?.hs ?? '0'));
              const key    = `${d.countryName}__${hsCode}`;
              const score  = riskData[key];
              const op     = 0.6 + d.normVal * 0.35;
              const c      = riskToColor(score, op);
              return [c, c, c];
            }
            return [
              hexRgba(d.color, 0.4),
              hexRgba(d.color, 0.45 + d.normVal * 0.7),
              hexRgba(d.color, 0.45),
            ];
          }}
          arcAltitude={(d) => {
            const toRad = deg => (deg * Math.PI) / 180;
            const lat1 = toRad(d.startLat), lat2 = toRad(d.endLat);
            const dLat = lat2 - lat1;
            const dLng = toRad(d.endLng - d.startLng);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
            const normDist = (2 * Math.asin(Math.sqrt(a))) / Math.PI; 
            return 0.08 + normDist * 0.5 + d.normVal * 0.1;
          }}
          arcStroke={(d) => 0.2 + d.normVal * 1.0}
          arcDashLength={0.1}
          arcDashGap={0.005}
          arcDashAnimateTime={(d) => {
            const toRad = deg => (deg * Math.PI) / 180;
            const lat1 = toRad(d.startLat), lat2 = toRad(d.endLat);
            const dLat = lat2 - lat1;
            const dLng = toRad(d.endLng - d.startLng);
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
            const normDist = Math.max(0.1, (2 * Math.asin(Math.sqrt(a))) / Math.PI);
            const speedFactor = 0.2 + (1 - d.normVal) * 0.8; 
            return normDist * 500000 * speedFactor;
          }}
          arcLabel={(d) => {
            const hsCode = String(parseInt(COMMODITY_MAP[d.commodityId]?.hs ?? '0'));
            const score  = riskData[`${d.countryName}__${hsCode}`];
            const scoreColor = !score || isNaN(score)
              ? '#94a3b8'
              : score < 4 ? '#60a5fa' : score < 7 ? '#fbbf24' : '#f87171';
            return `<div class="globe-tooltip">
              <strong>${d.direction === "export" ? "🇰🇷 → " : "→ 🇰🇷 "}${d.countryName}</strong><br/>
              ${d.commodityName} · <span style="color:#22d3ee">${d.value?.toLocaleString()} kg</span>
              <span style="opacity:.6;margin-left:6px">${d.direction}</span><br/>
                <span style="color:${scoreColor};font-size:10px">
                  ⚠ Risk: ${score ? score.toFixed(1) : 'N/A'} / 10
                </span>
            </div>`;
          }}
          atmosphereColor="#1a3a6b"
          atmosphereAltitude={0.18}
          enablePointerInteraction
          // HTML event markers + custom tooltip layer
          htmlElementsData={htmlData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.02}
          htmlElement={(d) => {
            const el = document.createElement("div");
            el.className = "event-marker";
            el.style.cssText = `
              width: 14px; height: 14px; border-radius: 50%;
              background: ${d.color};
              border: 2px solid rgba(0,0,0,0.5);
              box-shadow: 0 0 10px ${d.color}99, 0 0 3px ${d.color};
              cursor: pointer;
              transition: transform 0.12s;
              pointer-events: auto;
            `;
            // Single shared tooltip element reused across all markers.
            const TOOLTIP_ID = "__event_global_tip__";
            const getOrCreateTip = () => {
              let tip = document.getElementById(TOOLTIP_ID);
              if (!tip) {
                tip = document.createElement("div");
                tip.id = TOOLTIP_ID;
                tip.style.cssText = `
                  position: fixed;
                  display: none;
                  z-index: 99999;
                  background: rgba(5,12,26,0.97);
                  border-radius: 10px;
                  padding: 12px 14px;
                  font-family: 'IBM Plex Mono', monospace;
                  font-size: 12px;
                  color: #f8fafc;
                  max-width: 300px;
                  min-width: 200px;
                  pointer-events: none;
                  box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                  line-height: 1.5;
                  white-space: normal;
                  word-break: break-word;
                `;
                document.body.appendChild(tip);
              }
              return tip;
            };

            const positionTip = (tip, e) => {
              const pad = 14;
              const tw  = tip.offsetWidth  || 260;
              const th  = tip.offsetHeight || 160;
              let x = e.clientX + pad;
              let y = e.clientY - th / 2;
              if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - pad;
              if (y < 8)                            y = 8;
              if (y + th > window.innerHeight - 8)  y = window.innerHeight - th - 8;
              tip.style.left = x + "px";
              tip.style.top  = y + "px";
            };

            el.addEventListener("mouseenter", (e) => {
              el.style.transform = "scale(2)";
              const tip = getOrCreateTip();
              tip.style.border = `1px solid ${d.color}`;
              tip.innerHTML = `
                <div style="color:${d.color};font-weight:700;font-size:12px;margin-bottom:5px">
                  ${d.icon} ${d.polarity.toUpperCase()}
                </div>
                <div style="color:#cbd5e1;font-size:11px;margin-bottom:4px">${d.date} · ${d.country}</div>
                <div style="margin-bottom:8px;font-size:12px;line-height:1.5;color:#f8fafc">${d.label}</div>
                ${d.products.length
                  ? `<div style="margin-bottom:5px;color:#22d3ee;font-size:11px;letter-spacing:.03em">
                       🏭 ${d.products.join(" · ")}
                     </div>`
                  : ""}
                <div style="color:#94a3b8;font-size:11px;margin-bottom:${d.sourceUrl ? "8px" : "0"}">
                  Goldstein ${d.goldstein >= 0 ? "+" : ""}${d.goldstein.toFixed(1)}
                  &nbsp;·&nbsp; ${d.mentions} mentions
                  &nbsp;·&nbsp; tone ${d.tone >= 0 ? "+" : ""}${d.tone.toFixed(2)}
                </div>
                ${d.sourceUrl
                  ? `<div style="border-top:1px solid rgba(255,255,255,.08);padding-top:7px;margin-top:2px">
                       <a href="${d.sourceUrl}" target="_blank" rel="noopener"
                         style="color:#60a5fa;font-size:11px;text-decoration:none;display:block;
                                overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                                max-width:270px">
                         🔗 ${d.sourceUrl}
                       </a>
                       <div style="color:#94a3b8;font-size:10px;margin-top:3px">click marker to open</div>
                     </div>`
                  : ""}
              `;
              positionTip(tip, e);
              tip.style.display = "block";
            });

            el.addEventListener("mousemove", (e) => {
              const tip = document.getElementById(TOOLTIP_ID);
              if (tip) positionTip(tip, e);
            });

            el.addEventListener("mouseleave", () => {
              el.style.transform = "scale(1)";
              const tip = document.getElementById(TOOLTIP_ID);
              if (tip) tip.style.display = "none";
            });

            el.addEventListener("click", (e) => {
              e.stopPropagation();
              const tip = document.getElementById(TOOLTIP_ID);
              if (tip) tip.style.display = "none";
              if (d.sourceUrl) window.open(d.sourceUrl, "_blank", "noopener");
            });

            return el;
          }}
        />
      </main>

      {/* Top filter bar (commodity / country pickers) */}
      <div className="top-filter-bar">
        <div className="period-chip">
          <span className="period-dot" />{periodLabel}
        </div>
        <MultiSelectDropdown label="Commodity" items={commodityItems} selected={activeTypes} onChange={setActiveTypes} />
        <MultiSelectDropdown label="Country"   items={countryItems}   selected={activeCountries} onChange={setActiveCountries} />
      </div>

      {/* Bottom timeline slider */}
      <TimelineSlider onChange={setPeriod}
        colorMode={colorMode}
        onColorModeChange={setColorMode} />

      {/* Left panel: period summary, regions, routes, statistics, top partners */}
      <aside className="panel panel-left">
        <div className="panel-header">
          <button
            className="dav-back-btn"
            onClick={() => onBack?.()}
            title="Back to Dashboard"
          >
            ← Overview
          </button>
          <div className="panel-logo">
            <span className="logo-icon">◉</span>
            <span className="logo-text">Global Threads</span>
          </div>
        </div>

        {/* Period summary */}
        <div className="panel-section">
          <h3 className="section-label">PERIOD · {periodLabel}</h3>
          <div className="summary-grid">
            <div className="summary-card import-card" style={{ gridColumn: "1 / -1" }}>
              <span className="summary-dir">↓ Total Import</span>
              <span className="summary-val">{(periodTotals.import / 1e6).toFixed(2)}</span>
              <span className="summary-unit">Million kg</span>
            </div>
          </div>
          <div className="balance-row">
            <span className="balance-label">Active Routes</span>
            <span className="balance-val pos">{arcsData.length}</span>
          </div>
        </div>

        {/* Region quick-filter */}
        <div className="panel-section">
          <h3 className="section-label">REGIONS</h3>
          <ul className="region-list">
            {REGIONS.map((r) => (
              <li key={r} className={`region-item ${activeRegion === r ? "active" : ""}`}
                onClick={() => handleRegionClick(r)}>
                <span className="region-dot" />
                <span className="region-name">{r}</span>
                <span className="region-arrow">{COUNTRIES.filter((c) => c.region === r).length}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Commodity toggles */}
        <div className="panel-section">
          <h3 className="section-label">TRADE ROUTES</h3>
          <ul className="trade-list">
            {COMMODITIES.map((t) => {
              const on = activeTypes.has(t.id);
              return (
                <li key={t.id} className={`trade-item ${on ? "on" : "off"}`} onClick={() => toggleType(t.id)}>
                  <span className="trade-swatch" style={{ background: t.accent, boxShadow: on ? `0 0 8px ${t.accent}` : "none" }} />
                  <span className="trade-name">{t.name}</span>
                  <span className="trade-hs">HS {t.hs}</span>
                  <span className="trade-toggle">{on ? "●" : "○"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Aggregate statistics */}
        <div className="panel-section">
          <h3 className="section-label">STATISTICS</h3>
          <div className="stats-grid">
            {STATS.map((s) => (
              <div className="stat-card" key={s.label}>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top trading partners */}
          <div className="panel-section">
            <h3 className="section-label">TOP PARTNERS</h3>
            <div className="top-partners">
              {topPartners.map((c, i) => {
                const val = countryTotals[c.id] ?? 0;
                return (
                  <div key={c.id}
                    className={`partner-row ${selectedCountry?.id === c.id ? "active" : ""}`}
                    onClick={() => { setSelectedCountry(c); setRightOpen(true); globeEl.current?.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.6 }, 700); }}>
                    <span className="partner-rank">{i + 1}</span>
                    <span className="partner-name">{c.name}</span>
                    <div className="partner-bar-bg">
                      <div className="partner-bar-fill" style={{ width: `${(val / maxPartnerVal) * 100}%` }} />
                    </div>
                    <span className="partner-val">{(val / 1e6).toFixed(1)}M</span>
                  </div>
                );
              })}
            </div>
          </div>

        <div className="panel-footer">
          <button className="reset-btn" onClick={() => {
            setSelectedCountry(null); setActiveRegion(null);
            setActiveTypes(new Set(COMMODITIES.map((c) => c.id)));
            setActiveCountries(new Set(COUNTRIES.map((c) => c.id)));
            globeEl.current?.pointOfView({ lat: 35, lng: 120, altitude: 2.2 }, 800);
          }}>↺ Reset View</button>
        </div>
      </aside>

      {/* Right panel collapse toggle */}
      <button
        className={`right-toggle-btn ${rightOpen ? "is-open" : ""}`}
        onClick={() => setRightOpen((v) => !v)}
      >{rightOpen ? "›" : "‹"}</button>

      {/* Right panel: country detail / commodity breakdown */}
      <aside className={`panel panel-right ${rightOpen ? "panel-right--open" : ""}`}>
        <div className="panel-header">
          <h2 className="panel-title">Trade Detail</h2>
          <p className="panel-subtitle">
            {selectedCountry ? selectedCountry.name : "Click a country marker"}
          </p>
        </div>

        {/* Detail body switches between selected country and empty state */}
        {selectedCountry && selectedTrade ? (
          <div className="city-detail">
            <div className="city-detail-header">
              <div className="city-pulse" />
              <div>
                <h2 className="city-name">{selectedCountry.name}</h2>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: ".04em" }}>
                  {selectedCountry.region}
                </span>
              </div>
            </div>

            <div className="city-meta">
              <div className="meta-row">
                <span className="meta-label">↓ Total Import</span>
                <span className="meta-value">
                  {Object.values(selectedTrade).reduce((s, v) => s + v.import, 0).toLocaleString()} kg
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Commodities</span>
                <span className="meta-value">{Object.keys(selectedTrade).length}</span>
              </div>
            </div>

            <div className="city-arcs">
              <h4 className="section-label">COMMODITY BREAKDOWN</h4>
              <ul className="arc-list">
                {Object.entries(selectedTrade)
                  .sort(([,a],[,b]) => (b.export+b.import)-(a.export+a.import))
                  .map(([comId, vals]) => {
                    const com = COMMODITY_MAP[comId];
                    if (!com) return null;
                    const maxVal = Math.max(...Object.values(selectedTrade).map(v=>v.export+v.import),1);
                    const total  = vals.export + vals.import;
                    return (
                      <li key={comId} style={{ marginBottom: 10, listStyle: "none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                          <span className="arc-swatch" style={{ background:com.accent, boxShadow:`0 0 5px ${com.accent}` }} />
                          <span className="arc-peer" style={{ flex:1 }}>{com.name}</span>
                          <span style={{ fontSize:11, color:"#22d3ee", fontFamily:"var(--font-mono)" }}>{(total/1e3).toFixed(1)}t</span>
                        </div>
                        {vals.import > 0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:10.5, width:28, color:"#f87171", fontFamily:"var(--font-mono)", flexShrink:0 }}>IMP</span>
                            <div className="rank-bar-bg" style={{ flex:1 }}>
                              <div className="rank-bar-fill" style={{ width:`${(vals.import/maxVal)*100}%`, background:com.accent }} />
                            </div>
                            <span style={{ fontSize:10.5, width:54, textAlign:"right", color:"var(--text-dim)", fontFamily:"var(--font-mono)" }}>{(vals.import/1e3).toFixed(1)}t</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>

            <button className="clear-btn" onClick={() => setSelectedCountry(null)}>✕ Deselect</button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <p>Click a country to see trade details</p>
            <div className="city-list-preview">
              <h4 className="section-label">TOP PARTNERS</h4>
              {topPartners.slice(0,5).map((c) => (
                <div key={c.id} className="city-list-item"
                  onClick={() => { setSelectedCountry(c); setRightOpen(true); globeEl.current?.pointOfView({lat:c.lat,lng:c.lng,altitude:1.6},700); }}>
                  <span className="cli-dot" />
                  <span className="cli-name">{c.name}</span>
                  <span className="cli-pop">{((countryTotals[c.id]??0)/1e6).toFixed(1)}M kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel-section" style={{ marginTop: "auto" }}>
          <h3 className="section-label">VISIBLE</h3>
          <p className="visible-count">
            <strong>{activeCountries.size}</strong> countries ·{" "}
            <strong>{arcsData.length}</strong> routes
          </p>
          {activeRegion && (
            <p className="filter-badge">
              {activeRegion}
              <button onClick={() => { setActiveRegion(null); setActiveCountries(new Set(COUNTRIES.map((c)=>c.id))); }}>✕</button>
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
