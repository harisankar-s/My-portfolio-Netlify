# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Security

- Never read, open, or print the contents of `.env` while exploring or working in this codebase. It holds real API keys (`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`). Use `.env.example` instead to see which variables exist — it only contains empty/placeholder values.

## Commands

- `npm start` — local dev server with live reload (`eleventy --serve --watch`)
- `npm run build` — production build into `_site/` (`eleventy`)
- `npm run new-post` — interactive scaffold (`scripts/new-post.js`) that creates `src/blog/posts/{slug}.md` with frontmatter pre-filled and an empty `src/images/posts/{slug}/` folder. Prefer this over hand-creating post files.
- `npm run list-posts` — lists every post in `src/blog/posts/` with its date and title (`scripts/list-posts.js`).
- `npm run delete-post` — interactive picker (`scripts/delete-post.js`) that deletes a post's `.md` file and its `src/images/posts/{slug}/` folder after confirmation; pass a slug directly to skip the picker (`npm run delete-post -- some-slug`).
- No test suite, linter, or framework build step. There is no "run a single test" — verification is visual via the dev server.
- `npm start` (`eleventy --serve`) does **not** run Netlify Functions, so the AskHari.ai chat widget will fail its `fetch` calls under it. Use `netlify dev` (Netlify CLI, e.g. `npx netlify-cli dev`) instead when working on the assistant — it proxies Eleventy and runs `netlify/functions/*` locally. Copy `.env.example` to `.env` first.

Node 18 is pinned for the Netlify build (`netlify.toml`). Eleventy and Luxon are the only `devDependencies`; there are no runtime `dependencies` — the AskHari.ai function uses Node 18's built-in `fetch` rather than adding an SDK.

## Architecture

Static site built with **Eleventy (11ty) v3**, deployed on **Netlify**. Input `src/`, output `_site/`, config in `.eleventy.js`. Two visually distinct surfaces share one repo and one build:

1. **Blog** — Eleventy-templated, **light theme** (white bg, serif body font). `src/blog/index.njk` sets `permalink: /`, so within the build the writing listing is at the root. Post markdown lives under `src/blog/posts/`.
2. **Portfolio** — `src/index.html`, a single ~70KB file with almost all HTML/CSS/JS inline (dark theme, electric-lime accent). It sets `permalink: /about/index.html` in its frontmatter and **is still run through the Nunjucks engine**, not copied verbatim: its "Recent Writing" section (`{% for post in collections.posts %}`, near the bottom of the file) pulls the 3 newest posts from the same `posts` collection the blog uses. Any edit to how posts render there needs the `postDate`/`readTime` filters below, not hand-written HTML. See `README.md` for the section-by-section anatomy and find-and-replace anchors for editing projects/clients/timeline entries (note: the README's "no build step / just open index.html" framing predates the Eleventy migration and no longer applies).

### Domain split: the build's `/` and `/about/` are not the public homepages

The Eleventy build itself always puts the blog listing at `/` and the portfolio at `/about/` — but in production these two paths are presented as two separate domains, via `netlify/edge-functions/domain-router.js`:

- **`harisankarsivankutty.in`** (+ `www`) — the profile/portfolio domain. The edge function internally rewrites `/` to serve the `/about/` build output. Any other path not in its small allowlist (static assets, `/api/*`, `/.netlify/*`) 301s to the blog subdomain, so blog content is never dual-indexed.
- **`blog.harisankarsivankutty.in`** — the blog domain, served as the build outputs it (blog listing at `/`, posts at `/blog/{slug}/`, `/tags/*`, `/ask/`, `/now/`, feed, sitemap). `/about/` 301s back to the apex domain.

Both domains are attached as custom domains on the **same** Netlify site — this is one build, routed by hostname, not two separate deployments.

Because of this split, cross-links between the two surfaces are **absolute, cross-domain URLs**, not relative paths — relative links only work for same-domain navigation. Both domains live in `src/_data/site.json` (`url` = blog subdomain, `portfolioUrl` = apex domain) and every template references those, never a literal domain string: `src/index.html` (portfolio) links to blog posts/`/ask/`/blog home via `{{ site.url }}...`, while `base.njk`/`article.njk`/`src/blog/index.njk` (blog surfaces) link to the portfolio via `{{ site.portfolioUrl }}`, and `sitemap.njk`'s portfolio entry does the same. There's no shared nav partial, so adding a new cross-surface link means using the right `site.*` variable in whichever template needs it. The one exception is `netlify/edge-functions/domain-router.js` — it runs on Netlify's separate Deno edge pipeline and can't import `site.json`, so its hostname constants are kept in sync with `site.json` by hand (comment in the file notes this).

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

### AskHari.ai (chat assistant)

A site-wide chat widget answering recruiter questions about Hari's background and reader questions about the article they're on:

- `src/_data/profile.json` — the assistant's sole source of truth about Hari (certifications, skills, experience, clients). Keep it in sync with `src/index.html`'s content when either changes; nothing else reads this file at build time except the widget's backend.
- `netlify/functions/ask-hari.js` — the backend. Calls the Anthropic Messages API first (`ANTHROPIC_API_KEY`); on any failure or missing key, falls back to OpenRouter (`OPENROUTER_API_KEY`) so the widget stays functional on a free/open-source model. `netlify.toml` proxies `/api/ask-hari` → this function so the browser never sees the `/.netlify/functions/` path.
- `src/assets/ask-hari-widget.{css,js}` — the one shared widget UI (passthrough-copied via `.eleventy.js`), included with two `<link>`/`<script>` tags near `</body>` in all three of `base.njk`, `article.njk`, and `src/index.html` — the only intentional exception to "no shared partial" in this repo, since the alternative was tripling the widget markup.
- On article pages the widget auto-detects `.article-body`/`.article-title` in the DOM and sends that article's text as context, so it can answer questions about the specific post being read as well as about Hari's profile.
- Both API keys are read from env vars only, never hardcoded — see `.env.example`.
