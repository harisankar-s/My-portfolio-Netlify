const { getStore } = require("@netlify/blobs");

const MAX_NAME_LENGTH = 60;
const MAX_TEXT_LENGTH = 1500;
const MAX_COMMENTS_PER_POST = 500;
const MAX_UPVOTES_PER_POST = 5000;
const SLUG_PATTERN = /^[a-z0-9-]{1,200}$/;

function isValidSlug(slug) {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  };
}

async function getComments(slug) {
  const store = getStore("comments");
  const data = await store.get(slug, { type: "json" });
  return Array.isArray(data) ? data : [];
}

async function getUpvotes(slug) {
  const store = getStore("upvotes");
  const data = await store.get(slug, { type: "json" });
  return Array.isArray(data) ? data : [];
}

async function handleGet(event) {
  const slug = event.queryStringParameters && event.queryStringParameters.slug;
  if (!isValidSlug(slug)) return jsonResponse(400, { error: "Invalid or missing slug" });

  const [comments, upvotes] = await Promise.all([getComments(slug), getUpvotes(slug)]);
  return jsonResponse(200, {
    comments: comments.map((c) => ({ id: c.id, name: c.name, text: c.text, createdAt: c.createdAt })),
    upvotes: { count: upvotes.length },
  });
}

async function handlePostComment(slug, payload) {
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  if (!text) return jsonResponse(400, { error: "Comment text is required" });
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonResponse(400, { error: `Comment must be under ${MAX_TEXT_LENGTH} characters` });
  }

  const store = getStore("comments");
  const comments = await getComments(slug);
  if (comments.length >= MAX_COMMENTS_PER_POST) {
    return jsonResponse(429, { error: "This post has reached its comment limit" });
  }

  const comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name || "Anonymous",
    text,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  await store.setJSON(slug, comments);
  return jsonResponse(200, { comment });
}

async function handlePostUpvote(slug, payload) {
  const voterId = typeof payload.voterId === "string" ? payload.voterId.trim().slice(0, 80) : "";
  if (!voterId) return jsonResponse(400, { error: "voterId is required" });

  const store = getStore("upvotes");
  const voters = await getUpvotes(slug);
  const existingIndex = voters.indexOf(voterId);

  let upvoted;
  if (existingIndex >= 0) {
    voters.splice(existingIndex, 1);
    upvoted = false;
  } else {
    if (voters.length >= MAX_UPVOTES_PER_POST) {
      return jsonResponse(429, { error: "This post has reached its upvote limit" });
    }
    voters.push(voterId);
    upvoted = true;
  }

  await store.setJSON(slug, voters);
  return jsonResponse(200, { upvoted, count: voters.length });
}

async function handlePost(event) {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const slug = payload.slug;
  if (!isValidSlug(slug)) return jsonResponse(400, { error: "Invalid or missing slug" });

  // Honeypot field — real visitors never fill this in.
  if (typeof payload.website === "string" && payload.website.trim()) {
    return jsonResponse(200, { ok: true });
  }

  if (payload.action === "comment") return handlePostComment(slug, payload);
  if (payload.action === "upvote") return handlePostUpvote(slug, payload);
  return jsonResponse(400, { error: "Unknown action" });
}

exports.handler = async (event) => {
  if (event.httpMethod === "GET") return handleGet(event);
  if (event.httpMethod === "POST") return handlePost(event);
  return jsonResponse(405, { error: "Method not allowed" });
};
