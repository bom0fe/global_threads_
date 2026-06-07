const router     = require("express").Router();
const GdeltEvent = require("../models/GdeltEvent");

router.get("/anomalies", async (req, res) => {
  try {
    const { hs, months, limit = 50 } = req.query;
    if (!months) return res.json({ count: 0, events: [] });

    const monthArr = months.split(",").map(m => m.trim()).filter(Boolean);

    /* Date range filters. */
    const dateFilters = monthArr.map(m => ({
      "event.event_date": { $gte: `${m}-01`, $lte: `${m}-31` }
    }));

    const filter = {
      $or: dateFilters,
      "event.event_label": { $exists: true, $nin: [null, "", "null"] },
    };

    /* Match HS variants. */
    if (hs) {
      const hsNum = String(parseInt(hs, 10));
      filter["event.url_detected_products"] = {
        $elemMatch: { $regex: `^hs0*${hsNum}(_|$)`, $options: "i" }
      };
    }

    const docs = await GdeltEvent.find(filter)
      .sort({ "event.goldstein": 1, "event.event_date": 1 })
      .limit(Number(limit))
      .lean();

    const events = docs
      .map(doc => {
        const ev  = doc.event || {};
        const gkg = doc.gkg   || {};
        return {
          month:         (ev.event_date || "").slice(0, 7),
          date:          ev.event_date      || "",
          label:         ev.event_label     || "",
          cameo:         ev.event_code      || "",
          polarity:      ev.event_polarity  || "neutral",
          goldstein:     ev.goldstein       ?? 0,
          tone:          gkg.tone           ?? 0,
          mentions:      ev.num_mentions    ?? 0,
          locationName:  ev.location_name   || "",
          locationCode:  ev.location_country|| "",
          actor1:        ev.actor1_name     || ev.actor1_country || "",
          actor2:        ev.actor2_name     || ev.actor2_country || "",
          actor1Country: ev.actor1_country  || "",
          actor2Country: ev.actor2_country  || "",
          sourceUrl:     ev.source_url      || "",
          products:      ev.url_detected_products || [],
        };
      })
      .filter(e => e.label.trim().length > 0);

    res.json({ count: events.length, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* Sample endpoint. */
router.get("/sample", async (req, res) => {
  try {
    const { hs } = req.query;
    const filter = {};
    if (hs) {
      const hsNum = String(parseInt(hs, 10));
      filter["event.url_detected_products"] = {
        $elemMatch: { $regex: `^hs0*${hsNum}(_|$)`, $options: "i" }
      };
    }
    const docs = await GdeltEvent.find(filter).limit(5).lean();
    res.json({ count: docs.length, docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Label options endpoint. */
router.get("/labels", async (req, res) => {
  try {
    const { hs, months } = req.query;
    const filter = {
      "event.event_label": { $exists: true, $nin: [null, "", "null"] },
    };

    if (hs) {
      const hsNum = String(parseInt(hs, 10));
      filter["event.url_detected_products"] = {
        $elemMatch: { $regex: `^hs0*${hsNum}(_|$)`, $options: "i" }
      };
    }

    if (months) {
      const monthArr = months.split(",").map(m => m.trim()).filter(Boolean);
      filter.$or = monthArr.map(m => ({
        "event.event_date": { $gte: `${m}-01`, $lte: `${m}-31` }
      }));
    }

    const result = await GdeltEvent.aggregate([
      { $match: filter },
      { $group: { _id: "$event.event_label", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    const labels = result.map(r => r._id).filter(Boolean);
    res.json({ labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
