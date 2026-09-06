#!/usr/bin/env node
// Lists all blog posts in src/blog/posts/. Run: npm run list-posts

const { listPosts } = require("./lib/posts");

function main() {
  const posts = listPosts();

  if (posts.length === 0) {
    console.log("No posts found in src/blog/posts/.");
    return;
  }

  console.log(`${posts.length} post(s):\n`);
  posts.forEach(({ slug, title, date }) => {
    console.log(`${date}  ${slug}`);
    console.log(`  ${title}\n`);
  });
}

main();
