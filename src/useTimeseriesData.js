// Hook that loads the trade timeseries CSV and derives anomaly months from it.
import { useState, useEffect, useMemo } from "react";

// Minimal CSV line parser that handles quoted fields.
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

// Fetches the timeseries CSV and exposes country / HS-code catalogs.
export function useTimeseriesData(csvPath = "/data/global_threads_timeseries_uiv_2.csv") {
  const [rawData,  setRawData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(csvPath)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        const rows  = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const v = parseCSVLine(lines[i]);
          if (v.length < 5) continue;
          const weight = parseFloat(v[4]) || 0;
          const uiv    = v[5] ? parseFloat(v[5]) : null;
          rows.push({
            period:  v[0].trim(),
            country: v[1].trim(),
            hsCode:  String(v[2]).trim(),
            items:   v[3].trim(),
            weight,
            uiv,
          });
        }
        setRawData(rows);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [csvPath]);

  const countries = useMemo(
    () => [...new Set(rawData.map(r => r.country))].sort(),
    [rawData]
  );

  const hsCatalog = useMemo(() => {
    const map = {};
    rawData.forEach(r => { if (!map[r.hsCode]) map[r.hsCode] = r.items; });
    return Object.entries(map)
      .sort(([a],[b]) => Number(a) - Number(b))
      .map(([code, name]) => ({ code, name }));
  }, [rawData]);

  return { rawData, loading, error, countries, hsCatalog };
}

// Scores each month for anomalies using z-score, momentum and seasonal deviation.
export function detectAnomalyMonths(series, topN = 8) {
  if (series.length < 6) return [];
  const results = [];
  for (let i = 3; i < series.length; i++) {
    const cur = series[i];
    if (!cur.uiv && !cur.weight) continue;
    const window = series.slice(Math.max(0, i - 12), i);
    // Rolling z-score on UIV
    const uivVals = window.map(d => d.uiv).filter(v => v != null && v > 0);
    let zUiv = 0;
    if (uivVals.length >= 4 && cur.uiv != null) {
      const avg = uivVals.reduce((s, v) => s + v, 0) / uivVals.length;
      const std = Math.sqrt(uivVals.reduce((s, v) => s + (v - avg) ** 2, 0) / uivVals.length);
      zUiv = std > 0 ? Math.abs((cur.uiv - avg) / std) : 0;
    }
    // Month-over-month momentum
    const prev = series[i - 1];
    const momUiv = (prev?.uiv && cur.uiv)
      ? Math.abs((cur.uiv - prev.uiv) / prev.uiv)
      : 0;
    const momW = prev?.weight && cur.weight
      ? Math.abs((cur.weight - prev.weight) / prev.weight)
      : 0;
    // Same-month seasonal z-score
    const mo = cur.period.slice(5, 7);
    const sameMonth = series.filter(d => d.period.slice(5, 7) === mo && d.uiv != null && d !== cur);
    let seasZ = 0;
    if (sameMonth.length >= 2 && cur.uiv != null) {
      const sm_avg = sameMonth.reduce((s, d) => s + d.uiv, 0) / sameMonth.length;
      const sm_std = Math.sqrt(sameMonth.reduce((s, d) => s + (d.uiv - sm_avg) ** 2, 0) / sameMonth.length);
      seasZ = sm_std > 0 ? Math.abs((cur.uiv - sm_avg) / sm_std) : 0;
    }
    // Weighted score; needs multiple signals to register as an anomaly.
    let score = 0;
    if (zUiv   >= 1.8) score += 3;
    if (momUiv >= 0.25) score += 3;
    if (momW   >= 0.30) score += 2;
    if (seasZ  >= 1.8) score += 2;
    if (score >= 2) {
      results.push({
        period: cur.period,
        score,
        zUiv: +zUiv.toFixed(2),
        momUiv: +(momUiv * 100).toFixed(1),
        momW:   +(momW   * 100).toFixed(1),
        uiv:    cur.uiv,
        weight: cur.weight,
      });
    }
  }
  // Keep best score per period, then return top-N.
  const dedup = {};
  results.forEach(r => {
    if (!dedup[r.period] || r.score > dedup[r.period].score) dedup[r.period] = r;
  });
  return Object.values(dedup)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
