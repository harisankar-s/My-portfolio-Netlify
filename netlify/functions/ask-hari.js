const fs = require("fs");
const path = require("path");

// require() of these JSON files makes Netlify bundle them with the function,
// so every deploy ships the current catalogue — nothing is hand-copied.
const profile = require("../../src/_data/profile.json");
const site = require("../../src/_data/site.json");
const exams = require("../../src/_data/exams.json");
const guides = require("../../src/_data/guides.json");
const brainbyte = require("../../src/_data/brainbyte.json");
const audiences = require("../../src/_data/audiences.json").list;
const { fetchEditions } = require("../lib/substack-feed.js");

// Post markdown is bundled via included_files in netlify.toml.
const POSTS_DIR = path.join(__dirname, "..", "..", "src", "blog", "posts");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 6;
const MAX_ARTICLE_TEXT_LENGTH = 4000;
const MAX_POSTS_LISTED = 20;

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

function frontmatterField(frontmatter, key) {
  const m = frontmatter.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"));
  return m ? m[1] : "";
}

// Title, date and URL of every post, newest first.
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const fm = (fs.readFileSync(path.join(POSTS_DIR, file), "utf8").match(/^---\n([\s\S]*?)\n---/) || [])[1];
      if (!fm) return null;
      return {
        title: frontmatterField(fm, "title"),
        date: frontmatterField(fm, "date"),
        url: `${site.url}/blog/${file.replace(/\.md$/, "")}/`,
      };
    })
    .filter((p) => p && p.title)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_POSTS_LISTED);
}

// What Hari offers right now, rebuilt from the same data files the site
// renders, so the assistant's suggestions always match the live pages.
async function buildCatalogue() {
  const nl = site.newsletter || {};
  const substack = nl.username ? `https://${nl.username}.substack.com/` : `${site.portfolioUrl}/#join`;
  const liveGuides = guides.filter((g) => g.status === "live");
  const guideBySlug = Object.fromEntries(liveGuides.map((g) => [g.slug, g]));
  const livePacks = brainbyte.practice.filter((p) => p.status === "live");
  const lines = [];

  lines.push(`NEWSLETTER: ${nl.name} — Hari's free newsletter, "${nl.tagline}": ${nl.topics}, a new issue ${nl.cadence}. For everyone from beginners to data engineers and architects. Subscribe: ${substack} · Archive of every edition: ${site.portfolioUrl}/newsletter/`);
  const editions = (await fetchEditions(nl.username)).slice(0, MAX_POSTS_LISTED);
  if (editions.length) {
    lines.push("Recent editions (newest first):");
    editions.forEach((e) => lines.push(`- "${e.title}" (${e.date.slice(0, 10)})${e.subtitle ? ": " + e.subtitle : ""} ${e.url}`));
  }

  lines.push("\nPAGES BY READER (point visitors to the one that fits them):");
  audiences.forEach((a) =>
    lines.push(`- For ${a.name.toLowerCase()} (${a.who})${a.status === "live" ? "" : " — coming soon, waitlist"}: ${a.card} ${site.portfolioUrl}/for/${a.slug}/`)
  );

  lines.push(`\nCLAUDE CERTIFICATION EXAM PREP (all free, library at ${site.portfolioUrl}/guides/):`);
  exams.forEach((e) => {
    const g = guideBySlug[e.guide];
    const pack = livePacks.find((p) => p.exam === e.packExam);
    lines.push(`- ${e.code}, ${e.name} (${e.facts}): ${e.blurb}`);
    if (g) lines.push(`  Free study guide: "${g.title}" — ${g.pitch} ${site.portfolioUrl}/guides/${g.slug}/`);
    if (pack) lines.push(`  Free practice pack: ${pack.title}, ${pack.count} questions — ${pack.url}`);
    else lines.push("  Practice pack: not available yet.");
  });
  lines.push("These are independent study materials, not affiliated with Anthropic, and contain no real exam questions.");

  const comingTracks = brainbyte.tracks.filter((t) => t.status !== "live" && !liveGuides.some((g) => g.track === t.slug));
  if (comingTracks.length) lines.push(`More guides coming soon: ${comingTracks.map((t) => t.title || t.short).join("; ")}.`);

  lines.push("\nSTARTER KITS:");
  brainbyte.kits.forEach((k) => {
    lines.push(`- ${k.title} (${k.status === "live" ? "available now" + (k.free ? ", free" : "") : "coming soon"}): ${k.blurb}${k.url ? " " + k.url : ""}`);
  });

  lines.push("\n1:1 CALLS (Topmate):");
  brainbyte.coaching.forEach((c) => lines.push(`- ${c.title}: ${c.blurb} ${c.url}`));

  const posts = loadPosts();
  if (posts.length) {
    lines.push(`\nBLOG POSTS (newest first, blog home ${site.url}/):`);
    posts.forEach((p) => lines.push(`- "${p.title}" (${p.date}) ${p.url}`));
  }

  return lines.join("\n");
}

async function buildSystemPrompt(articleContext) {
  const facts = JSON.stringify(profile, null, 2);

  let prompt = `You are AskHari.ai, the assistant embedded on Harisankar "Hari" Sivankutty's personal site (harisankarsivankutty.in).

You help two kinds of visitors:
1. Recruiters/hiring managers asking about Hari's professional background, skills, certifications, clients, and experience.
2. Readers of Hari's blog asking questions about the specific article they're reading.

Answer ONLY using the facts given below. If something isn't covered by these facts, say you don't have that information rather than guessing or inventing details. Keep answers concise, professional, and friendly — suited to a recruiter skimming for a quick answer. Use plain text, not markdown headers.

When someone asks what Hari offers, how to prepare for a Claude certification, what to read, or how to follow his work, recommend from the CURRENT OFFERINGS below and include the link. Never say something doesn't exist if it is listed there.

Here are the verified facts about Hari, as JSON:
${facts}

CURRENT OFFERINGS (kept in sync with the live site):
${await buildCatalogue()}`;

  if (articleContext && articleContext.text) {
    const title = String(articleContext.title || "").slice(0, 300);
    const text = String(articleContext.text).slice(0, MAX_ARTICLE_TEXT_LENGTH);
    prompt += `\n\nThe visitor is currently reading this blog article, titled "${title}". Its content:\n${text}\n\nWhen the question is about the article, answer from this content. When it's about Hari's background, use the facts above instead.`;
  }

  return prompt;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

async function callAnthropic(systemPrompt, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const reply = (data.content || []).map((block) => block.text || "").join("").trim();
  if (!reply) throw new Error("Anthropic API returned an empty reply");
  return reply;
}

async function callOpenRouter(systemPrompt, messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": profile.contact.site,
      "X-Title": "AskHari.ai",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 512,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) throw new Error("OpenRouter API returned an empty reply");
  return reply.trim();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: "message is required" }) };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { statusCode: 400, body: JSON.stringify({ error: `message must be under ${MAX_MESSAGE_LENGTH} characters` }) };
  }

  const history = sanitizeHistory(payload.history);
  const messages = [...history, { role: "user", content: message }];
  const systemPrompt = await buildSystemPrompt(payload.articleContext);

  try {
    const start = Date.now();
    const reply = await callAnthropic(systemPrompt, messages);
    const latencyMs = Date.now() - start;
    return { statusCode: 200, body: JSON.stringify({ reply, provider: "anthropic", model: ANTHROPIC_MODEL, latencyMs }) };
  } catch (anthropicError) {
    try {
      const start = Date.now();
      const reply = await callOpenRouter(systemPrompt, messages);
      const latencyMs = Date.now() - start;
      return {
        statusCode: 200,
        body: JSON.stringify({ reply, provider: "openrouter", model: OPENROUTER_MODEL, latencyMs, fallback: true }),
      };
    } catch (openRouterError) {
      console.error("AskHari.ai: both providers failed", anthropicError, openRouterError);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "AskHari.ai is temporarily unavailable. Please try again shortly." }),
      };
    }
  }
};
