const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/source");
  eleventyConfig.addPassthroughCopy("src/theme");

  // Blog posts collection — sorted newest first
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/blog/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Coerce a frontmatter date (JS Date or ISO string) into a Luxon DateTime
  const toDateTime = (dateObj) =>
    dateObj instanceof Date
      ? DateTime.fromJSDate(dateObj, { zone: "utc" })
      : DateTime.fromISO(String(dateObj), { zone: "utc" });

  // Filter: format date as "Jun 2026"
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return toDateTime(dateObj).toFormat("LLL yyyy");
  });

  // Filter: RFC 3339 date for RSS/Atom feeds and sitemaps
  eleventyConfig.addFilter("dateToRfc3339", (dateObj) => {
    return toDateTime(dateObj).toISO();
  });

  // Filter: URL-safe slug for tag pages
  eleventyConfig.addFilter("slugify", (str) => {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  });

  // Filter: compute tag → count map from posts collection
  eleventyConfig.addFilter("tagCounts", function (posts) {
    const counts = {};
    posts.forEach((post) => {
      const tags = post.data.tags || [];
      tags
        .filter((t) => t !== "post")
        .forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
    });
    return counts;
  });

  // Filter: estimate read time from content
  eleventyConfig.addFilter("readTime", function (content) {
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  });

  // Filter: first <img> src in rendered content (used for blog thumbnails)
  eleventyConfig.addFilter("firstImage", function (content) {
    if (!content) return "";
    const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : "";
  });

  // Shortcode: static figure image, resolved against this post's asset folder
  // (src/images/posts/{slug}/ by default). Use in post markdown as:
  //   {% figure "diagram.png", "alt text", "caption text" %}
  // Pass a 4th argument to override the folder when it doesn't match the
  // post's fileSlug (some older posts use a shorter asset folder name):
  //   {% figure "diagram.png", "alt text", "caption text", "other-folder" %}
  eleventyConfig.addShortcode("figure", function (filename, alt, caption, folder) {
    const slug = folder || this.page.fileSlug;
    return `<figure>
  <img src="/images/posts/${slug}/${filename}" alt="${alt}" width="100%" style="display:block;background:#fff;padding:16px;" />
  <figcaption>${caption}</figcaption>
</figure>`;
  });

  // Shortcode: embedded interactive HTML diagram, resolved against this
  // post's asset folder (src/images/posts/{slug}/ by default). Use in post
  // markdown as:
  //   {% diagram "diagram.html", "title text", "caption text" %}
  //   {% diagram "diagram.html", "title text", "caption text", 600 %}
  // Pass a 5th argument to override the folder when it doesn't match the
  // post's fileSlug (some older posts use a shorter asset folder name):
  //   {% diagram "diagram.html", "title text", "caption text", 600, "other-folder" %}
  eleventyConfig.addShortcode("diagram", function (filename, title, caption, height, folder) {
    const slug = folder || this.page.fileSlug;
    const h = height || 440;
    return `<figure>
  <iframe src="/images/posts/${slug}/${filename}" width="100%" height="${h}" frameborder="0" style="border-radius:8px;border:1px solid rgba(0,0,0,0.08);display:block;" title="${title}"></iframe>
  <figcaption>${caption}</figcaption>
</figure>`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
