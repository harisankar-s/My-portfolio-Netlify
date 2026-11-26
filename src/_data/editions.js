// BrainByte newsletter editions from Substack, newest first, fetched at build
// time. Feeds the /newsletter/ archive and the hub's "From the field".
// Each: { title, subtitle, url, slug, date (ISO), image, text, tags }.
// netlify/functions/newsletter-rebuild.mjs rebuilds the site when a new
// edition is out. [] if the feed is down.
const site = require("./site.json");
const { fetchEditions } = require("../../netlify/lib/substack-feed.js");

module.exports = () => fetchEditions(site.newsletter && site.newsletter.username);
