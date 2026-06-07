// Hook that fetches GDELT events tied to anomaly months for the given HS code.
import { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

export function useGdeltEvents({ anomalyMonths = [], hsCode = "" }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  // Use top 10 anomaly months as the query key.
  const monthKey = anomalyMonths.slice(0, 10).join(",");

  useEffect(() => {
    if (!monthKey || !hsCode) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      hs:     hsCode,
      months: monthKey,
      limit:  "30",
    });
    fetch(`${API_BASE}/events/anomalies?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then(({ events: evts = [] }) => {
        // Drop events without a label and normalize the field names for the UI.
        const normalized = evts
          .filter(ev => ev.label && ev.label.trim().length > 0)
          .map(ev => ({
            month:        (ev.month || "").slice(0, 7),
            date:         ev.date         || "",
            label:        ev.label        || "",
            eventCode:    ev.cameo        || "",
            cameo:        ev.cameo        || "",
            polarity:     ev.polarity     || "neutral",
            goldstein:    ev.goldstein    ?? 0,
            tone:         ev.tone         ?? 0,
            mentions:     ev.mentions     ?? 0,
            locationName: ev.locationName || "",
            locationCode: ev.locationCode || "",
            actor1:       ev.actor1       || "",
            actor2:       ev.actor2       || "",
            actor1Country: ev.actor1Country || "",
            actor2Country: ev.actor2Country || "",
            sourceUrl:    ev.sourceUrl    || "",
            products:     ev.products     || [],
          }));
        setEvents(normalized);
        setLoading(false);
      })
      .catch(err => {
        console.error("useGdeltEvents API error:", err);
        setError(err.message);
        setEvents([]);
        setLoading(false);
      });
  }, [hsCode, monthKey]);

  return { events, loading, error };
}
