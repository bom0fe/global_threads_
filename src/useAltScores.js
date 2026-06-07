// Hook for loading alternative supplier scores and selecting top-N candidates by HS code.
import { useState, useEffect, useMemo } from "react";

// Module-level cache so the JSON is fetched only once per session.
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
    // Try a few path variants since CRA serves from different bases.
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

// Returns the top-N alternative suppliers for a given HS code, excluding the current country.
export function useAltSuppliers({ hsCode, selCountry, topN = 5 }) {
  const { data } = useAltScores();
  return useMemo(() => {
    if (!hsCode || !data.length) return [];
    // HS codes may be stored padded ("01") or raw ("1") — accept both.
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
        fta:         d.fta,
        importShare: d.importShare,
        continuity:  d.continuity,
      }));
  }, [data, hsCode, selCountry, topN]);
}
