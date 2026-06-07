// Alternative-supplier scoring hooks.
// Loads public/data/alternative_scores.json and exposes either the top-N candidates
// (legacy hook) or the full candidate set (new hook) for an HS code.
import { useState, useEffect, useMemo } from "react";

// Module-level cache so the JSON loads only once per session.
let _cache = null;

export function useAltScores() {
  const [data,    setData]    = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) {
      setData(_cache);
      setLoading(false);
      return;
    }
    // Try multiple paths since CRA can serve from different bases.
    const paths = [
      "/data/alternative_scores.json",
      "./data/alternative_scores.json",
      `${process.env.PUBLIC_URL}/data/alternative_scores.json`,
    ];
    (async () => {
      for (const path of paths) {
        try {
          const res = await fetch(path);
          if (!res.ok) { console.warn(`[AltScores] ${path} → ${res.status}`); continue; }
          const json = await res.json();
          if (!Array.isArray(json) || !json.length) { console.warn(`[AltScores] ${path} → empty`); continue; }
          _cache = json;
          setData(json);
          setLoading(false);
          return;
        } catch (e) {
          console.warn(`[AltScores] ${path} failed:`, e.message);
        }
      }
      console.error("[AltScores] All paths failed. Check public/data/alternative_scores.json.");
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}

// Legacy hook: returns top-N suppliers sorted by score, kept for backward compatibility.
export function useAltSuppliers({ hsCode, selCountry, topN = 5 }) {
  const { data } = useAltScores();
  return useMemo(() => {
    if (!hsCode || !data.length) return [];
    const hsPad = String(hsCode).padStart(2, "0");
    const hsRaw = String(parseInt(hsCode, 10));
    const filtered = data.filter(d =>
      (d.hs === hsPad || d.hs === hsRaw) &&
      d.country !== selCountry &&
      d.score > 0
    );
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(d => ({
        name:        d.country,
        iso3:        d.iso3,
        score:       d.score,
        grade:       d.grade,
        supply:      d.supply,
        stability:   d.stability,
        trade:       d.trade,
        diversify:   d.diversify ?? 0,
        fta:         d.fta,
        importShare: d.importShare,
        continuity:  d.continuity,
      }));
  }, [data, hsCode, selCountry, topN]);
}

// New hook: returns every candidate so the UI can re-sort by user-toggled weights.
export function useAltCandidates({ hsCode, selCountry }) {
  const { data } = useAltScores();
  return useMemo(() => {
    if (!hsCode || !data.length) return [];
    const hsPad = String(hsCode).padStart(2, "0");
    const hsRaw = String(parseInt(hsCode, 10));
    return data
      .filter(d =>
        (d.hs === hsPad || d.hs === hsRaw) &&
        d.country !== selCountry &&
        d.score > 0
      )
      .map(d => ({
        name:        d.country,
        iso3:        d.iso3,
        score:       d.score,
        grade:       d.grade,
        supply:      d.supply    ?? 0,
        stability:   d.stability ?? 0,
        trade:       d.trade     ?? 0,
        diversify:   d.diversify ?? 0,
        fta:         d.fta,
        importShare: d.importShare,
        continuity:  d.continuity,
      }));
  }, [data, hsCode, selCountry]);
}
