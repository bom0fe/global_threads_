const router     = require("express").Router();
const GdeltEvent = require("../models/GdeltEvent");

/* Similarity score from Goldstein and tone deltas. */
function computeSimilarityScore(qG, qT, cG, cT) {
  const hasG = (qG != null) || (cG != null);
  const hasT = (qT != null) || (cT != null);
  if (!hasG && !hasT) return 0.0;
  const gDiff = hasG ? Math.abs((qG ?? 0) - (cG ?? 0)) : 0;
  const tDiff = hasT ? Math.abs((qT ?? 0) - (cT ?? 0)) : 0;
  return Number((1.0 / (1.0 + gDiff * 0.6 + tDiff * 0.4)).toFixed(6));
}

router.get("/search", async (req, res) => {
  try {
    const sourceUrl = (req.query.url || "").trim();
    if (!sourceUrl) {
      return res.status(400).json({ error: "Query param 'url' is required" });
    }

    const topN              = Math.max(1, Math.min(50, parseInt(req.query.top_n              || "5", 10)));
    const maxSameYearMonth  = Math.max(1, Math.min(10, parseInt(req.query.max_same_year_month || "2", 10)));

    /* Find the source event. */
    const queryDoc = await GdeltEvent.findOne(
      { "event.source_url": sourceUrl },
      { _id: 0 }
    ).lean();

    if (!queryDoc) {
      return res.status(404).json({
        error: "URL not found in MongoDB",
        hint:  "This source URL hasn't been ingested. Run the BigQuery → MongoDB pipeline (url_based_search_ver2.py) first to add this URL.",
        source_url: sourceUrl,
      });
    }

    const ev = queryDoc.event || {};
    const queryProducts        = [...(ev.url_detected_products || [])].sort();
    const queryEventCode       = String(ev.event_code || "").trim();
    const queryLocationCountry = String(ev.location_country || "").trim();
    const queryGoldstein       = ev.goldstein;
    const queryAvgTone         = ev.avg_tone;

    /* Build the match filter. */
    const mongoFilter = {
      "event.event_code":       queryEventCode,
      "event.location_country": queryLocationCountry,
    };

    if (queryProducts.length > 0) {
      mongoFilter["event.url_detected_products"] = {
        $all:  queryProducts,
        $size: queryProducts.length,
      };
    } else {
      mongoFilter["event.url_detected_products"] = [];
    }

    console.log(`[news/search] filter:`, JSON.stringify(mongoFilter));

    /* Score matching candidates. */
    const candidates = await GdeltEvent.find(mongoFilter, { _id: 0 }).lean();
    console.log(`[news/search] candidates: ${candidates.length}`);

    if (candidates.length === 0) {
      return res.json({
        query: {
          source_url:            sourceUrl,
          event_date:            ev.event_date,
          event_code:            queryEventCode,
          location_country:      queryLocationCountry,
          url_detected_products: queryProducts,
          goldstein:             queryGoldstein,
          avg_tone:              queryAvgTone,
        },
        search_params:           { top_n: topN, max_same_year_month: maxSameYearMonth },
        year_month_distribution: {},
        searched_at:             new Date().toISOString(),
        results:                 [],
      });
    }

    let scored = candidates.map(doc => {
      const e = doc.event || {};
      return {
        score:      computeSimilarityScore(queryGoldstein, queryAvgTone, e.goldstein, e.avg_tone),
        event_date: String(e.event_date || ""),
        event_id:   e.event_id,
        source_url: e.source_url || "",
        doc,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    /* Deduplicate by URL. */
    const seenUrls = new Set();
    scored = scored.filter(item => {
      const u = item.source_url || "";
      if (!u) return true;
      if (seenUrls.has(u)) return false;
      seenUrls.add(u);
      return true;
    });

    /* Apply a monthly cap. */
    const ymCount   = {};
    const usedIdxs  = new Set();
    const selected  = [];

    for (let i = 0; i < scored.length; i++) {
      if (selected.length >= topN) break;
      const ym = scored[i].event_date.slice(0, 7);
      if ((ymCount[ym] || 0) < maxSameYearMonth) {
        selected.push(scored[i]);
        usedIdxs.add(i);
        ymCount[ym] = (ymCount[ym] || 0) + 1;
      }
    }

    if (selected.length < topN) {
      for (let i = 0; i < scored.length; i++) {
        if (selected.length >= topN) break;
        if (!usedIdxs.has(i)) {
          selected.push(scored[i]);
          usedIdxs.add(i);
        }
      }
    }

    /* Build the response. */
    const ymDist = {};
    selected.forEach(x => {
      const ym = x.event_date.slice(0, 7);
      ymDist[ym] = (ymDist[ym] || 0) + 1;
    });

    const response = {
      query: {
        source_url:            sourceUrl,
        event_date:            ev.event_date,
        event_code:            queryEventCode,
        location_country:      queryLocationCountry,
        url_detected_products: queryProducts,
        goldstein:             queryGoldstein,
        avg_tone:              queryAvgTone,
      },
      search_params:           { top_n: topN, max_same_year_month: maxSameYearMonth },
      year_month_distribution: Object.fromEntries(
        Object.entries(ymDist).sort(([a], [b]) => a.localeCompare(b))
      ),
      searched_at: new Date().toISOString(),
      results: selected.map((item, i) => ({
        rank:       i + 1,
        score:      item.score,
        year_month: item.event_date.slice(0, 7),
        event:      item.doc.event,
        gkg:        item.doc.gkg,
        meta:       item.doc.meta,
      })),
    };

    console.log(`[news/search] returning ${response.results.length} results, ym dist:`, response.year_month_distribution);
    res.json(response);
  } catch (err) {
    console.error("[news/search] error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
