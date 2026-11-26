// Guides that are published. Only these get a /guides/{slug}/ page on
// BrainByte and a sitemap entry; content lives in guides.json.
const guides = require("./guides.json");

module.exports = guides.filter((g) => g.status === "live");
