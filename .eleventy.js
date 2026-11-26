const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/source");
  eleventyConfig.addPassthroughCopy("src/theme");
  eleventyConfig.addPassthroughCopy("src/assets");
  // Downloadable guide PDFs, served on the main domain at /files/{name}
  eleventyConfig.addPassthroughCopy("src/files");

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

  // Filter: month heading, e.g. "November 2026" (/newsletter/ archive)
  eleventyConfig.addFilter("monthYear", (dateObj) => {
    return toDateTime(dateObj).toFormat("LLLL yyyy");
  });

  // Filter: long date, e.g. "26 November 2026" (guide pages)
  eleventyConfig.addFilter("longDate", (dateObj) => {
    return toDateTime(dateObj).toFormat("d LLLL yyyy");
  });

  // Filter: escape text, then turn `backticks` into <code> (guide data in
  // src/_data/guides.json writes code terms in backticks). Output with | safe.
  eleventyConfig.addFilter("ticks", (str) => {
    const esc = String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return esc.replace(/`([^`]+)`/g, "<code>$1</code>");
  });

  // Filter: like `ticks`, plus **bold** and [text](url) links (free resources
  // in src/_data/resources.js). Only http(s) and site-relative URLs become
  // links; external ones open in a new tab. Output with | safe.
  eleventyConfig.addFilter("rich", (str) => {
    const esc = String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return esc
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (m, text, url) =>
        url.startsWith("/")
          ? `<a href="${url}">${text}</a>`
          : `<a href="${url}" target="_blank" rel="noopener">${text}</a>`);
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

  // Filter: pick related posts by shared tags with the current post, newest
  // first as a tiebreaker; falls back to most recent other posts when no
  // tag overlap exists (e.g. the post's only tag is unique).
  eleventyConfig.addFilter("relatedPosts", function (posts, currentTags, currentUrl, limit) {
    const max = limit || 3;
    const currentSet = new Set(currentTags || []);

    const scored = posts
      .filter((post) => post.url !== currentUrl)
      .map((post) => {
        const overlap = (post.data.tags || []).filter((t) => currentSet.has(t)).length;
        return { post, overlap };
      });

    const withOverlap = scored.filter((s) => s.overlap > 0);
    const ranked = (withOverlap.length ? withOverlap : scored).sort(
      (a, b) => b.overlap - a.overlap || b.post.date - a.post.date
    );

    return ranked.slice(0, max).map((s) => s.post);
  });

  // Filter: first <img> src in rendered content (used for blog thumbnails)
  eleventyConfig.addFilter("firstImage", function (content) {
    if (!content) return "";
    const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : "";
  });

  // Everything lives on one domain and the hub (src/home.njk) is built at /,
  // so "Home" is always "/" (kept as a global for older templates).
  eleventyConfig.addGlobalData("homePath", "/");

  // Filter: pick posts by fileSlug, keeping the order of the slug list
  eleventyConfig.addFilter("postsBySlugs", (posts, slugs) =>
    (slugs || [])
      .map((slug) => (posts || []).find((p) => p.fileSlug === slug))
      .filter(Boolean)
  );

  // Filter: first item whose `key` equals `value` (Nunjucks `set` inside a
  // for-loop doesn't escape the loop, so lookups need a filter)
  // Audience pages (/for/{slug}/, src/_data/audiences.json).
  // Items of arr whose `key` is in values, in the order of values.
  eleventyConfig.addFilter("pickBy", (arr, key, values) =>
    (values || []).map((v) => (arr || []).find((x) => x && x[key] === v)).filter(Boolean)
  );
  // Substack editions tagged with any of the audience's substackTags.
  eleventyConfig.addFilter("editionsFor", (editions, audience) =>
    (editions || []).filter((e) => (e.tags || []).some((t) => audience.substackTags.includes(t)))
  );
  // Blog posts with any of the audience's blogTags, or listed in its posts.
  eleventyConfig.addFilter("postsFor", (posts, audience) =>
    (posts || []).filter(
      (p) =>
        audience.posts.includes(p.fileSlug) ||
        (p.data.tags || []).some((t) => audience.blogTags.includes(t))
    )
  );

  eleventyConfig.addFilter("findBy", (arr, key, value) =>
    (arr || []).find((item) => item && item[key] === value)
  );

  // Filter: total length of an array field across items, e.g. module count
  eleventyConfig.addFilter("sumLength", (arr, key) =>
    (arr || []).reduce((n, item) => n + ((item && item[key]) || []).length, 0)
  );

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

  // Shortcode: responsive YouTube embed via youtube-nocookie.com (no
  // tracking cookies until the reader presses play). Use in post markdown as:
  //   {% youtube "VIDEO_ID", "Video title" %}
  //   {% youtube "VIDEO_ID", "Video title", "Optional caption" %}
  // Pass the 11-character ID, not the full URL. The CSP in netlify.toml
  // allows frames from www.youtube-nocookie.com for this.
  eleventyConfig.addShortcode("youtube", function (id, title, caption) {
    const cap = caption ? `\n  <figcaption>${caption}</figcaption>` : "";
    return `<figure class="video-embed">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${title}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${cap}
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
