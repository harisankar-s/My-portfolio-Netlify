#!/usr/bin/env node
// Deletes a blog post and its images/posts/{slug}/ folder.
// Run: npm run delete-post          (interactive picker)
//  or: npm run delete-post -- slug  (skip straight to confirmation)

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");

const { IMAGES_ROOT, listPosts } = require("./lib/posts");

async function main() {
  const posts = listPosts();

  if (posts.length === 0) {
    console.log("No posts found in src/blog/posts/.");
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const argSlug = process.argv[2];

  let target;
  if (argSlug) {
    target = posts.find((p) => p.slug === argSlug);
    if (!target) {
      console.error(`No post found with slug "${argSlug}". Run "npm run list-posts" to see available slugs.`);
      rl.close();
      process.exit(1);
    }
  } else {
    console.log("Posts:\n");
    posts.forEach(({ slug, title, date }, i) => {
      console.log(`  ${i + 1}. [${date}] ${title} (${slug})`);
    });

    const answer = (await rl.question("\nEnter the number or slug of the post to delete: ")).trim();
    const index = Number(answer);
    target = Number.isInteger(index) && index >= 1 && index <= posts.length
      ? posts[index - 1]
      : posts.find((p) => p.slug === answer);

    if (!target) {
      console.error("Not a valid selection.");
      rl.close();
      process.exit(1);
    }
  }

  const imagesDir = path.join(IMAGES_ROOT, target.slug);
  const hasImages = fs.existsSync(imagesDir);

  console.log(`\nAbout to delete:`);
  console.log(`  src/blog/posts/${target.slug}.md`);
  if (hasImages) console.log(`  src/images/posts/${target.slug}/ (and everything in it)`);

  const confirm = (await rl.question("\nType \"yes\" to confirm: ")).trim().toLowerCase();
  rl.close();

  if (confirm !== "yes") {
    console.log("Cancelled.");
    return;
  }

  fs.unlinkSync(target.filePath);
  console.log(`Deleted src/blog/posts/${target.slug}.md`);

  if (hasImages) {
    fs.rmSync(imagesDir, { recursive: true, force: true });
    console.log(`Deleted src/images/posts/${target.slug}/`);
  }
}

main();
