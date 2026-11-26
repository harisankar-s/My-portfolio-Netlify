const fs = require("fs");
const path = require("path");
const site = require("../../src/_data/site.json");
const { fetchEditions } = require("../lib/substack-feed.js");

const POSTS_DIR = path.join(__dirname, "..", "..", "src", "blog", "posts");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 6;
const TOP_N_POSTS = 5;
const MAX_POST_CHARS = 3000;

// Trench AI only ever calls free OpenRouter models — it must never
// spend Anthropic credits, unlike the AskHari.ai widget which is
// Anthropic-first. Keep every entry here free (":free" or the
// "openrouter/free" router). Tried in order; a 404/429/5xx from one falls
// through to the next instead of failing the whole request.
//
// Free slugs get retired without notice (glm-5.2 and minimax-m3 vanished in
// Nov 2026 and took Trench AI down), so the list ends with
// "openrouter/free", OpenRouter's own router that picks whichever free model
// is currently up. Check https://openrouter.ai/api/v1/models for live slugs.
// OPENROUTER_MODEL, when set, is tried first rather than replacing the list.
const OPENROUTER_MODELS = [
  ...(process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : []),
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
].filter((m, i, all) => all.indexOf(m) === i);

// Common words excluded from relevance scoring so they don't dilute matches
// against real keywords in the question.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "what", "when", "where", "which",
  "who", "how", "why", "have", "has", "had", "you", "your", "about", "does",
  "did", "with", "this", "that", "these", "those", "from", "into", "can",
  "could", "would", "should", "any", "some", "post", "posts", "article",
  "articles", "blog", "write", "written", "writing",
]);

// Blog posts are read once per cold start and cached for the life of the
// warm container. Newsletter editions come from the Substack feed at runtime
// (cached 10 minutes in substack-feed.js), so a new edition is searchable
// without a redeploy.
let cachedPosts = null;

function tokenize(text) {
  return String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
}

function buildTermFreq(tokens) {
  const freq = new Map();
  tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  return freq;
}

function parseTagsBlock(frontmatter) {
  const match = frontmatter.match(/^tags:\n((?:[ \t]*-[ \t]*.+\n?)+)/m);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.match(/^[ \t]*-[ \t]*(.+)$/))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

function parsePost(raw, slug) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const [, frontmatter, rawBody] = match;
  const titleMatch = frontmatter.match(/^title:\s*"?(.*?)"?\s*$/m);
  const dateMatch = frontmatter.match(/^date:\s*"?(.+?)"?\s*$/m);
  const excerptMatch = frontmatter.match(/^excerpt:\s*"([\s\S]*?)"\s*$/m) || frontmatter.match(/^excerpt:\s*(.+)$/m);

  const body = rawBody
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/<figure[\s\S]*?<\/figure>/g, " ")
    .replace(/```mermaid[\s\S]*?```/g, " ")
    .trim();

  const title = titleMatch ? titleMatch[1] : slug;
  const tags = parseTagsBlock(frontmatter);
  const excerpt = excerptMatch ? excerptMatch[1] : "";

  return indexEntry({
    slug,
    url: `/blog/${slug}/`,
    title,
    date: dateMatch ? dateMatch[1] : "",
    tags,
    excerpt,
    body,
  });
}

function indexEntry(entry) {
  const { title, tags, excerpt, body } = entry;
  return {
    ...entry,
    _titleFreq: buildTermFreq(tokenize(title)),
    _tagFreq: buildTermFreq(tags.flatMap(tokenize)),
    _excerptFreq: buildTermFreq(tokenize(excerpt)),
    _bodyFreq: buildTermFreq(tokenize(body)),
  };
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => parsePost(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"), file.replace(/\.md$/, "")))
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function editionToEntry(e) {
  return indexEntry({
    slug: e.slug,
    url: e.url,
    title: e.title,
    date: e.date.slice(0, 10),
    tags: [site.newsletter.name],
    excerpt: e.subtitle,
    body: e.text,
  });
}

async function getPosts() {
  if (!cachedPosts) cachedPosts = loadPosts();
  const editions = (await fetchEditions(site.newsletter && site.newsletter.username)).map(editionToEntry);
  return [...editions, ...cachedPosts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function scorePost(queryTerms, post) {
  let score = 0;
  queryTerms.forEach((term) => {
    score += (post._titleFreq.get(term) || 0) * 4;
    score += (post._tagFreq.get(term) || 0) * 3;
    score += (post._excerptFreq.get(term) || 0) * 2;
    score += post._bodyFreq.get(term) || 0;
  });
  return score;
}

// Cheap keyword relevance filter, not embeddings-based RAG: fine for a
// personal blog's post count and avoids adding a vector store. Scales by
// only ever feeding the model TOP_N_POSTS full texts, regardless of how
// many posts exist in total.
function selectRelevantPosts(question, posts) {
  const queryTerms = tokenize(question).filter((t) => t.length > 2 && !STOPWORDS.has(t));

  if (queryTerms.length === 0) {
    return posts.slice(0, TOP_N_POSTS);
  }

  const scored = posts.map((post) => ({ post, score: scorePost(queryTerms, post) }));
  const withScore = scored.filter((s) => s.score > 0);
  const ranked = (withScore.length ? withScore : scored).sort((a, b) => b.score - a.score);
  return ranked.slice(0, TOP_N_POSTS).map((s) => s.post);
}

function buildIndexText(posts) {
  return posts
    .map((p) => {
      const tagsPart = p.tags.length ? `, tags: ${p.tags.join(", ")}` : "";
      return `- "${p.title}" (${p.date}${tagsPart}) — ${p.url}\n  ${p.excerpt}`;
    })
    .join("\n");
}

function buildSystemPrompt(posts, selectedPosts) {
  const index = buildIndexText(posts);
  const articles = selectedPosts
    .map((p) => `### "${p.title}" (${p.url})\n${p.body.slice(0, MAX_POST_CHARS)}`)
    .join("\n\n---\n\n");

  return `You are "Trench AI", an assistant scoped only to Harisankar "Hari" Sivankutty's writing on data engineering, GenAI, and cloud architecture: his blog posts and his newsletter, ${site.newsletter.name} (entries tagged "${site.newsletter.name}").

Answer ONLY using the article content and index provided below. If Hari's writing doesn't cover something, say so plainly rather than guessing or using outside knowledge. When you reference a post or edition, name it and link it in markdown with the exact URL from the index, like [Post Title](/blog/slug/) or [Edition Title](https://${site.newsletter.username}.substack.com/p/slug), so the reader can open it. Keep answers concise and conversational, not a bulleted essay.

Full index of all posts and newsletter editions (title, date, tags, one-line excerpt):
${index}

Full text of the posts most relevant to this question:
${articles}`;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

// Some free providers (Gemma via Google AI Studio) reject a "system" role
// with a 400. Those get the instructions folded into the first user turn.
function inlineSystemPrompt(systemPrompt, messages) {
  const [first, ...rest] = messages;
  return [{ role: "user", content: `${systemPrompt}\n\n---\n\n${first.content}` }, ...rest];
}

async function callOpenRouterModel(model, systemPrompt, messages, inlineSystem = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://harisankarsivankutty.in",
      "X-Title": "Trench AI",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: inlineSystem ? inlineSystemPrompt(systemPrompt, messages) : [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`OpenRouter API error ${res.status} (${model}): ${body}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) throw new Error(`OpenRouter API returned an empty reply (${model})`);
  return reply.trim();
}

// A bad key (401), no credit (402) or a forbidden request (403) won't be
// fixed by trying another model, so those fail fast. 400/404/429/5xx are
// per-model problems (a provider rejecting the request shape, a retired
// slug, a rate-limited free pool), so they move on to the next model.
function isRetryableOpenRouterError(err) {
  return !err.status || ![401, 402, 403].includes(err.status);
}

async function callOpenRouter(systemPrompt, messages) {
  let lastError;
  for (const model of OPENROUTER_MODELS) {
    try {
      let reply;
      try {
        reply = await callOpenRouterModel(model, systemPrompt, messages);
      } catch (err) {
        if (err.status !== 400) throw err;
        reply = await callOpenRouterModel(model, systemPrompt, messages, true);
      }
      return { reply, model };
    } catch (err) {
      lastError = err;
      console.error(`Trench AI: model ${model} failed`, err);
      if (!isRetryableOpenRouterError(err)) throw err;
    }
  }
  throw lastError;
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

  const posts = await getPosts();
  if (posts.length === 0) {
    return { statusCode: 502, body: JSON.stringify({ error: "No writing is indexed yet." }) };
  }

  const history = sanitizeHistory(payload.history);
  const messages = [...history, { role: "user", content: message }];
  const selected = selectRelevantPosts(message, posts);
  const systemPrompt = buildSystemPrompt(posts, selected);

  try {
    const start = Date.now();
    const { reply, model } = await callOpenRouter(systemPrompt, messages);
    const latencyMs = Date.now() - start;
    const sources = selected.map((p) => ({ title: p.title, slug: p.slug, url: p.url }));
    return { statusCode: 200, body: JSON.stringify({ reply, provider: "openrouter", model, latencyMs, sources }) };
  } catch (openRouterError) {
    console.error("Trench AI: OpenRouter failed", openRouterError);
    // `code` is only the upstream HTTP status (no message body, no key), so a
    // failing deploy can be diagnosed from the browser's network tab:
    // 401 = bad OPENROUTER_API_KEY, 402 = account out of credit, 404 on every
    // model = slugs retired or the account's privacy settings block free
    // models, 429 = free-tier rate limit.
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Trench AI is temporarily unavailable. Please try again shortly.",
        code: openRouterError.status ? `openrouter_${openRouterError.status}` : "openrouter_unreachable",
      }),
    };
  }
};
