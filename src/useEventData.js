// Hook that loads daily GDELT event JSON files for the active period and deduplicates them.
import { useState, useEffect, useRef } from "react";

const MAX_FILES_PER_DAY = 30;
const LOCATION_GRID     = 0.5;
const CONCURRENT        = 10;

// Build the list of YYYY-MM-DD strings for the current period.
function getDatesInPeriod(year, month, mode) {
  const dates = [];
  if (mode === "yearly" || mode === "volatility") {
    for (let m = 1; m <= 12; m++) {
      const days = new Date(year, m, 0).getDate();
      for (let d = 1; d <= days; d++) {
        dates.push(`${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
      }
    }
  } else {
    const days = new Date(year, month, 0).getDate();
    for (let d = 1; d <= days; d++) {
      dates.push(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
  }
  return dates;
}

// Fetch a single event file; returns null on miss.
async function fetchEvent(date, idx) {
  const month = date.slice(5, 7);
  const year  = date.slice(0, 4);
  const url   = `/data/gdelt_event_outputs_integrated/${year}/${month}/${date}_${idx}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Walk numbered files for a date until we hit a gap.
async function fetchDay(date, signal) {
  const results = [];
  let idx = 1;
  while (idx <= MAX_FILES_PER_DAY) {
    if (signal?.aborted) break;
    const data = await fetchEvent(date, idx);
    if (data === null) break;
    results.push(data);
    idx++;
  }
  return results;
}

// Pull every day in the period with bounded concurrency.
async function fetchPeriod(dates, signal, onProgress) {
  const all = [];
  for (let i = 0; i < dates.length; i += CONCURRENT) {
    if (signal?.aborted) break;
    const chunk   = dates.slice(i, i + CONCURRENT);
    const results = await Promise.all(chunk.map((d) => fetchDay(d, signal)));
    results.forEach((dayArr) => all.push(...dayArr));
    onProgress?.(Math.min(1, (i + CONCURRENT) / dates.length));
  }
  return all;
}

// Drop duplicates by URL, then collapse near-identical events using a lat/lng grid.
function deduplicate(rawList) {
  const seenUrls = new Set();
  const urlUniq  = rawList.filter((item) => {
    const url = item.event?.source_url ?? item.gkg?.article_url ?? "";
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  const gridKey = (lat, lng, rootCode) => {
    const la = Math.round(lat / LOCATION_GRID) * LOCATION_GRID;
    const lo = Math.round(lng / LOCATION_GRID) * LOCATION_GRID;
    return `${la.toFixed(1)},${lo.toFixed(1)},${rootCode}`;
  };
  const buckets = {};
  urlUniq.forEach((item) => {
    const ev  = item.event;
    if (!ev?.lat || !ev?.lng) return;
    const key = gridKey(ev.lat, ev.lng, ev.event_root_code ?? "00");
    if (!buckets[key] || (ev.num_mentions ?? 0) > (buckets[key].event?.num_mentions ?? 0)) {
      buckets[key] = item;
    }
  });
  const noCoord = urlUniq.filter((item) => !item.event?.lat || !item.event?.lng);
  return [...Object.values(buckets), ...noCoord];
}

export function useEventData(period) {
  const { year, month, mode } = period;
  const [state, setState] = useState({
    events:   [],
    loading:  false,
    progress: 0,
    error:    null,
  });
  const abortRef = useRef(null);

  useEffect(() => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const dates = getDatesInPeriod(year, month, mode);
    if (dates.length === 0) {
      setState({ events: [], loading: false, progress: 0, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, progress: 0, error: null }));
    fetchPeriod(dates, controller.signal, (p) => {
      setState((s) => ({ ...s, progress: p }));
    })
      .then((raw) => {
        if (controller.signal.aborted) return;
        const events = deduplicate(raw);
        setState({ events, loading: false, progress: 1, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ events: [], loading: false, progress: 0, error: err.message });
      });
    return () => controller.abort();
  }, [year, month, mode]);

  return state;
}

// Maps event polarity / goldstein score to a marker color.
export function eventColor(polarity, goldstein) {
  if (polarity === "conflict" || goldstein < -5) return "#ff4444";
  if (polarity === "conflict" || goldstein < -2) return "#ff9944";
  if (goldstein > 3)  return "#44ff88";
  if (goldstein > 0)  return "#ffd700";
  return "#aaaaaa";
}

// Emoji icon by polarity.
export function eventIcon(polarity) {
  if (polarity === "conflict")    return "⚡";
  if (polarity === "cooperation") return "🤝";
  return "📰";
}
