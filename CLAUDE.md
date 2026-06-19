# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — local dev server with live reload (`eleventy --serve --watch`)
- `npm run build` — production build into `_site/` (`eleventy`)
- No test suite, linter, or framework build step. There is no "run a single test" — verification is visual via the dev server.

Node 18 is pinned for the Netlify build (`netlify.toml`). Eleventy and Luxon are the only dependencies.

## Architecture

Static site built with **Eleventy (11ty) v3**, deployed on **Netlify**. Input `src/`, output `_site/`, config in `.eleventy.js`. Two visually distinct surfaces share one repo:

1. **Portfolio** — `src/index.html`. A single ~70KB file with all HTML/CSS/JS inline, copied through unchanged (no templating). Dark theme, electric-lime accent. See `README.md` for the section-by-section anatomy and find-and-replace anchors for editing projects/clients/timeline entries.
2. **Blog** — Eleventy-templated, **light theme** (white bg, serif body font). Lives under `src/blog/`.

### Two separate layouts (do not assume they share CSS)

- `src/_includes/article.njk` — standalone layout for individual blog **posts**. Has its own `<style>:root{}` block (Source Serif 4 article font). Mermaid.js is loaded here from a CDN, so ```` ```mermaid ```` fenced blocks in posts render as diagrams.
- `src/_includes/base.njk` — layout for **non-post** pages (Instrument Serif display font, matches portfolio aesthetic).

Each has its own inline design tokens — editing one does **not** affect the other.

### Blog posts

- Post markdown files live in `src/blog/posts/*.md`.
- `src/blog/posts/posts.json` is a directory data file that applies `layout: article.njk` and `permalink: /blog/{slug}/index.html` to **every** post automatically — individual posts only need frontmatter (`title`, `subtitle`, `date`, `tags`, `excerpt`), not layout/permalink.
- The `posts` collection (defined in `.eleventy.js`) is sorted newest-first and drives `src/blog/index.njk` (listing), `src/tags/index.njk`, `src/feed.njk` (Atom), and `src/sitemap.njk`.
- The `tag` `"post"` is filtered out of category counts; other tags become sidebar category filters.

### Custom Eleventy filters (`.eleventy.js`)

`postDate` (→ "Jun 2026"), `dateToRfc3339` (feeds/sitemap), `slugify` (tag-page URLs), `tagCounts`, `readTime` (~200 wpm), `firstImage` (extracts first `<img>` src for blog thumbnails).

### Post assets and the `.eleventyignore` interplay

Per-post diagrams live in `src/images/posts/{post-slug}/` — SVGs (`<img>` in a `<figure>`) and **interactive HTML diagrams** (embedded via `<iframe>`). Critical setup:

- `.eleventyignore` contains `src/images/**` so Eleventy does **not** treat those HTML files as templates to render.
- `addPassthroughCopy("src/images")` in `.eleventy.js` still copies them verbatim to `_site/`.
- iframe HTML renders without the parent page's CSS, so any CSS variables it uses must be defined in its own `<style>:root{}` block.

### Caching (matters when post diagrams look stale)

`netlify.toml` sets `/images/*` to long cache (30 days) but `/images/posts/*` to `max-age=0, must-revalidate` so diagram/iframe updates propagate. The CSP there allows `cdn.jsdelivr.net` (Mermaid) and `cdn-images-1.medium.com` (images), and `frame-src 'self'` for same-origin diagram iframes. Changing diagram embedding or adding a CDN means updating this CSP.

### Redirects

`netlify.toml` redirects old `.html` blog URLs and the legacy Medium-article slug to current `/blog/{slug}/` paths. Add a redirect there when renaming a post slug.
