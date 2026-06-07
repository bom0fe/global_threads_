const mongoose = require("mongoose");

const GdeltEventSchema = new mongoose.Schema({}, {
  strict: false,
  collection: "events",
});

// Nested field indexes.
GdeltEventSchema.index({ "event.event_date": 1 });
GdeltEventSchema.index({ "event.url_detected_products": 1 });
GdeltEventSchema.index({ "event.location_country": 1 });
GdeltEventSchema.index({ "event.goldstein": 1 });

module.exports = mongoose.model("GdeltEvent", GdeltEventSchema);
