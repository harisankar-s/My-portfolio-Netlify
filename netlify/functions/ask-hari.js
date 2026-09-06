const profile = require("../../src/_data/profile.json");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 6;
const MAX_ARTICLE_TEXT_LENGTH = 4000;

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

function buildSystemPrompt(articleContext) {
  const facts = JSON.stringify(profile, null, 2);

  let prompt = `You are AskHari.ai, the assistant embedded on Harisankar "Hari" Sivankutty's personal site (harisankarsivankutty.in).

You help two kinds of visitors:
1. Recruiters/hiring managers asking about Hari's professional background, skills, certifications, clients, and experience.
2. Readers of Hari's blog asking questions about the specific article they're reading.

Answer ONLY using the facts given below. If something isn't covered by these facts, say you don't have that information rather than guessing or inventing details. Keep answers concise, professional, and friendly — suited to a recruiter skimming for a quick answer. Use plain text, not markdown headers.

Here are the verified facts about Hari, as JSON:
${facts}`;

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
  const systemPrompt = buildSystemPrompt(payload.articleContext);

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
