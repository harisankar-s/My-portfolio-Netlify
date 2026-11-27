// BrainByte newsletter editions, read from the Substack RSS feed. Shared by the
// build (src/_data/editions.js -> /newsletter/ archive and the hub) and the
// two assistants (ask-writing.js, ask-hari.js), so all of them see the same
// list. Plain regex parsing: the feed is Substack's own, well-formed RSS 2.0,
// and this keeps the repo free of runtime dependencies.
//
// The RSS feed only carries roughly the latest 20 editions and no tags. Each
// edition's Substack tags (used to sort editions onto the /for/{audience}/
// pages) come from /api/v1/archive, which is undocumented: if it fails or
// changes shape, editions just come back with tags: [] and everything else
// still works.
//
// Never throws: a slow or failing feed returns [] so a build or a chat answer
// never breaks because Substack is down.

const FEED_TIMEOUT_MS = 8000;
const CACHE_MS = 10 * 60 * 1000;
const MAX_TEXT_CHARS = 6000;

const cache = new Map();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

// Plain-text fields are decoded even inside CDATA: Substack puts HTML entities
// there too (a title or subtitle can carry `I&#8217;ve`), and the templates
// escape the text, so an undecoded entity would show up literally on the page.
// `html` fields (content:encoded) keep their CDATA as-is; htmlToText decodes
// them after stripping the tags.
function field(item, tag, html = false) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (cdata) return html ? cdata[1] : decodeEntities(cdata[1]);
  return decodeEntities(m[1]);
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function parseFeed(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items
    .map((item) => {
      const url = field(item, "link").trim();
      const date = new Date(field(item, "pubDate"));
      const image = (item.match(/<enclosure[^>]*url="([^"]+)"/) || [])[1] || "";
      const slugMatch = url.match(/\/p\/([^/?#]+)/);
      return {
        title: field(item, "title").trim(),
        subtitle: field(item, "description").trim(),
        url,
        slug: slugMatch ? slugMatch[1] : url,
        date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
        image: decodeEntities(image),
        text: htmlToText(field(item, "content:encoded", true)).slice(0, MAX_TEXT_CHARS),
        tags: [],
      };
    })
    .filter((e) => e.title && /^https:\/\//.test(e.url) && e.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// slug -> ["Data Engineering", ...] for the newest 20 editions.
async function fetchTags(username) {
  try {
    const res = await fetch(`https://${username}.substack.com/api/v1/archive?sort=new&limit=20`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; site-build)" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`archive HTTP ${res.status}`);
    const data = await res.json();
    const posts = Array.isArray(data) ? data : (data && data.posts) || [];
    const map = new Map();
    posts.forEach((p) => {
      if (p && p.slug) map.set(p.slug, (p.postTags || []).filter((t) => t && t.name && !t.hidden).map((t) => t.name));
    });
    return map;
  } catch (err) {
    console.warn(`substack-feed: could not load tags (${err.message})`);
    return new Map();
  }
}

async function fetchEditions(username) {
  if (!username) return [];
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.editions;

  try {
    const res = await fetch(`https://${username}.substack.com/feed`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; site-build)" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Substack feed HTTP ${res.status}`);
    const [editions, tags] = await Promise.all([parseFeed(await res.text()), fetchTags(username)]);
    editions.forEach((e) => (e.tags = tags.get(e.slug) || []));
    cache.set(username, { at: Date.now(), editions });
    return editions;
  } catch (err) {
    console.warn(`substack-feed: could not load editions (${err.message})`);
    // A stale copy beats nothing.
    return hit ? hit.editions : [];
  }
}

module.exports = { fetchEditions, parseFeed };
