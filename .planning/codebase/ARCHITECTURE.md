<!-- refreshed: 2026-09-06 -->
# Architecture

**Analysis Date:** 2026-09-06

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Eleventy Static Site Generator (v3)             │
│                  Input: src/ → Output: _site/                        │
├──────────────────────────────────┬──────────────────────────────────┤
│                                  │                                   │
│  Blog Surface (Light Theme)      │  Portfolio (Dark Theme)           │
│  src/blog/index.njk              │  src/index.html                   │
│  → permalink: /                  │  → permalink: /about/             │
│  `blog index, post listing`      │  `single-page profile`           │
└──────────────────────────────────┴──────────────────────────────────┘
         │                                  │
         ├─────────────────┬────────────────┤
         │                 │                 │
         ▼                 ▼                 ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  Post Collection │  │  Layouts         │  │  Data & Filters │
│  src/blog/posts/ │  │  article.njk     │  │  .eleventy.js   │
│  *.md files      │  │  base.njk        │  │  Luxon filters  │
│ (newest first)   │  │                  │  │  Tag counts     │
└──────────────────┘  └──────────────────┘  └─────────────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ▼                                         ▼
    Tag Pages                          Feed + Sitemap
    src/tags/index.njk                 src/feed.njk
    (paginated per tag)                src/sitemap.njk
         │                                    │
         └─────────────────┬───────────────────┘
                           │
                           ▼
                    Static Output (_site/)
                    → Deploys to Netlify
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Blog Index | Entry point (homepage), lists all posts with topic filtering | `src/blog/index.njk` |
| Portfolio Page | About page with profile, credentials, projects, clients, contact | `src/index.html` |
| Article Layout | Renders individual blog posts with byline, navigation, footer | `src/_includes/article.njk` |
| Base Layout | Renders non-post pages (tag pages, /now/) with shared header/footer | `src/_includes/base.njk` |
| Posts Collection | Gathers all `.md` files from `src/blog/posts/`, sorted newest-first | `.eleventy.js` (addCollection) |
| Custom Filters | Formats dates, slugifies, counts tags, estimates read time, extracts images | `.eleventy.js` |
| Global Data | Site title, URL, author, description | `src/_data/site.json` |
| Tag Pages | Dynamically generated index page per tag via pagination | `src/tags/index.njk` |
| Now Page | Static "what I'm working on" page | `src/now/index.njk` |
| Feed/Sitemap | Auto-generated Atom XML feed and sitemap for SEO/subscriptions | `src/feed.njk`, `src/sitemap.njk` |

## Pattern Overview

**Overall:** Static Site Generator with templated collections and pagination

**Key Characteristics:**
- **Build-time collection:** All pages pre-rendered at deploy time; no server or client-side routing
- **Dual-surface design:** Blog (root URL, light theme) and portfolio (subpage, dark theme) share one repo but have completely independent visual design and CSS
- **Template inheritance:** Nunjucks layouts (`base.njk`, `article.njk`) provide consistent headers/footers; each surface defines its own inline styles
- **Data-driven:** Post metadata (title, date, tags, excerpt) drives listing pages, feeds, and tag filters
- **Zero build tooling:** No Webpack, Babel, or transpilation; Eleventy handles Nunjucks rendering and Markdown-to-HTML conversion only

## Layers

**Eleventy Configuration & Filters (`src/.eleventy.js`):**
- Purpose: Configure Eleventy to read from `src/`, output to `_site/`, define custom filters and collections
- Location: `.eleventy.js` (root)
- Contains: Passthrough copy rules, posts collection definition, 6 custom Nunjucks filters (postDate, dateToRfc3339, slugify, tagCounts, readTime, firstImage)
- Depends on: Luxon library for datetime handling
- Used by: All templates when rendering dates, slugs, or dynamic lists

**Content Layer (Markdown Posts):**
- Purpose: Store blog content with structured frontmatter
- Location: `src/blog/posts/`
- Contains: `.md` files with YAML frontmatter (title, date, tags, excerpt, optional canonical/description)
- Depends on: `posts.json` directory data file that applies layout and URL structure
- Used by: Posts collection, feed, tag pages

**Template Layer (Nunjucks):**
- Purpose: Convert Markdown content + data into HTML
- Locations:
  - `src/_includes/article.njk` — Blog post template (Source Serif 4 serif font, light theme)
  - `src/_includes/base.njk` — Non-post pages template (Instrument Serif display font, light theme with mono body)
  - `src/blog/index.njk` — Blog homepage listing (custom embedded HTML/CSS, light theme)
  - `src/index.html` — Portfolio page (custom embedded HTML/CSS, dark theme, nearly 70KB inline)
  - `src/tags/index.njk` — Tag index pages (uses base layout)
  - `src/now/index.njk` — Now page (uses base layout)
- Depends on: Global data (`site.json`), posts collection, custom filters
- Used by: Eleventy during build to generate output

**Asset Layer:**
- Purpose: Store images, logos, post diagrams
- Locations: `src/images/` (copied verbatim to `_site/images/`), `src/source/css/` (if any CSS assets)
- Passthrough copy: Yes (not processed by Eleventy, copied as-is)
- Cache strategy: `/images/*` long-cache (30 days); `/images/posts/*` no-cache (revalidate immediately) for diagram updates

**Data Layer:**
- Purpose: Provide global site metadata (title, URL, author)
- Location: `src/_data/site.json`
- Contains: JSON object with `url`, `title`, `description`, `author`
- Used by: Layout templates for page `<head>` tags, feed XML, canonicals

## Data Flow

### Primary Request Path (Blog Homepage)

1. **Build trigger** — `npm run build` or Netlify build hook → `.eleventy.js` loads
2. **Collection assembly** (`src/.eleventy.js:10-14`) — Eleventy glob `src/blog/posts/*.md`, sorts by `date` descending (newest first), creates `collections.posts` array
3. **Site data load** (`src/_data/site.json`) — Global metadata injected into all template contexts
4. **Blog index render** (`src/blog/index.njk:1-614`) — Nunjucks processes frontmatter + template:
   - Iterates `collections.posts` (line 525)
   - First post becomes featured card (larger, distinct styling) via `{% if loop.first %}`
   - Remaining posts render in grid with date, read time, tags, excerpt, thumbnail
   - Sidebar topic list dynamically generated from `tagCounts` filter (line 490)
   - Client-side JS attaches click handlers to topic links (lines 594-610)
5. **Output** → `_site/index.html` (homepage)

### Secondary Flow: Tag Page Generation (Pagination)

1. **Pagination declaration** (`src/tags/index.njk:3-10`) — `eleventyComputed` reads all collection names, alias as `tag`
2. **Filter out non-post collections** — `filter: [all, posts]` excludes post metadata
3. **For each tag (every iteration):**
   - `eleventyComputed` dynamically sets `title`, `description`, `permalink`
   - Template iterates `collections[tag]` to list posts with that tag
   - Renders to `_site/tags/{{ tag | slugify }}/index.html`

### Feed Generation

1. **Feed template** (`src/feed.njk:1-27`) — Iterates `collections.posts`, writes Atom XML
2. **Filters applied:** `dateToRfc3339` for RFC 3339 timestamps, escaping for XML safety
3. **Output** → `_site/feed.xml`

### Sitemap Generation

1. **Sitemap template** (`src/sitemap.njk:1-38`) — Loops posts + tag pages, generates XML entries
2. **Change frequency heuristics:** homepage weekly, posts/tags weekly, about/now monthly
3. **Output** → `_site/sitemap.xml`

**State Management:**
- **No server state** — Everything is static, rendered at build time
- **Client-side state:** Only blog homepage topic filter (lines 594-610 in `src/blog/index.njk`) uses `document.querySelectorAll` to toggle post visibility; state is ephemeral (resets on page reload)
- **Post order:** Controlled by `collections.posts` sort in `.eleventy.js:13` (`b.date - a.date` for descending)

## Key Abstractions

**Collection Pattern:**
- Purpose: Gather, sort, and iterate over posts
- Examples: `collections.posts` (all posts), `collections.all` (all pages), dynamically created `collections[tag]` per tag
- Pattern: Defined in `.eleventy.js` via `addCollection("posts", ...)` callback; Nunjucks accesses via `{{ collections.posts }}`

**Nunjucks Filters:**
- Purpose: Transform data for display (formatting, URL-safe slugs, metadata extraction)
- Examples:
  - `postDate` — converts JS Date or ISO string to "Jun 2026" format
  - `readTime` — estimates minutes (word count ÷ 200) via regex on rendered HTML
  - `slugify` — converts "Data Engineering" → "data-engineering" for URLs
  - `tagCounts` — tallies posts per tag for sidebar counts
  - `firstImage` — regex match for first `<img src>` in HTML for thumbnails
- Pattern: Defined via `eleventyConfig.addFilter()`, used in templates as Nunjucks filter syntax `{{ value | filterName }}`

**Directory Data Files:**
- Purpose: Apply metadata to all files in a directory without repeating frontmatter
- Example: `src/blog/posts/posts.json` applies `layout: article.njk` and `permalink: /blog/{{ page.fileSlug }}/index.html` to every `.md` in that folder
- Pattern: Eleventy reads sibling `.json` files before processing directory files

**Layout Inheritance:**
- Purpose: Share HTML structure (nav, footer) across pages while allowing variation in `{% block %}` content
- Pattern: `base.njk` defines overall structure; child pages extend it with `{% block head %}` and `{% block body %}` overrides (see `src/tags/index.njk:8, 112`)
- Current state: Not all pages extend layouts; blog homepage and portfolio are standalone `.njk`/`.html` files with inline CSS

## Entry Points

**Blog Homepage:**
- Location: `src/blog/index.njk`
- Triggers: Build-time only; hardcoded `permalink: /`
- Responsibilities: Render the root URL `/` as blog listing; initialize client-side topic filter; display featured (first) post and feed of others; link to portfolio (`/about/`)

**Portfolio Page:**
- Location: `src/index.html`
- Triggers: Build-time only; hardcoded `permalink: /about/index.html`
- Responsibilities: Render `/about/` as a single-page profile; include inline HTML/CSS (~70KB); fetch 3 newest posts via Nunjucks loop (`{% for post in collections.posts | slice(0,3) %}`) for "Recent Writing" section

**Feed Entry Point:**
- Location: `src/feed.njk`
- Renders to: `_site/feed.xml`
- Purpose: Atom-format subscription feed; discovers posts via `collections.posts`

**Sitemap Entry Point:**
- Location: `src/sitemap.njk`
- Renders to: `_site/sitemap.xml`
- Purpose: SEO sitemap; lists homepage, portfolio, now page, all posts, all tag pages

## Architectural Constraints

- **Threading:** Single-threaded Node.js process; Eleventy runs builds sequentially at deploy time. No concurrent rendering.
- **Global state:** 
  - Module-level: `collections` object populated once per build in `.eleventy.js` (immutable after build starts)
  - No mutable module-level singletons for request handling (static site = no runtime state)
- **Circular imports:** None detected; Eleventy handles include order
- **Markdown engine:** Hardcoded to Nunjucks (`markdownTemplateEngine: "njk"`, `htmlTemplateEngine: "njk"`), so all `.md` files are rendered through Nunjucks before Markdown conversion (allows Nunjucks template syntax in posts)
- **Template rendering order:** Eleventy processes all files in dependency order; layouts are applied after Markdown conversion, so inline styles in `.njk` and `.html` entry files are preserved verbatim
- **No CSS preprocessing:** All CSS is inline in `<style>` blocks; no SCSS, PostCSS, or Tailwind
- **External dependencies:** Only Eleventy and Luxon; no Express, database, or external CMS

## Anti-Patterns

### Duplicate Navigation Code

**What happens:** Navigation bar is hardcoded in two places: `src/blog/index.njk` (lines 424-435) and `src/_includes/article.njk` (lines 56-72), and again in `src/_includes/base.njk` (lines 70-107), each with slightly different styling tokens. When URLs change (e.g., portfolio URL from `/about/` to something else), three files must be updated.

**Why it's wrong:** Maintenance burden; easy to miss one copy and create broken links or inconsistent theming across surfaces.

**Do this instead:** Create a shared `src/_includes/nav.njk` partial and include it via `{% include "nav.njk" %}` in each layout, passing theme variant as a variable. Or consolidate layouts so blog and portfolio surfaces use the same template with conditional styling.

### Monolithic CSS in Entry Files

**What happens:** Blog homepage CSS is a 420-line `<style>` block inline in `src/blog/index.njk` (lines 24-420). Portfolio CSS is ~2500 lines inline in `src/index.html`. No separation between reset, tokens, layout, components, responsive breakpoints. Adding a new component requires editing and hunting through hundreds of lines.

**Why it's wrong:** CSS becomes unmaintainable as the site grows; no reuse between surfaces; hard to find bug-causing rules because no clear cascade or scope boundaries.

**Do this instead:** Extract CSS into separate files under `src/source/css/` (e.g., `reset.css`, `tokens.css`, `blog.css`, `portfolio.css`) and use `<link>` or `@import` to load them. Or use Eleventy's asset pipeline to inline them at build time.

### Client-Side Topic Filtering Without Persistence

**What happens:** Blog homepage topic filter (lines 594-610 in `src/blog/index.njk`) uses `classList` to toggle `.entry` visibility. State is lost on page reload; no query parameter reflects selected tag (e.g., `/?tag=data-engineering`).

**Why it's wrong:** Shareable links don't work; if a user filters to a tag and shares the URL, recipient gets unfiltered blog. Analytics tools see all posts as loaded even if user filtered.

**Do this instead:** Use query parameters (`new URLSearchParams(location.search)`) to initialize filter state on page load, and update URL on filter click via `history.pushState()`. This makes the filter shareable and bookmarkable.

### Manual Date Format in Now Page

**What happens:** `/now/` page hardcodes "Last updated · June 2026" (line 94 in `src/now/index.njk`), not connected to frontmatter or a filter.

**Why it's wrong:** Update gets stale; must manually edit every time the page is refreshed. The `postDate` filter exists but isn't used here.

**Do this instead:** Add a `lastUpdated` field to `/now/` frontmatter and render it via the `postDate` filter: `{{ lastUpdated | postDate }}`.

## Error Handling

**Strategy:** Build-time errors halt the build and are logged to stderr; runtime errors (client-side, on the rendered page) are silent unless a browser console is open.

**Patterns:**
- **Missing post frontmatter:** Eleventy logs a warning but continues; missing `title` renders as `undefined`
- **Missing filter:** Nunjucks throws on undefined filter during render; build fails
- **Markdown parsing failure:** Markdown library (built into Eleventy) logs error; post may render partially or not at all
- **Missing layout:** Eleventy logs error; page renders without layout structure
- **No error boundaries:** No try/catch; failures are build-time only, not runtime

## Cross-Cutting Concerns

**Logging:** None; Eleventy logs to stdout/stderr during build. No application logging in rendered HTML.

**Validation:** 
- Frontmatter: YAML parser validates on build (Eleventy)
- Links: No validation; broken `href` values are rendered as-is (user discovers in browser)
- Image paths: No validation; missing `src` attributes are rendered as broken image icons

**Authentication:** None; entire site is public static HTML.

**Caching:**
- Build-time: Eleventy caches nothing; full rebuild on every deploy
- Client-side: `netlify.toml` sets:
  - `/images/*` — 30-day cache (static assets like logos, avatars)
  - `/images/posts/*` — no-cache (post diagrams must revalidate for updates)
  - HTML files (blog, posts, pages) — not explicitly cached in `netlify.toml`, so Netlify defaults apply

**Security Headers:** Configured in `netlify.toml` (lines 29-37):
- CSP allows CDN: `https://cdn.jsdelivr.net` (Mermaid), `https://cdn-images-1.medium.com` (article images)
- Frame-src: `'self'` (same-origin iframes only, for post diagrams)
- HSTS, X-Frame-Options, Referrer-Policy applied globally

---

*Architecture analysis: 2026-09-06*
