// Tracks that are ready to publish. Only these get a /tracks/{slug}/ page
// and a sitemap entry; the rest show as "Coming soon" cards on BrainByte.
const { tracks } = require("./brainbyte.json");

module.exports = tracks.filter((t) => t.status === "live");
