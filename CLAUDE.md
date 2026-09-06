# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — local dev server with live reload (`eleventy --serve --watch`)
- `npm run build` — production build into `_site/` (`eleventy`)
- `npm run new-post` — interactive scaffold (`scripts/new-post.js`) that creates `src/blog/posts/{slug}.md` with frontmatter pre-filled and an empty `src/images/posts/{slug}/` folder. Prefer this over hand-creating post files.
- `npm run list-posts` — lists every post in `src/blog/posts/` with its date and title (`scripts/list-posts.js`).
- `npm run delete-post` — interactive picker (`scripts/delete-post.js`) that deletes a post's `.md` file and its `src/images/posts/{slug}/` folder after confirmation; pass a slug directly to skip the picker (`npm run delete-post -- some-slug`).
- No test suite, linter, or framework build step. There is no "run a single test" — verification is visual via the dev server.

Node 18 is pinned for the Netlify build (`netlify.toml`). Eleventy and Luxon are the only dependencies.

## Architecture

Static site built with **Eleventy (11ty) v3**, deployed on **Netlify**. Input `src/`, output `_site/`, config in `.eleventy.js`. Two visually distinct surfaces share one repo, and **the blog owns the root URL, not the portfolio**:

1. **Blog** (`/`) — Eleventy-templated, **light theme** (white bg, serif body font). `src/blog/index.njk` sets `permalink: /`, so the writing listing is the actual homepage. Post markdown lives under `src/blog/posts/`.
2. **Portfolio** (`/about/`) — `src/index.html`, a single ~70KB file with almost all HTML/CSS/JS inline (dark theme, electric-lime accent). It sets `permalink: /about/index.html` in its frontmatter and **is still run through the Nunjucks engine**, not copied verbatim: its "Recent Writing" section (`{% for post in collections.posts %}`, near the bottom of the file) pulls the 3 newest posts from the same `posts` collection the blog uses. Any edit to how posts render there needs the `postDate`/`readTime` filters below, not hand-written HTML. See `README.md` for the section-by-section anatomy and find-and-replace anchors for editing projects/clients/timeline entries (note: the README's "no build step / just open index.html" framing predates the Eleventy migration and no longer applies).

Cross-links between the two surfaces are hardcoded `href="/"` and `href="/about/"` in each layout's nav — there's no shared nav partial, so a URL change to either homepage means updating both `base.njk`/`article.njk` and `src/index.html`.

### Two separate layouts (do not assume they share CSS)

- `src/_includes/article.njk` — standalone layout for individual blog **posts**. Has its own `<style>:root{}` block (Source Serif 4 article font). Mermaid.js is loaded here from a CDN, so ```` ```mermaid ```` fenced blocks in posts render as diagrams.
- `src/_includes/base.njk` — layout for **non-post** pages (Instrument Serif display font, matches portfolio aesthetic).

Each has its own inline design tokens — editing one does **not** affect the other.

### Blog posts

- Post markdown files live in `src/blog/posts/*.md`.
- `src/blog/posts/posts.json` is a directory data file that applies `layout: article.njk` and `permalink: /blog/{slug}/index.html` to **every** post automatically — individual posts only need frontmatter (`title`, `subtitle`, `date`, `tags`, `excerpt`), not layout/permalink.
- The `posts` collection (defined in `.eleventy.js`) is sorted newest-first and drives `src/blog/index.njk` (listing), `src/tags/index.njk`, `src/feed.njk` (Atom), and `src/sitemap.njk`.
- The `tag` `"post"` is filtered out of category counts; other tags become sidebar category filters.

### Custom Eleventy filters and shortcodes (`.eleventy.js`)

Filters: `postDate` (→ "Jun 2026"), `dateToRfc3339` (feeds/sitemap), `slugify` (tag-page URLs), `tagCounts`, `readTime` (~200 wpm), `firstImage` (extracts first `<img>` src for blog thumbnails).

Shortcodes: `figure` and `diagram` — see "Post assets" below.

### Other non-post pages

- `src/tags/index.njk` — one file, paginated (`pagination.data: collections`, `alias: tag`) into one output page per tag at `/tags/{{ tag | slugify }}/`, via `eleventyComputed` for `title`/`description`/`permalink`. Edit this single template to change every tag page at once.
- `src/now/index.njk` — a standalone `/now/` page using `base.njk`, not part of the `posts` collection.
- `src/_data/site.json` — global data (`site.title`, `site.url`, `site.description`, `site.author`) referenced in `base.njk`/`article.njk` for the Atom `<link>` tag and feed/sitemap generation.

### Post assets and the `.eleventyignore` interplay

Per-post diagrams live in `src/images/posts/{post-slug}/` — SVGs/PNGs (`<img>` in a `<figure>`) and **interactive HTML diagrams** (embedded via `<iframe>`). Critical setup:

- `.eleventyignore` contains `src/images/**` so Eleventy does **not** treat those HTML files as templates to render.
- `addPassthroughCopy("src/images")` in `.eleventy.js` still copies them verbatim to `_site/`.
- iframe HTML renders without the parent page's CSS, so any CSS variables it uses must be defined in its own `<style>:root{}` block.

Don't hand-write the `<figure>`/`<img>`/`<iframe>` markup in post content — use the `figure` and `diagram` Eleventy shortcodes (defined in `.eleventy.js`, work inside post markdown because `markdownTemplateEngine: "njk"` runs Nunjucks over the content before markdown-it parses it):

```
{% figure "diagram.png", "Alt text", "Caption shown under the image" %}
{% diagram "diagram.html", "Diagram title", "Caption shown under the diagram" %}
{% diagram "diagram.html", "Diagram title", "Caption", 600 %}
```

Both default to resolving the file against `src/images/posts/{fileSlug}/`. A handful of older posts (e.g. `building-enterprise-data-platform-lessons-learned.md`) have an asset folder name that doesn't match the post's fileSlug — pass an explicit folder as the last argument (`{% figure "...", "...", "...", "other-folder" %}` / `{% diagram "...", "...", "...", 440, "other-folder" %}`) in that case.

### Caching (matters when post diagrams look stale)

`netlify.toml` sets `/images/*` to long cache (30 days) but `/images/posts/*` to `max-age=0, must-revalidate` so diagram/iframe updates propagate. The CSP there allows `cdn.jsdelivr.net` (Mermaid) and `cdn-images-1.medium.com` (images), and `frame-src 'self'` for same-origin diagram iframes. Changing diagram embedding or adding a CDN means updating this CSP.

### Redirects

`netlify.toml` redirects old `.html` blog URLs and the legacy Medium-article slug to current `/blog/{slug}/` paths. Add a redirect there when renaming a post slug.
