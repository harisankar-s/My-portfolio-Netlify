// Guides that are published. Only these get a /guides/{slug}/ page and a
// sitemap entry; content lives in guides.json. Read with fs (not require) so
// `eleventy --serve` picks up edits to guides.json instead of a cached copy.
const fs = require("fs");
const path = require("path");

module.exports = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "guides.json"), "utf8")).filter(
    (g) => g.status === "live"
  );
