# Codebase Structure

**Analysis Date:** 2026-09-06

## Directory Layout

```
project-root/
├── .eleventy.js              # Eleventy config: collections, filters, passthrough copies
├── netlify.toml              # Netlify build, redirects, caching, CSP headers
├── package.json              # npm scripts: build, start
├── package-lock.json         # npm lockfile (Eleventy + Luxon pinned)
│
├── src/                       # Eleventy input directory (copied to _site on build)
│   ├── _includes/             # Nunjucks layouts and partials
│   │   ├── article.njk        # Blog post template (serif font, light theme)
│   │   └── base.njk           # Non-post pages template (mono body, light theme)
│   │
│   ├── _data/                 # Global data objects (injected into all templates)
│   │   └── site.json          # Site metadata (url, title, description, author)
│   │
│   ├── blog/                  # Blog content and index
│   │   ├── index.njk          # Blog homepage listing (permalink: /)
│   │   └── posts/             # Blog post markdown files
│   │       ├── posts.json     # Directory config: layout + permalink pattern
│   │       ├── *.md           # Individual post files (frontmatter + markdown)
│   │
│   ├── tags/                  # Dynamic tag archive pages
│   │   └── index.njk          # Single template, paginated per tag
│   │
│   ├── now/                   # Standalone /now/ page
│   │   └── index.njk          # What I'm working on (uses base.njk layout)
│   │
│   ├── index.html             # Portfolio page (permalink: /about/index.html)
│   │
│   ├── feed.njk               # Atom XML feed (permalink: /feed.xml)
│   ├── sitemap.njk            # XML sitemap (permalink: /sitemap.xml)
│   │
│   ├── images/                # Image assets (passthrough copy, no processing)
│   │   ├── logos/             # Brand logos for sidebar links
│   │   ├── profile/           # Author avatars and portraits
│   │   ├── posts/             # Per-post asset folders
│   │   │   ├── enterprise-data-platform/
│   │   │   ├── medallion-is-a-vocabulary/
│   │   │   ├── seven-principles-data-pipelines/
│   │   │   └── traditional-ai-vs-agentic-ai-vs-agentic-rag/
│   │   └── favicon.png
│   │
│   └── source/                # CSS/JS assets (if any; passthrough copy)
│       └── css/               # (currently empty; all CSS inline in layouts)
│
├── _site/                     # Eleventy output directory (generated on build)
│   ├── index.html             # Blog homepage (from src/blog/index.njk)
│   ├── feed.xml               # Atom feed
│   ├── sitemap.xml            # Sitemap
│   ├── about/
│   │   └── index.html         # Portfolio (from src/index.html)
│   ├── now/
│   │   └── index.html         # Now page (from src/now/index.njk)
│   ├── blog/
│   │   └── {post-slug}/
│   │       └── index.html     # Individual post HTML
│   ├── tags/
│   │   └── {tag-slug}/
│   │       └── index.html     # Tag archive page
│   └── images/                # Copied from src/images/
│
├── .git/                      # Git history
├── .gitignore                 # Git ignore rules
├── .claude/                   # Claude Code configuration
│   ├── settings.local.json
│   └── hooks/                 # Git hooks and harness integrations
│
├── .planning/                 # Planning documents (this folder)
│   └── codebase/              # Architecture maps
│       ├── ARCHITECTURE.md    # Layer patterns, data flow
│       └── STRUCTURE.md       # Directory layout, file locations
│
├── .npmrc                     # npm config (if any auth tokens)
├── README.md                  # Portfolio setup guide (legacy/outdated)
└── node_modules/              # npm packages (Eleventy, Luxon)
```

## Directory Purposes

**`src/` (Eleventy input):**
- Purpose: Source content and templates for static site
- Contains: Nunjucks layouts, Markdown posts, global data, assets
- Key files: `index.html` (portfolio), `blog/index.njk` (blog homepage), `.eleventy.js` (config)

**`src/_includes/` (Layouts):**
- Purpose: Nunjucks templates for page structure
- Contains: `article.njk` (post template), `base.njk` (non-post pages)
- Separation: Two completely independent layouts; no shared base between them for typography/color

**`src/_data/` (Global data):**
- Purpose: JSON objects injected into every template context
- Contains: `site.json` with URL, title, author, description
- Access pattern: `{{ site.url }}`, `{{ site.title }}` in any template

**`src/blog/` (Blog content):**
- Purpose: Blog homepage and post collection
- Contains: `index.njk` (homepage), `posts/` subdirectory
- Homepage: Lists all posts with topic sidebar; featured (first) post highlighted
- Posts directory: All `.md` files treated as blog content via `posts.json` directory config

**`src/blog/posts/` (Post markdown):**
- Purpose: Store blog content as frontmatter + Markdown
- Files: One `.md` per post; naming convention is slug (e.g., `from-bigquery-to-snowflake-real-world-analytics-migration.md`)
- Frontmatter required: `title`, `date`, `tags`, `excerpt`
- Frontmatter optional: `canonical`, `description`
- Output: Rendered to `_site/blog/{slug}/index.html` by `posts.json` permalink pattern

**`src/tags/` (Dynamic tag pages):**
- Purpose: Generate one archive page per unique tag found in posts
- Template: Single `index.njk` file, paginated via `pagination.data: collections`
- Output: One page per tag at `_site/tags/{tag-slug}/index.html`
- Use case: Browse all posts tagged "Data Engineering", "GenAI", etc.

**`src/now/` (Now page):**
- Purpose: Static "what I'm currently working on" page
- Template: `index.njk` (extends `base.njk` layout)
- Output: `_site/now/index.html`
- Content: Sections for building, learning, reading, interested-in

**`src/images/` (Assets):**
- Purpose: Store images for posts, profile, logos (not processed by Eleventy)
- Subdirectories:
  - `logos/` — Brand logos (LinkedIn, Medium)
  - `profile/` — Author avatars and portraits (referenced in blog index, article bylines)
  - `posts/{post-slug}/` — Per-post diagrams (SVGs, interactive HTML iframes)
- Caching: `/images/*` cached 30 days; `/images/posts/*` no-cache (allows quick updates)

**`_site/` (Build output):**
- Purpose: Generated static HTML site ready for deployment
- Contents: Mirrors `src/` structure with compiled HTML
- Deployment: Entire folder pushed to Netlify's CDN
- Ignored: Not committed to git (`.gitignore` excludes `_site/`)

**`.eleventy.js` (Eleventy config):**
- Purpose: Configure site generation, define collections, filters, passthrough copies
- Contains:
  - Posts collection definition (glob `src/blog/posts/*.md`, sorted by date descending)
  - Custom Nunjucks filters: `postDate`, `dateToRfc3339`, `slugify`, `tagCounts`, `readTime`, `firstImage`
  - Passthrough copy rules for images and source assets
  - Eleventy dir config (input: `src`, output: `_site`, layouts: `_includes`)

**`netlify.toml` (Netlify deployment):**
- Purpose: Configure Netlify build, redirects, caching, security headers
- Sections:
  - `[build]` — `npm run build` command, output directory `_site`, Node 18
  - `[[redirects]]` — Old URLs redirected to current blog post URLs
  - `[[headers]]` — CSP for Mermaid CDN, cache rules for images/diagrams

## Key File Locations

**Entry Points:**
- `src/blog/index.njk` — Blog homepage (root URL `/`)
- `src/index.html` — Portfolio page (`/about/`)
- `src/feed.njk` — Atom feed (`/feed.xml`)
- `src/sitemap.njk` — XML sitemap (`/sitemap.xml`)

**Configuration:**
- `.eleventy.js` — Eleventy build config, filters, collections
- `netlify.toml` — Netlify deployment, redirects, caching, CSP
- `package.json` — npm scripts, dependencies
- `src/_data/site.json` — Global metadata (site title, URL, author)

**Core Logic:**
- `src/blog/posts/posts.json` — Directory data file (applies layout + URL pattern to all posts)
- `src/_includes/article.njk` — Blog post template (120 lines of CSS + layout)
- `src/_includes/base.njk` — Non-post template (110+ lines of CSS + layout)

**Content:**
- `src/blog/posts/*.md` — Individual blog post files (frontmatter + markdown)
- `src/now/index.njk` — Now page content

## Naming Conventions

**Files:**
- **Eleventy layouts:** kebab-case with `.njk` extension (e.g., `article.njk`, `base.njk`)
- **Data files:** lowercase `.json` (e.g., `site.json`, `posts.json`)
- **Markdown posts:** kebab-case slug (e.g., `from-bigquery-to-snowflake-real-world-analytics-migration.md`)
- **HTML files:** lowercase, underscores for directories (e.g., `index.html`, `atom.xml`)

**Directories:**
- **Eleventy reserved:** Prefixed with underscore (e.g., `_includes/`, `_data/`)
- **Content sections:** lowercase, plural for collections (e.g., `blog/`, `posts/`, `tags/`, `images/`)
- **Post assets:** `posts/{post-slug}/` matching the post's filename slug

**CSS/Variables:**
- **CSS custom properties:** `--variable-name` (e.g., `--font-serif`, `--bg`, `--accent`)
- **CSS class names:** lowercase kebab-case (e.g., `.nav-brand`, `.entry-title`, `.article-body`)
- **BEM optional:** Some components use informal BEM-ish naming (e.g., `.entry--featured`), but not consistently

**Frontmatter fields:**
- **Required (all posts):** `title` (string), `date` (ISO date string), `tags` (YAML array), `excerpt` (string)
- **Optional:** `canonical` (URL to canonical post), `description` (alternative to excerpt)

**URLs/Slugs:**
- **Post slug:** Derived from filename by removing date prefix (e.g., `from-bigquery-to-snowflake-real-world-analytics-migration.md` → `/blog/from-bigquery-to-snowflake-real-world-analytics-migration/`)
- **Tag slug:** Derived via `slugify` filter (e.g., "Data Engineering" → `/tags/data-engineering/`)
- **Special pages:** Root `/`, `/about/`, `/now/`, `/feed.xml`, `/sitemap.xml`

## Where to Add New Code

**New Blog Post:**
1. Create `src/blog/posts/{slug}.md` with frontmatter:
   ```markdown
   ---
   title: "Post Title"
   date: "YYYY-MM-DD"
   tags:
     - Tag1
     - Tag2
   excerpt: "Brief summary."
   ---
   ```
2. Add post body as Markdown (supports Nunjucks template syntax for variables, `{% for %}`, etc.)
3. For diagrams: Create `src/images/posts/{slug}/` and embed via `![alt](image.svg)` or `<iframe src="/images/posts/{slug}/diagram.html"></iframe>`
4. For featured image (blog listing thumbnail): Include first `<img>` tag in body (extracted via `firstImage` filter)
5. Run `npm start` to test; build will run automatically on git push to Netlify

**New Component/Module:**
- No modular code structure; all CSS is inline in layout files
- To add styling: Edit `<style>` block in relevant layout (`src/_includes/article.njk` or `src/_includes/base.njk`)
- To add HTML structure: Edit the corresponding `.njk` file and add new CSS rules to its `<style>` block

**Utilities:**
- Custom filters: Add to `.eleventy.js` via `eleventyConfig.addFilter()`
- Shared data: Add to `src/_data/site.json` or create new file in `src/_data/`
- Helper templates: Create `.njk` file in `src/_includes/` and include via `{% include "filename.njk" %}`

**Styling Across Surfaces:**
- **Blog homepage styling:** Edit `src/blog/index.njk` lines 24–420
- **Blog post styling:** Edit `src/_includes/article.njk` lines 20–150
- **Portfolio & other pages:** Edit `src/_includes/base.njk` lines 20–110 or `src/index.html` lines 27–900+ (portfolio has its own 2500+ lines of inline CSS)
- **Tag pages / Now page:** Edit `src/tags/index.njk` or `src/now/index.njk` for page-specific CSS overrides in `{% block head %}<style>...{% endblock %}`

**Collections / Data-Driven Content:**
- Posts collection already defined; to add a new collection, edit `.eleventy.js` and add:
  ```javascript
  eleventyConfig.addCollection("collectionName", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/path/*.md").sort(...);
  });
  ```
- Access in templates: `{{ collections.collectionName }}`

**Global Configuration:**
- Site title/URL/author: Edit `src/_data/site.json`
- Eleventy filters: Add to `.eleventy.js`
- Netlify redirects/caching: Edit `netlify.toml`

## Special Directories

**`src/_includes/` (Eleventy reserved):**
- Purpose: Layouts and partials
- Generated: No
- Committed: Yes

**`src/_data/` (Eleventy reserved):**
- Purpose: Global data objects
- Generated: No
- Committed: Yes

**`_site/` (Eleventy output):**
- Purpose: Build output, ready for deployment
- Generated: Yes (by Eleventy on build)
- Committed: No (in `.gitignore`)

**`node_modules/` (npm packages):**
- Purpose: Installed dependencies (Eleventy, Luxon)
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`.claude/` (Claude Code config):**
- Purpose: Agent configuration, hooks, settings
- Generated: By Claude Code
- Committed: Yes (contains shared settings; `.local.json` may contain user-specific config)

**`.planning/codebase/` (Architecture maps):**
- Purpose: Store ARCHITECTURE.md, STRUCTURE.md, etc.
- Generated: By `/gsd-map-codebase` command
- Committed: Yes

---

*Structure analysis: 2026-09-06*
