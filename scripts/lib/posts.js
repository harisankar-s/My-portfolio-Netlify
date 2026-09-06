// Shared helpers for listing blog post frontmatter across CLI scripts.

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "..", "..", "src", "blog", "posts");
const IMAGES_ROOT = path.join(__dirname, "..", "..", "src", "images", "posts");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  const fields = { title: null, date: null };
  if (!match) return fields;

  const block = match[1];
  const titleMatch = block.match(/^title:\s*"?(.*?)"?\s*$/m);
  const dateMatch = block.match(/^date:\s*"?(.+?)"?\s*$/m);

  if (titleMatch) fields.title = titleMatch[1];
  if (dateMatch) fields.date = dateMatch[1];

  return fields;
}

function listPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { title, date } = parseFrontmatter(raw);
      return { slug, title: title || slug, date: date || "unknown", filePath };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

module.exports = { POSTS_DIR, IMAGES_ROOT, listPosts };
