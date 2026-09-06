#!/usr/bin/env node
// Interactive scaffold for a new blog post. Run: npm run new-post
//
// Creates src/blog/posts/{slug}.md with frontmatter pre-filled, plus an
// empty src/images/posts/{slug}/ folder for that post's figures/diagrams.

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");

const { POSTS_DIR, IMAGES_ROOT } = require("./lib/posts");

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const title = (await rl.question("Title: ")).trim();
  if (!title) {
    console.error("A title is required.");
    rl.close();
    process.exit(1);
  }

  const subtitle = (await rl.question("Subtitle (optional, shown under the title): ")).trim();
  const tagsRaw = (await rl.question("Tags (comma-separated, e.g. Data Engineering, Architecture): ")).trim();
  const excerpt = (await rl.question("Excerpt (one or two sentences for the listing page): ")).trim();

  rl.close();

  const slug = slugify(title);
  if (!slug) {
    console.error("Could not derive a slug from that title — try a title with letters or numbers.");
    process.exit(1);
  }

  const postPath = path.join(POSTS_DIR, `${slug}.md`);
  if (fs.existsSync(postPath)) {
    console.error(`src/blog/posts/${slug}.md already exists — pick a different title, or edit that file directly.`);
    process.exit(1);
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const frontmatterLines = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
  ];
  if (subtitle) {
    frontmatterLines.push(`subtitle: "${subtitle.replace(/"/g, '\\"')}"`);
  }
  frontmatterLines.push(`date: ${todayIso()}`);
  if (tags.length) {
    frontmatterLines.push("tags:");
    tags.forEach((t) => frontmatterLines.push(`  - ${t}`));
  } else {
    frontmatterLines.push("tags: []");
  }
  frontmatterLines.push(`excerpt: "${(excerpt || "TODO: one-sentence teaser for the listing page.").replace(/"/g, '\\"')}"`);
  frontmatterLines.push("---");

  const body = `
# ${title}

TODO: write the post.

To add a static image, drop the file into \`src/images/posts/${slug}/\` and reference it with:

{% figure "your-image.png", "Alt text describing the image", "Caption shown under the image" %}

To embed an interactive HTML diagram from the same folder:

{% diagram "your-diagram.html", "Diagram title", "Caption shown under the diagram" %}
`;

  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(postPath, frontmatterLines.join("\n") + "\n" + body);

  const imagesDir = path.join(IMAGES_ROOT, slug);
  fs.mkdirSync(imagesDir, { recursive: true });

  console.log(`\nCreated src/blog/posts/${slug}.md`);
  console.log(`Created src/images/posts/${slug}/ (drop figures/diagrams here)`);
  console.log(`\nNext: npm start, then open http://localhost:8080/blog/${slug}/`);
}

main();
