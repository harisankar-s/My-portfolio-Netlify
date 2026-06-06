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

  // Filter: format date as "Jun 2026"
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLL yyyy");
  });

  // Filter: RFC 3339 date for RSS/Atom feeds and sitemaps
  eleventyConfig.addFilter("dateToRfc3339", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO();
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
