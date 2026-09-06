const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "..", "..", "src", "blog", "posts");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 6;
const TOP_N_POSTS = 5;
const MAX_POST_CHARS = 3000;

// Ask My Writing only ever calls free OpenRouter models — it must never
// spend Anthropic credits, unlike the AskHari.ai widget which is
// Anthropic-first. Keep every entry here pinned to a ":free" OpenRouter
// model. Tried in order; a 429/5xx from one (shared free-tier pools get
// rate-limited upstream fairly often) falls through to the next instead of
// failing the whole request.
const OPENROUTER_MODELS = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "google/gemma-4-31b-it:free",
      "z-ai/glm-5.2:free",
      "minimax/minimax-m3:free",
      "google/gemma-4-26b-a4b-it:free",
    ];

// Common words excluded from relevance scoring so they don't dilute matches
// against real keywords in the question.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "what", "when", "where", "which",
  "who", "how", "why", "have", "has", "had", "you", "your", "about", "does",
  "did", "with", "this", "that", "these", "those", "from", "into", "can",
  "could", "would", "should", "any", "some", "post", "posts", "article",
  "articles", "blog", "write", "written", "writing",
]);

// Posts change independently of deploys, so this is read fresh per cold
// start and cached for the lifetime of the warm function container rather
// than baked in at build time.
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

  return {
    slug,
    title,
    date: dateMatch ? dateMatch[1] : "",
    tags,
    excerpt,
    body,
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

function getPosts() {
  if (!cachedPosts) cachedPosts = loadPosts();
  return cachedPosts;
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
      return `- "${p.title}" (${p.date}${tagsPart}) — /blog/${p.slug}/\n  ${p.excerpt}`;
    })
    .join("\n");
}

function buildSystemPrompt(posts, selectedPosts) {
  const index = buildIndexText(posts);
  const articles = selectedPosts
    .map((p) => `### "${p.title}" (/blog/${p.slug}/)\n${p.body.slice(0, MAX_POST_CHARS)}`)
    .join("\n\n---\n\n");

  return `You are "Ask My Writing", an assistant scoped only to Harisankar "Hari" Sivankutty's blog posts on data engineering, GenAI, and cloud architecture.

Answer ONLY using the article content and index provided below. If Hari's writing doesn't cover something, say so plainly rather than guessing or using outside knowledge. When you reference a post, name it and link it in markdown like [Post Title](/blog/slug/) so the reader can open it. Keep answers concise and conversational, not a bulleted essay.

Full index of all posts (title, date, tags, one-line excerpt):
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

async function callOpenRouterModel(model, systemPrompt, messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://harisankarsivankutty.in",
      "X-Title": "Ask My Writing",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
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

// A missing key or a malformed request (4xx other than 429) won't be fixed
// by trying another model, so only fall through on rate limits/server
// errors — anything else fails fast.
function isRetryableOpenRouterError(err) {
  return !err.status || err.status === 429 || err.status >= 500;
}

async function callOpenRouter(systemPrompt, messages) {
  let lastError;
  for (const model of OPENROUTER_MODELS) {
    try {
      return await callOpenRouterModel(model, systemPrompt, messages);
    } catch (err) {
      lastError = err;
      console.error(`Ask My Writing: model ${model} failed`, err);
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

  const posts = getPosts();
  if (posts.length === 0) {
    return { statusCode: 502, body: JSON.stringify({ error: "No writing is indexed yet." }) };
  }

  const history = sanitizeHistory(payload.history);
  const messages = [...history, { role: "user", content: message }];
  const selected = selectRelevantPosts(message, posts);
  const systemPrompt = buildSystemPrompt(posts, selected);

  try {
    const reply = await callOpenRouter(systemPrompt, messages);
    return { statusCode: 200, body: JSON.stringify({ reply, provider: "openrouter" }) };
  } catch (openRouterError) {
    console.error("Ask My Writing: OpenRouter failed", openRouterError);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Ask My Writing is temporarily unavailable. Please try again shortly." }),
    };
  }
};
