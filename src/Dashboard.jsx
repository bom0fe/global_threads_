// Top-level dashboard view: HS-code / country selectors, anomaly chart,
// historical event list, alternative-supplier scoring and trade map.
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { useTimeseriesData, detectAnomalyMonths } from "./useTimeseriesData";
import { useGdeltEvents }    from "./useGdeltEvents";
import { useAltCandidates }  from "./supplier_chart/useAltScores";
import { COUNTRY_GEO } from "./tradedata";
import "./Dashboard.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";
// Per-axis weights for the alternative-supplier score.
const ALT_SCORE_COMPONENTS = [
  { key:"supply", label:"Supply Capability", max:40, color:"#3b82f6" },
  { key:"stability", label:"National Stability", max:30, color:"#ef4444" },
  { key:"trade", label:"Market Accessibility", max:25, color:"#22c55e" },
  { key:"diversify", label:"Geographic Spread", max:5, color:"#eab308" },
];
const ALT_GRADE_THRESHOLDS = [
  { min:80, grade:"A" },
  { min:65, grade:"B" },
  { min:50, grade:"C" },
  { min:35, grade:"D" },
  { min:0, grade:"F" },
];

// Maps a numeric score to a letter grade.
function calcAltGrade(score, maxScore) {
  if (!maxScore) return "F";
  const pct = (score / maxScore) * 100;
  return ALT_GRADE_THRESHOLDS.find(t => pct >= t.min)?.grade || "F";
}

// Fetches distinct event labels associated with the active HS code and anomaly months.
function useEventLabels({ hsCode, anomalyMonths }) {
  const [labels, setLabels] = useState([]);
  const monthKey = anomalyMonths.slice(0,5).join(",");
  useEffect(() => {
    if (!hsCode) return;
    const params = new URLSearchParams({ hs: hsCode });
    if (monthKey) params.set("months", monthKey);
    fetch(`${API_BASE}/events/labels?${params}`)
      .then(r => r.json())
      .then(({ labels: l }) => setLabels(l || []))
      .catch(() => {});
  }, [hsCode, monthKey]);
  return labels;
}

// Compact weight formatter (K/M/G suffix).
function fmtW(v) {
  if (v == null) return "—";
  if (v >= 1e9) return (v/1e9).toFixed(1)+"G";
  if (v >= 1e6) return (v/1e6).toFixed(1)+"M";
  if (v >= 1e3) return (v/1e3).toFixed(0)+"K";
  return String(Math.round(v));
}
// Signed percentage string.
function pctStr(v, d=1) { return (v >= 0 ? "+" : "") + v.toFixed(d) + "%"; }

// Single-select dropdown with a search box.
function SearchSelect({ label, items, value, onChange, renderLabel }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref    = useRef();
  const inpRef = useRef();
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(i => renderLabel(i).toLowerCase().includes(q));
  }, [items, query, renderLabel]);
  const selected = items.find(i => i.value === value);
  // Close on outside click.
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  // Reset query and focus the input when the panel opens.
  useEffect(() => { if (open) { setQuery(""); inpRef.current?.focus(); } }, [open]);

  return (
    <div className="ss-wrap" ref={ref}>
      <button className="ss-trigger" onClick={() => setOpen(v => !v)}>
        <span className="ss-trigger-label">{label}</span>
        <span className="ss-trigger-value">{selected ? renderLabel(selected) : "Select"}</span>
        <span className="ss-chevron">{open ? "∧" : "∨"}</span>
      </button>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-row">
            <span>🔍</span>
            <input ref={inpRef} className="ss-search" placeholder="Search…"
              value={query} onChange={e => setQuery(e.target.value)}/>
            {query && <button className="ss-clear-q" onClick={() => setQuery("")}>✕</button>}
          </div>
          <ul className="ss-list">
            {filtered.length === 0 && <li className="ss-empty">No results found</li>}
            {filtered.map(item => (
              <li key={item.value}
                className={`ss-item ${item.value === value ? "active" : ""}`}
                onClick={() => { onChange(item.value); setOpen(false); }}>
                {renderLabel(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// SVG geometry constants for the small charts.
const VW=600, VH=200;
const CP = { t:18, r:18, b:34, l:54 };
const CW  = VW-CP.l-CP.r;
const CH  = VH-CP.t-CP.b;

// Builds a smooth cubic-bezier path through the given points.
function smoothPath(pts) {
  if (!pts.length) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p=pts[i-1], c=pts[i], mx=(p.x+c.x)/2;
    d += ` C${mx.toFixed(1)},${p.y.toFixed(1)} ${mx.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }
  return d;
}

// Computes axis scales, tick labels and the event marker x position.
function makeAxes({ data, evIdx, valueKey, yFmt }) {
  const n    = data.length;
  const vals = data.map(d => d[valueKey]).filter(v => v != null && !isNaN(v));
  if (!vals.length) return null;
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const lo = minV - range*0.1, hi = maxV + range*0.1;
  const xS = i => n>1?(i/(n-1))*CW:CW/2;
  const yS = v => CH - ((v-lo)/(hi-lo))*CH;
  const evX = evIdx>=0&&evIdx<n ? xS(evIdx) : null;
  const step = n<=12?1:n<=24?4:6;
  const xLabels = data.map((d,i) => {
    const show = d.period?.endsWith("-01") || i%step===0 || i===0 || i===n-1;
    return { i, label: d.period?.slice(2,7)||"", show };
  }).filter(d=>d.show);
  const yTicks = [0,0.33,0.66,1].map(f => lo + f*(hi-lo));
  return { n, lo, hi, xS, yS, evX, xLabels, yTicks, yFmt };
}

// Line chart of UIV values, split before/after the event marker.
function LineChart({ data, evIdx }) {
  if (!data.length) return <div className="chart-empty-sm">No data</div>;
  const ax = makeAxes({ data, evIdx, valueKey:"uiv", yFmt: v=>v.toFixed(3) });
  if (!ax) return <div className="chart-empty-sm">UIV No data</div>;
  const { xS, yS, evX, xLabels, yTicks } = ax;
  // Split points into pre- and post-event series so they can be drawn in different colors.
  const beforePts = [];
  const afterPts = [];
  data.forEach((d, i) => {
    if (d.uiv == null) return;
    const point = { x:xS(i), y:yS(d.uiv) };
    if (evIdx < 0 || i <= evIdx) beforePts.push(point);
    if (evIdx >= 0 && i >= evIdx) afterPts.push(point);
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${CP.l},${CP.t})`}>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={0} x2={CW} y1={yS(v).toFixed(1)} y2={yS(v).toFixed(1)} stroke="rgba(203,213,225,0.18)" strokeWidth="0.8"/>
            <text x={-8} y={yS(v)+4} textAnchor="end" fontSize="10.5" fill="#94a3b8" fontFamily="var(--sans)">{v.toFixed(2)}</text>
          </g>
        ))}
        <line x1={0} x2={CW} y1={CH} y2={CH} stroke="rgba(203,213,225,0.28)" strokeWidth="1"/>
        {xLabels.map(({i,label})=>(
          <g key={i} transform={`translate(${xS(i).toFixed(1)},${CH})`}>
            <text y={15} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="var(--sans)">{label}</text>
          </g>
        ))}
        {evX!=null && (
          <>
            <line x1={evX.toFixed(1)} y1={0} x2={evX.toFixed(1)} y2={CH} stroke="#f87171" strokeWidth="1.2" strokeDasharray="4,5" opacity="0.75"/>
            <circle cx={evX.toFixed(1)} cy={CH} r="2.5" fill="#f87171"/>
          </>
        )}
        {beforePts.length > 1 && (
          <path d={smoothPath(beforePts)} stroke="#93c5fd" fill="none" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>
        )}
        {afterPts.length > 1 && (
          <path d={smoothPath(afterPts)} stroke="#1d4ed8" fill="none" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        )}
      </g>
    </svg>
  );
}

// Bar chart of import weights with the same before/after color split as the line chart.
function BarChart({ data, evIdx }) {
  if (!data.length) return <div className="chart-empty-sm">No data</div>;
  const n    = data.length;
  const maxV = Math.max(...data.map(d=>d.weight), 1);
  const bw   = Math.max(3, (CW/n)*0.72);
  const gap  = CW/n;
  const xS   = i => i*gap+(gap-bw)/2;
  const evX  = evIdx>=0&&evIdx<n ? xS(evIdx)+bw/2 : null;
  const step = n<=12?1:n<=24?4:6;
  const xLabels = data.map((d,i) => ({
    i, label: d.period?.slice(2,7)||"",
    show: d.period?.endsWith("-01")||i%step===0||i===0||i===n-1
  })).filter(d=>d.show);
  const yTicks = [0,0.5,1].map(f=>maxV*f);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${CP.l},${CP.t})`}>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={0} x2={CW} y1={(CH-(v/maxV)*CH).toFixed(1)} y2={(CH-(v/maxV)*CH).toFixed(1)} stroke="rgba(203,213,225,0.18)" strokeWidth="0.8"/>
            <text x={-8} y={(CH-(v/maxV)*CH+4).toFixed(1)} textAnchor="end" fontSize="10.5" fill="#94a3b8" fontFamily="var(--sans)">{fmtW(v)}</text>
          </g>
        ))}
        {data.map((d,i)=>{
          const after = evIdx>=0&&i>=evIdx;
          const bh = (d.weight/maxV)*CH;
          return (
            <rect key={i} x={xS(i).toFixed(1)} y={(CH-bh).toFixed(1)}
              width={bw.toFixed(1)} height={Math.max(0.5,bh).toFixed(1)}
              fill={after ? "#1d4ed8" : "#93c5fd"} rx="2"/>
          );
        })}
        {evX!=null&&<line x1={evX.toFixed(1)} y1={0} x2={evX.toFixed(1)} y2={CH} stroke="#f87171" strokeWidth="1.2" strokeDasharray="4,5" opacity="0.75"/>}
        <line x1={0} x2={CW} y1={CH} y2={CH} stroke="rgba(203,213,225,0.28)" strokeWidth="1"/>
        {xLabels.map(({i,label})=>(
          <g key={i} transform={`translate(${(xS(i)+bw/2).toFixed(1)},${CH})`}>
            <text y={15} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="var(--sans)">{label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// World map constants and aliases that translate dataset names to the topojson naming.
const MAP_W = 1000;
const MAP_H = 520;
const SELECTED_COUNTRY_COLOR = "#facc15";
const SUPPLIER_COLORS = ["#1d4ed8", "#3b82f6", "#60a5fa", "#bfdbfe", "#ffffff"];
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const COUNTRY_NAME_ALIASES = {
  russia: "russianfederation",
  unitedstatesofamerica: "unitedstates",
  vietnam: "vietnam",
  turkey: "turkiye",
  iran: "iranislamicrepublicof",
  syria: "syrianarabrepublic",
  laos: "laopeoplesdemocraticrepublic",
  tanzania: "tanzaniaunitedrepublicof",
  congodemocraticrepublic: "congothedemocraticrepublicofthe",
  democraticrepublicofthecongo: "congothedemocraticrepublicofthe",
  ivorycoast: "cotedivoire",
  czechia: "czechrepublic",
  northmacedonia: "macedonia",
};

// Simple equirectangular fallback when the d3 projection is unavailable.
function projectPoint({ lat, lng }) {
  return {
    x: ((lng + 180) / 360) * MAP_W,
    y: ((90 - lat) / 180) * MAP_H,
  };
}

// Projects a geo point using d3, falling back to the equirectangular projection.
function projectGeoPoint(projection, geo) {
  const point = projection([geo.lng, geo.lat]);
  return point ? { x:point[0], y:point[1] } : projectPoint(geo);
}

// Strips punctuation/case so dataset names line up with topojson names.
function normalizeCountryName(name = "") {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return COUNTRY_NAME_ALIASES[key] || key;
}

// Looks up the geo entry matching the given country name.
function findCountryGeo(name) {
  if (!name) return null;
  const target = normalizeCountryName(name);
  const key = Object.keys(COUNTRY_GEO).find(k => normalizeCountryName(k) === target);
  return key ? { name:key, ...COUNTRY_GEO[key] } : null;
}

// Decodes a topojson payload into GeoJSON features for d3.geoPath.
function topoToGeoFeatures(topology, objectName = "countries") {
  const object = topology.objects?.[objectName];
  if (!object) return [];
  const scale = topology.transform?.scale || [1, 1];
  const translate = topology.transform?.translate || [0, 0];
  const arcs = topology.arcs.map(arc => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  const readArc = index => {
    if (index >= 0) return arcs[index];
    return [...arcs[~index]].reverse();
  };
  const readRing = ring => ring.flatMap((arcIndex, i) => {
    const arc = readArc(arcIndex);
    return i === 0 ? arc : arc.slice(1);
  });
  const readPolygon = polygon => polygon.map(readRing);
  const readGeometry = geometry => {
    if (geometry.type === "Polygon") return { type:"Polygon", coordinates:readPolygon(geometry.arcs) };
    if (geometry.type === "MultiPolygon") return { type:"MultiPolygon", coordinates:geometry.arcs.map(readPolygon) };
    return null;
  };
  return object.geometries.map(geometry => ({
    type:"Feature",
    id:geometry.id,
    properties:geometry.properties || {},
    geometry:readGeometry(geometry),
  })).filter(feature => feature.geometry);
}

// Static 2D world map highlighting the selected country and top suppliers.
function FlatTradeMap({ selectedCountry, altSuppliers }) {
  const [features, setFeatures] = useState([]);
  const selectedGeo = useMemo(() => findCountryGeo(selectedCountry), [selectedCountry]);
  const projection = useMemo(
    () => d3.geoNaturalEarth1().fitExtent([[8, 4], [MAP_W - 8, MAP_H - 18]], { type:"Sphere" }),
    []
  );
  const path = useMemo(() => d3.geoPath(projection), [projection]);
  // Load the world atlas once. Falls back to point markers if it cannot be fetched.
  useEffect(() => {
    let alive = true;
    fetch(WORLD_ATLAS_URL)
      .then(res => res.ok ? res.json() : null)
      .then(topology => {
        if (alive && topology) setFeatures(topoToGeoFeatures(topology));
      })
      .catch(() => {
        if (alive) setFeatures([]);
      });
    return () => { alive = false; };
  }, []);

  const supplierMap = useMemo(() => {
    const map = new Map();
    altSuppliers.forEach((supplier, index) => {
      const geo = findCountryGeo(supplier.name);
      if (geo) {
        map.set(normalizeCountryName(geo.name), {
          ...geo,
          rank: index + 1,
          score: supplier.score,
          color: SUPPLIER_COLORS[index % SUPPLIER_COLORS.length],
        });
      }
    });
    return map;
  }, [altSuppliers]);

  const countries = useMemo(() => {
    const selectedKey = selectedGeo ? normalizeCountryName(selectedGeo.name) : "";
    return Object.entries(COUNTRY_GEO).map(([name, geo]) => {
      const key = normalizeCountryName(name);
      const supplier = supplierMap.get(key);
      const isSelected = key === selectedKey;
      const point = projectGeoPoint(projection, geo);
      return {
        name,
        ...point,
        rank: supplier?.rank,
        score: supplier?.score,
        color: isSelected ? SELECTED_COUNTRY_COLOR : supplier?.color || "#586171",
        radius: isSelected ? 13 : supplier ? 11 : 6,
        opacity: isSelected || supplier ? 1 : 0.36,
        stroke: isSelected ? "#fff7ad" : supplier ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.08)",
      };
    });
  }, [selectedGeo, supplierMap, projection]);

  const featureStyle = feature => {
    const featureName = feature.properties.name || feature.properties.NAME || "";
    const key = normalizeCountryName(featureName);
    const selectedKey = selectedGeo ? normalizeCountryName(selectedGeo.name) : "";
    const supplier = supplierMap.get(key);
    const isSelected = key === selectedKey;
    return {
      fill: isSelected ? SELECTED_COUNTRY_COLOR : supplier?.color || "#586171",
      opacity: isSelected || supplier ? 1 : .42,
      stroke: isSelected ? "#fecaca" : supplier ? "rgba(255,255,255,.68)" : "rgba(255,255,255,.12)",
      strokeWidth: isSelected || supplier ? 1.1 : .55,
    };
  };

  return (
    <div className="flat-map-wrap">
      <svg className="flat-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Alternative supplier map">
        <rect className="flat-map-bg" x="0" y="0" width={MAP_W} height={MAP_H}/>
        {features.length > 0 ? (
          <g>
            {features.map(feature => {
              const style = featureStyle(feature);
              return (
                <path
                  key={feature.id || feature.properties.name}
                  d={path(feature) || ""}
                  fill={style.fill}
                  opacity={style.opacity}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                />
              );
            })}
          </g>
        ) : (
          <g>
            {countries.map(country => (
              <rect
                key={country.name}
                x={country.x - country.radius * 1.8}
                y={country.y - country.radius}
                width={country.radius * 3.6}
                height={country.radius * 2}
                rx={country.radius * .75}
                fill={country.color}
                opacity={country.opacity}
                stroke={country.stroke}
                strokeWidth={country.rank || country.color === SELECTED_COUNTRY_COLOR ? 1.8 : .8}
              />
            ))}
          </g>
        )}
      </svg>
      <div className="flat-map-legend">
        <span><i className="legend-selected"/>Selected country</span>
        {altSuppliers.slice(0, 5).map((supplier, index) => (
          <span key={supplier.name}><i style={{ background:SUPPLIER_COLORS[index] }}/>{index + 1}. {supplier.name}</span>
        ))}
      </div>
    </div>
  );
}

// Card row for one historical/search event.
function EventCard({ ev, isActive, onClick }) {
  const tone = Number.isFinite(ev.tone) ? ev.tone : null;
  const location = ev.locationName || ev.locationCode || "Unknown location";

  return (
    <li className={`ec-card ${isActive ? "active" : ""}`} onClick={onClick}>
      <div className="ec-date-row">
        <span className="ec-date">{ev.date}</span>
      </div>

      <div className="ec-location-row">
        <span className="ec-location">{location}</span>
        {ev.locationName && ev.locationCode && <span className="ec-code">{ev.locationCode}</span>}
      </div>

      <div className="ec-title-row">
        <span className="ec-title">{ev.label || "Unlabeled event"}
        </span>
      </div>

      <div className="ec-detail-row">
        {ev.cameo && <span className="ec-cameo">CAMEO {ev.cameo}</span>}
        {tone != null && (
          <span className={`ec-tone ${tone < 0 ? "neg" : tone > 0 ? "pos" : ""}`}>
            Tone {tone >= 0 ? "+" : ""}{tone.toFixed(1)}
          </span>
        )}
      </div>

      <div className="ec-link-row">
        {ev.sourceUrl ? (
          <a className="ec-gn-link" href={ev.sourceUrl} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}>
            Read article →
          </a>
        ) : (
          <span className="ec-no-url">No URL</span>
        )}
      </div>
    </li>
  );
}

export default function Dashboard({ onDeepAnalysis }) {
  const { rawData, loading, countries, hsCatalog } =
    useTimeseriesData("/data/global_threads_timeseries_uiv_2.csv");

  const [selHS,       setSelHS]       = useState("");
  const [selCountry,  setSelCountry]  = useState("");
  const [selLabel,    setSelLabel]    = useState("All");
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [searchUrl,     setSearchUrl]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError,   setSearchError]   = useState(null);
  const [searchQuery,   setSearchQuery]   = useState(null);
  // All score axes start enabled.
  const [altScoreActive, setAltScoreActive] = useState(() =>
    Object.fromEntries(ALT_SCORE_COMPONENTS.map(c => [c.key, true]))
  );

  // Toggle an axis on/off, but never let every axis end up disabled.
  const toggleAltScore = key => {
    setAltScoreActive(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return Object.values(next).every(v => !v) ? prev : next;
    });
  };

  // Look up similar past events by article URL via the backend.
  const handleNewsSearch = async () => {
    const url = searchUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setSearchError("Enter a valid URL starting with http:// or https://");
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_BASE}/news/search?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let detail = "";
        try { const j = JSON.parse(txt); detail = j.error || j.hint || ""; } catch {}
        throw new Error(`${res.status}${detail ? ` — ${detail}` : ""}`);
      }
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setSearchResults(results);
      setSearchQuery(data.query || null);
      setActiveIdx(0);
      // Auto-select the HS code detected in the article when possible.
      const queryProducts = data.query?.url_detected_products || [];
      if (queryProducts.length > 0) {
        const m = String(queryProducts[0]).match(/^hs0*(\d+)/i);
        if (m) {
          const detectedHS = m[1];
          if (hsCatalog.some(h => h.code === detectedHS)) {
            setSelHS(detectedHS);
          }
        }
      }
    } catch (err) {
      console.error("[News Search] error:", err);
      setSearchError(err.message || "Search failed");
      setSearchResults([]);
      setSearchQuery(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchUrl("");
    setSearchResults([]);
    setSearchError(null);
    setSearchQuery(null);
    setActiveIdx(0);
  };

  // Flatten search results into the same shape as event cards.
  const searchEvents = useMemo(() => {
    const mapped = searchResults.map(item => ({
      date:          item.event?.event_date || "",
      month:         item.year_month || (item.event?.event_date || "").slice(0, 7),
      label:         item.event?.event_label || "",
      polarity:      item.event?.event_polarity || "neutral",
      cameo:         item.event?.event_code || "",
      locationName:  item.event?.location_name || "",
      locationCode:  item.event?.location_country || "",
      actor1:        item.event?.actor1_name || "",
      actor1Country: item.event?.actor1_country || "",
      actor2:        item.event?.actor2_name || "",
      actor2Country: item.event?.actor2_country || "",
      goldstein:     item.event?.goldstein ?? 0,
      tone:          item.gkg?.tone ?? item.event?.avg_tone ?? 0,
      sourceUrl:     item.event?.source_url || "",
      products:      item.event?.url_detected_products ?? [],
      _searchRank:   item.rank,
      _searchScore:  item.score,
    }));
    return selLabel === "All" ? mapped : mapped.filter(ev => ev.label === selLabel);
  }, [searchResults, selLabel]);

  const inSearchMode = searchLoading || searchError || searchResults.length > 0;

  useEffect(() => { if (hsCatalog.length && !selHS) setSelHS(hsCatalog[0]?.code ?? ""); }, [hsCatalog, selHS]);
  useEffect(() => { if (countries.length && !selCountry) setSelCountry(countries[0] ?? ""); }, [countries, selCountry]);

  const hsItems = useMemo(
    () => hsCatalog.map(h => ({ value:h.code, code:h.code, name:h.name })),
    [hsCatalog]
  );

  // Aggregate raw rows by period for the currently selected country & HS code.
  const seriesDataTemp = useMemo(() => {
    if (!selCountry || !selHS || !rawData.length) return [];
    const m = {};
    rawData.forEach(r => {
      if (r.country !== selCountry || r.hsCode !== selHS) return;
      if (!m[r.period]) m[r.period] = { period:r.period, weight:0, uiv:null, uivSum:0, uivCnt:0 };
      m[r.period].weight += r.weight;
      if (r.uiv != null && r.uiv > 0) { m[r.period].uivSum += r.uiv; m[r.period].uivCnt += 1; }
    });
    return Object.values(m).sort((a,b)=>a.period.localeCompare(b.period))
      .map(d=>({...d, uiv:d.uivCnt>0?+(d.uivSum/d.uivCnt).toFixed(4):null}));
  }, [rawData, selCountry, selHS]);

  const anomalyPeriodsTemp = useMemo(
    () => detectAnomalyMonths(seriesDataTemp).map(a => a.period),
    [seriesDataTemp]
  );

  const eventLabels = useEventLabels({ hsCode: selHS, anomalyMonths: anomalyPeriodsTemp });
  const labelOptions = useMemo(() => {
    if (inSearchMode && searchResults.length > 0) {
      const labels = new Set();
      searchResults.forEach(item => {
        const l = item.event?.event_label;
        if (l) labels.add(l);
      });
      return ["All", ...Array.from(labels).sort()];
    }
    return ["All", ...eventLabels];
  }, [inSearchMode, searchResults, eventLabels]);
  const countryItems = useMemo(
    () => countries.map(c => ({ value:c, name:c })),
    [countries]
  );

  const seriesData = seriesDataTemp;
  const anomalyPeriods = anomalyPeriodsTemp;

  const { events: allGdeltEvents, loading: evLoading } = useGdeltEvents({
    anomalyMonths: anomalyPeriods,
    hsCode: selHS,
  });

  // Filter events by label, dedupe by date, and cap the visible list at 30 items.
  const gdeltEvents = useMemo(() => {
    const filtered = selLabel === "All"
      ? allGdeltEvents
      : allGdeltEvents.filter(ev => ev.label === selLabel);
    const seenDate = new Set();
    let deduped = filtered.filter(ev => {
      const d = (ev.date || "").slice(0, 10);
      if (!d) return true;
      if (seenDate.has(d)) return false;
      seenDate.add(d);
      return true;
    });
    // For very busy queries, collapse further to one event per month.
    if (filtered.length > 60) {
      const seenMonth = new Set();
      deduped = deduped.filter(ev => {
        const m = (ev.date || "").slice(0, 7);
        if (!m) return true;
        if (seenMonth.has(m)) return false;
        seenMonth.add(m);
        return true;
      });
    }
    return deduped.slice(0, 30);
  }, [allGdeltEvents, selLabel]);

  useEffect(() => {
    if (!inSearchMode) setActiveIdx(0);
  }, [gdeltEvents, inSearchMode]);

  useEffect(() => {
    if (inSearchMode) setActiveIdx(0);
  }, [searchEvents, inSearchMode]);

  useEffect(() => {
    if (!labelOptions.includes(selLabel)) setSelLabel("All");
  }, [labelOptions, selLabel]);

  const activeEvent = inSearchMode
    ? (searchEvents[activeIdx] ?? null)
    : (gdeltEvents[activeIdx] ?? null);

  // Locate the active event on the timeseries chart (exact month, else nearest).
  const eventChartIdx = useMemo(() => {
    if (!seriesData.length) return -1;
    if (!activeEvent?.month) return Math.floor(seriesData.length / 2);
    const exact = seriesData.findIndex(d => d.period === activeEvent.month);
    if (exact >= 0) return exact;
    const evDate = activeEvent.month;
    let closestIdx = 0;
    let minDiff = Infinity;
    seriesData.forEach((d, i) => {
      const diff = Math.abs(d.period.localeCompare(evDate));
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    });
    return closestIdx;
  }, [activeEvent, seriesData]);

  const BEFORE=6, AFTER=12;
  const displayData = useMemo(() => {
    if (!seriesData.length) return [];
    if (eventChartIdx < 0) return seriesData.slice(-18);
    const s = Math.max(0, eventChartIdx - BEFORE);
    const e = Math.min(seriesData.length, eventChartIdx + AFTER + 1);
    return seriesData.slice(s, e);
  }, [seriesData, eventChartIdx]);

  const dispEvIdx = useMemo(() => {
    if (eventChartIdx < 0 || !seriesData.length) return -1;
    const s = Math.max(0, eventChartIdx - BEFORE);
    const idx = eventChartIdx - s;
    return idx >= 0 ? idx : -1;
  }, [eventChartIdx, seriesData]);

  // Pre/post-event averages for price, volume, recovery time, and disrupted months.
  const metrics = useMemo(() => {
    if (!displayData.length) return null;
    const evIdx = dispEvIdx >= 1 ? dispEvIdx : Math.floor(displayData.length / 2);
    const pre  = displayData.slice(0, evIdx);
    const post = displayData.slice(evIdx);
    if (!pre.length || !post.length) return null;
    const preUivArr  = pre.filter(d=>d.uiv!=null && d.uiv>0);
    const postUivArr = post.filter(d=>d.uiv!=null && d.uiv>0);
    const preUiv  = preUivArr.length  ? preUivArr.reduce((s,d)=>s+d.uiv,0)  / preUivArr.length  : 0;
    const postUiv = postUivArr.length ? postUivArr.reduce((s,d)=>s+d.uiv,0) / postUivArr.length : 0;
    const pricePct = preUiv > 0 ? ((postUiv - preUiv) / preUiv) * 100 : 0;
    const preW  = pre.reduce((s,d)=>s+d.weight,0)  / pre.length;
    const postW = post.reduce((s,d)=>s+d.weight,0) / post.length;
    const volPct = preW > 0 ? ((postW - preW) / preW) * 100 : 0;
    // Recovery = first post-event month back within 15% of pre-event UIV.
    const recovI  = post.findIndex(d => d.uiv!=null && preUiv>0 && Math.abs(d.uiv-preUiv)/preUiv < 0.15);
    const recovMo = recovI >= 0 ? recovI + 1 : post.length;
    // Disrupted months = where weight drops below 70% of the pre-event average.
    const dropMo  = post.filter(d => d.weight < preW * 0.7).length;
    return { pricePct, volPct, recovMo, dropMo };
  }, [displayData, dispEvIdx]);

  // Re-score every candidate using only the axes the user currently has enabled.
  const altCandidates = useAltCandidates({
    hsCode: selHS,
    selCountry,
  });
  const activeAltComponents = useMemo(
    () => ALT_SCORE_COMPONENTS.filter(c => altScoreActive[c.key]),
    [altScoreActive]
  );
  const altMaxScore = activeAltComponents.reduce((sum, c) => sum + c.max, 0);
  const altSuppliers = useMemo(() => {
    return altCandidates
      .map(candidate => {
        const total = activeAltComponents.reduce((sum, c) => sum + (Number(candidate[c.key]) || 0), 0);
        return {
          ...candidate,
          score: Number(total.toFixed(1)),
          grade: calcAltGrade(total, altMaxScore),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [altCandidates, activeAltComponents, altMaxScore]);

  const mapSelectedCountry = inSearchMode && findCountryGeo(activeEvent?.locationName)
    ? activeEvent.locationName
    : selCountry;

  return (
    <div className="sl-root">
      <nav className="sl-nav">
        <div className="sl-logo">
          <span className="sl-logo-dot">◉</span>
          <span className="sl-logo-text">Global Threads</span>
        </div>
        <button className="sl-deep-btn" onClick={() => onDeepAnalysis?.()}>
          <span className="sl-deep-btn-dot" />
          🌐 DEEP ANALYSIS
        </button>
      </nav>

      <div className="sl-eventbar">
        <div className="sl-eb-left">
          <span className="sl-eb-label">Current Event</span>
          {activeEvent ? (
            <span className="sl-event-tag">
              <span></span>
              {inSearchMode ? (
                <>
                  {activeEvent.locationCode || activeEvent.locationName || "?"}
                  {activeEvent.products?.[0] && (() => {
                    const m = String(activeEvent.products[0]).match(/^hs0*(\d+)/i);
                    return m ? <> — HS{m[1]}</> : null;
                  })()}
                  {" · "}{activeEvent.date}
                </>
              ) : (
                <>{selCountry} — HS{selHS} · {activeEvent.date}</>
              )}
            </span>
          ) : (
            <span className="sl-event-tag-idle">
              {inSearchMode ? "Select a search result card" : "Select a commodity and country"}
            </span>
          )}
        </div>
        <div className="sl-eb-selectors">
          <SearchSelect label="HS CODE" items={hsItems} value={selHS} onChange={setSelHS}
            renderLabel={i=>`HS ${i.code.padStart(2,"0")} — ${i.name.slice(0,28)}`}/>
          <SearchSelect label="COUNTRY" items={countryItems} value={selCountry} onChange={setSelCountry}
            renderLabel={i=>i.name}/>
          <div className="sl-sel-wrap">
            <select className="sl-select sl-select-wide" value={selLabel}
              onChange={e => setSelLabel(e.target.value)}>
              {labelOptions.map(l => (
                <option key={l} value={l}>{l.length > 35 ? l.slice(0,35)+"…" : l}</option>
              ))}
            </select>
            <span className="sl-chevron">∨</span>
          </div>

          <div className="sl-eb-search">
            <input
              type="text"
              className="sl-search-input"
              placeholder="Paste news URL…"
              value={searchUrl}
              onChange={e => setSearchUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleNewsSearch(); }}
              disabled={searchLoading}
              title="Find similar past events from MongoDB"
            />
            <button
              className="sl-search-btn"
              onClick={handleNewsSearch}
              disabled={searchLoading || !searchUrl.trim()}
              title="Search similar events"
            >
              {searchLoading ? <span className="sl-spinner-sm"/> : "🔍"}
            </button>
            {(searchResults.length > 0 || searchError) && (
              <button
                className="sl-search-clear"
                onClick={handleClearSearch}
                title="Clear search"
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="sl-loading"><div className="sl-spinner"/><span>Loading data…</span></div>
      ) : (
        <div className="sl-grid">
          {/* Event list (left column) */}
          <section className="sl-card sl-left">
            <div className="sl-card-header">
              {inSearchMode ? (
                <>
                  <span className="sl-card-title">Similar Events</span>
                  {searchResults.length > 0 && (
                    <span className="sl-badge-matched">TOP {searchResults.length}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="sl-card-title">Historical Events</span>
                  {gdeltEvents.length > 0 && (
                    <span className="sl-badge-matched">{gdeltEvents.length} MATCHED</span>
                  )}
                </>
              )}
            </div>

            {searchQuery && (
              <div className="sl-search-query-info">
                <span style={{color:"var(--t3)"}}>Query:</span>{" "}
                <strong>{searchQuery.event_code || "?"}</strong>{" · "}
                <strong>{searchQuery.location_country || "?"}</strong>
                {searchQuery.url_detected_products?.length > 0 &&
                  ` · ${searchQuery.url_detected_products.join(", ")}`}
              </div>
            )}

            {searchLoading ? (
              <div className="sl-empty">
                <div className="sl-spinner"/>
                <span>Searching similar events…</span>
              </div>
            ) : searchError ? (
              <div className="sl-empty" style={{color:"var(--red)", textAlign:"center"}}>
                <div style={{fontSize:24}}>⚠</div>
                <span style={{fontSize:11}}>{searchError}</span>
                <button className="ec-gn-link" onClick={handleClearSearch}
                  style={{background:"none", border:"none", marginTop:6, cursor:"pointer"}}>
                  ← Back to events
                </button>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="ec-list">
                {searchEvents.map((ev, i) => (
                  <EventCard key={(ev.sourceUrl || "no-url") + i}
                    ev={ev}
                    isActive={activeIdx === i}
                    onClick={() => setActiveIdx(i)}/>
                ))}
              </ul>
            ) : evLoading ? (
              <div className="sl-empty"><div className="sl-spinner"/></div>
            ) : gdeltEvents.length === 0 ? (
              <div className="sl-empty">
                {anomalyPeriods.length === 0
                  ? "No anomaly data available"
                  : "No related GDELT events"}
              </div>
            ) : (
              <ul className="ec-list">
                {gdeltEvents.map((ev, i) => (
                  <EventCard key={ev.sourceUrl+i} ev={ev}
                    isActive={activeIdx===i} onClick={()=>setActiveIdx(i)}/>
                ))}
              </ul>
            )}
          </section>

          {/* Price line chart */}
          <section className="sl-card sl-center-top">
            <div className="sl-card-header">
              <span className="sl-card-title">Price (USD/kg)</span>
            </div>
            {metrics ? (
              <>
                <div className="sl-metric-row">
                  <div className="sl-metric-box">
                    <span className={`sl-metric-big ${metrics.pricePct>=0?"pos":"neg"}`}>
                      {pctStr(metrics.pricePct)}
                    </span>
                    <span className="sl-metric-label">Price change after event</span>
                  </div>
                  <div className="sl-metric-box">
                    <span className="sl-metric-big neutral">{metrics.recovMo}</span>
                    <span className="sl-metric-label">Months to stabilize</span>
                  </div>
                </div>
                <div className="sl-chart-area">
                  <LineChart data={displayData} evIdx={dispEvIdx}/>
                </div>
              </>
            ) : (
              <div className="sl-empty">Select a commodity & country to view chart</div>
            )}
          </section>

          {/* Import volume bar chart */}
          <section className="sl-card sl-right-top">
            <div className="sl-card-header">
              <span className="sl-card-title">Import Volume (kg)</span>
            </div>
            {metrics ? (
              <>
                <div className="sl-metric-row">
                  <div className="sl-metric-box">
                    <span className={`sl-metric-big ${metrics.volPct>=0?"pos":"neg"}`}>
                      {pctStr(metrics.volPct)}
                    </span>
                    <span className="sl-metric-label">Import Change</span>
                  </div>
                  <div className="sl-metric-box">
                    <span className="sl-metric-big neutral">{metrics.dropMo}</span>
                    <span className="sl-metric-label">Disrupted months</span>
                  </div>
                </div>
                <div className="sl-chart-area">
                  <BarChart data={displayData} evIdx={dispEvIdx}/>
                </div>
              </>
            ) : (
              <div className="sl-empty">Select a commodity & country to view chart</div>
            )}
          </section>

          {/* Alternative supplier ranking */}
          <section className="sl-card sl-center-bottom">
            <div className="sl-card-header">
              <span className="sl-card-title">Alternative Suppliers</span>
              <span className="sl-card-sub">Scoring: {altMaxScore}pt · Same HS code</span>
            </div>
            <div className="sl-sup-toggles">
              {ALT_SCORE_COMPONENTS.map(component => {
                const on = altScoreActive[component.key];
                return (
                  <button
                    key={component.key}
                    className={`sl-sup-toggle ${on ? "on" : "off"}`}
                    style={{ "--sup-color": component.color }}
                    onClick={() => toggleAltScore(component.key)}
                  >
                    <span className="sl-sup-toggle-dot"/>
                    <span>{component.label}</span>
                    <span className="sl-sup-toggle-max">{component.max}</span>
                  </button>
                );
              })}
            </div>
            {altSuppliers.length === 0 ? (
              <div className="sl-empty">No alternative supplier data</div>
            ) : (
              <ul className="sl-sup-list">
                {altSuppliers.map((s, i) => (
                  <li key={s.name} className="sl-sup-item">
                    <span className="sl-sup-rank">{String(i+1).padStart(2,"0")}</span>
                    <div className="sl-sup-body">
                      <div className="sl-sup-top">
                        <span className="sl-sup-name">{s.name}</span>
                        <span className="sl-sup-score">{s.score}</span>
                      </div>
                      
                      <div className="sl-sup-bar-bg">
                        {activeAltComponents.map(component => {
                          const value = Number(s[component.key]) || 0;
                          const width = Math.min(100, (value / (altMaxScore || 1)) * 100);
                          return (
                            <div
                              key={component.key}
                              className="sl-sup-bar-segment"
                              title={`${component.label}: ${value}`}
                              style={{
                                width:`${width}%`,
                                background:component.color,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="sl-sup-tags">
                      {s.fta === "In force"       && <span className="sl-tag sl-tag-fta">FTA Active</span>}
                      {s.fta === "Signed"   && <span className="sl-tag sl-tag-signed">Signed</span>}
                      {s.fta === "Negotiating"      && <span className="sl-tag sl-tag-nego">Ongoing</span>}
                      <span className={`sl-tag ${s.grade==="A"?"sl-tag-a":s.grade==="B"?"sl-tag-b":s.grade==="C"?"sl-tag-c":"sl-tag-d"}`}>
                        {s.grade}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Trade network map */}
          <section className="sl-card sl-right-bottom">
            <div className="sl-card-header">
              <span className="sl-card-title">Trade Network</span>
              {selCountry && selHS && (
                <span className="sl-card-sub">{selCountry} · HS {selHS}</span>
              )}
            </div>
            <div style={{ flex:1, minHeight:0, borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
              <FlatTradeMap
                selectedCountry={mapSelectedCountry}
                altSuppliers={altSuppliers}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
