// Scheduled check that keeps the site in step with Substack. Substack can't
// call a webhook when an edition is published, so every 3 days (matching
// Hari's posting rhythm; 06:00 UTC on the 1st, 4th, 7th... of each month) this
// compares the newest edition in the RSS feed with the one the live deploy
// was built with (/newsletter/latest.json, from src/newsletter/latest.njk)
// and, only when the feed has a newer one, POSTs to a Netlify build hook.
// The rebuild refreshes /newsletter/, the hub's "From the field" card and
// the sitemap.
//
// Setup (once, in the Netlify UI):
//   1. Site configuration -> Build & deploy -> Build hooks -> Add build hook
//      (name it "New newsletter edition", branch: main).
//   2. Site configuration -> Environment variables -> add
//      NEWSLETTER_BUILD_HOOK = the hook URL. Treat it as a secret: anyone
//      with it can trigger builds.
// Without the variable this function only logs what it would do.
// Scheduled functions run on the production deploy only, not in previews.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const feed = require("../lib/substack-feed.js");
const site = require("../../src/_data/site.json");

// Every 3 days. For faster pickup, "0 6 * * *" checks daily; a check that
// finds nothing new costs no build.
export const config = { schedule: "0 6 */3 * *" };

// Pure decision, exported for testing: rebuild when the feed's newest
// edition is newer than the deployed one, or the deploy has none but the
// feed does (e.g. the feed was down during the last build).
export function needsRebuild(latestInFeed, deployed) {
  if (!latestInFeed) return false;
  if (!deployed || !deployed.url) return true;
  if (latestInFeed.url === deployed.url) return false;
  return !deployed.date || latestInFeed.date > deployed.date;
}

async function getDeployed() {
  try {
    const res = await fetch(`${site.portfolioUrl}/newsletter/latest.json`, {
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async () => {
  const [editions, deployed] = await Promise.all([
    feed.fetchEditions(site.newsletter && site.newsletter.username),
    getDeployed(),
  ]);
  const latest = editions[0];

  if (!needsRebuild(latest, deployed)) {
    console.log(`newsletter-rebuild: up to date (${deployed && deployed.url})`);
    return new Response("up to date");
  }

  const hook = process.env.NEWSLETTER_BUILD_HOOK;
  if (!hook) {
    console.log(`newsletter-rebuild: new edition "${latest.title}" but NEWSLETTER_BUILD_HOOK is not set`);
    return new Response("hook not configured");
  }

  const res = await fetch(`${hook}?trigger_title=${encodeURIComponent("New newsletter edition: " + latest.title)}`, {
    method: "POST",
  });
  console.log(`newsletter-rebuild: new edition "${latest.title}", build hook HTTP ${res.status}`);
  return new Response(`rebuild triggered (${res.status})`);
};
