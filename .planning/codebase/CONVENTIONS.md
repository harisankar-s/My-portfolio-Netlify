# Coding Conventions

**Analysis Date:** 2026-09-06

## Naming Patterns

**Files:**
- Markdown posts: kebab-case with optional date prefix (e.g., `medallion-is-a-vocabulary.md`, `2026-06-19-traditional-ai-vs-agentic-ai-vs-agentic-rag.md`)
- Nunjucks templates: kebab-case with `.njk` extension (e.g., `article.njk`, `base.njk`)
- Configuration files: camelCase with `.js` or `.json` extension (e.g., `.eleventy.js`, `posts.json`)
- Layout files in `_includes/` directory: descriptive kebab-case names matching their purpose

**Functions:**
- JavaScript functions: camelCase (e.g., `toDateTime`, `onScroll`, `getFilteredByGlob`)
- Arrow functions for callbacks and short operations
- Const declarations for all variables in modern code

**Variables:**
- JavaScript: camelCase for all variables and constants
- CSS custom properties: lowercase with hyphens (e.g., `--bg`, `--fg-muted`, `--border-strong`)
- HTML/Template variables: Nunjucks variables in lowercase (e.g., `{{ title }}`, `{{ date | postDate }}`)

**Types:**
- No TypeScript in project; vanilla JavaScript only
- Eleventy uses plain objects for collections and filter functions

## Code Style

**Formatting:**
- No configured formatter (Prettier/ESLint not present)
- Follows implicit style conventions observed across files
- Inline CSS in HTML files with semantic sectioning via comments
- JavaScript uses 2-space indentation consistently
- HTML/templates use 2-space indentation

**Linting:**
- No linter configured (.eslintrc, .prettierrc files not present)
- Code follows convention by example from existing implementation

**Spacing:**
- CSS properties in `:root` blocks use aligned colons where appropriate
- JavaScript functions have standard spacing around braces
- HTML attributes use consistent formatting

## Import Organization

**Order (Eleventy `.eleventy.js`):**
1. Core Node/npm modules (`require("luxon")`)
2. Module exports via `module.exports`
3. Function declarations within config
4. Configuration object return

**Example from `.eleventy.js`:**
```javascript
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Passthrough copies first
  eleventyConfig.addPassthroughCopy("src/images");
  
  // Collections
  eleventyConfig.addCollection("posts", function (collectionApi) {
    // ...
  });
  
  // Filters (grouped by type)
  eleventyConfig.addFilter("postDate", (dateObj) => {
    // ...
  });
  
  // Return config object last
  return {
    dir: { /* ... */ }
  };
};
```

**No Path Aliases:** Project is small enough that aliases aren't needed; relative paths used in templates.

## Error Handling

**Patterns:**
- Defensive checks for data existence (e.g., `tags || []`, `content || ""` in filters)
- Null/undefined checks before operations (e.g., `if (!content) return ""`)
- Fallback values in template filters (e.g., `content.match(...) ? m[1] : ""`)
- Try-catch not observed; operations are designed to be safe

**String Operations:**
- Regex patterns for slugification and content extraction
- Safe array methods (`.split()`, `.replace()`, `.match()`) with null coalescing fallbacks

**Example from `.eleventy.js`:**
```javascript
eleventyConfig.addFilter("firstImage", function (content) {
  if (!content) return "";  // Guard clause
  const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";  // Null-safe match
});
```

## Logging

**Framework:** None configured. `console` object used directly in inline JavaScript when needed.

**Patterns observed:**
- No structured logging in build process
- No console output in templates
- Inline JavaScript (`index.html`, `article.njk`) uses vanilla `console` for debugging only (minimal use)

## Comments

**When to Comment:**
- CSS sections use comment separators for major layout/component groups (e.g., `/* NAV */`, `/* LAYOUT */`)
- Configuration comments explain Eleventy-specific directives
- Inline comments in HTML CSS blocks describe structural purpose (e.g., `/* Subtle grain overlay — fixed, non-interactive */`)

**JSDoc/TSDoc:**
- Not used; no TypeScript and minimal JavaScript means self-documenting code is preferred
- Filter names and purposes are clear from Nunjucks template usage

**Example:**
```javascript
// Coerce a frontmatter date (JS Date or ISO string) into a Luxon DateTime
const toDateTime = (dateObj) =>
  dateObj instanceof Date
    ? DateTime.fromJSDate(dateObj, { zone: "utc" })
    : DateTime.fromISO(String(dateObj), { zone: "utc" });
```

## Function Design

**Size:** Functions are short and focused. Most Eleventy filters are 1–5 lines.

**Parameters:**
- Functions accept minimal parameters; Eleventy filters receive data from template context
- Callbacks use destructuring for complex objects (e.g., `({ top, scrollY }) => {}`)

**Return Values:**
- Filters always return a value (strings, numbers, objects)
- Safe returns with fallback values (`"", 0, {}, []`)

**Example of consistent pattern (`readTime` filter):**
```javascript
eleventyConfig.addFilter("readTime", function (content) {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
});
```

## Module Design

**Exports:**
- `.eleventy.js` exports a function that Eleventy calls
- CommonJS (`module.exports`) used throughout
- No ES modules imported in source

**Structure in `.eleventy.js`:**
- One default export: a function that receives `eleventyConfig`
- All configuration is added via `eleventyConfig.addX()` API calls
- Config object returned with `dir` and template engine settings

**Data Files:**
- `_data/site.json` is a flat object with global site metadata
- `posts.json` (directory data file) applies layout and permalink to all posts in that directory
- Simple JSON structure without nested objects

## CSS Conventions

**Design Tokens:**
- All colors, fonts, and spacing use CSS custom properties defined in `:root`
- Consistent variable naming: `--bg`, `--fg`, `--border`, `--accent`, `--pop` (accent highlight color)
- Responsive sizing via `clamp()` for fluid scaling

**Class Naming (BEM-inspired):**
- Block: `.nav`, `.article-body`, `.footer`
- Element: `.nav-brand`, `.article-title`, `.footer-inner`
- Modifier: `.nav-link:hover`, `.nav.scrolled`
- Descriptive purpose: `.article-tag`, `.byline-avatar`, `.breadcrumb`

**Example:**
```css
.article-body { /* block */ }
.article-body p { /* element (direct descendant) */ }
.article-body > * { /* block-level constraint */ }
.article-tag { /* reusable component */ }
```

## Template Conventions (Nunjucks)

**File Locations:**
- Layouts: `src/_includes/*.njk`
- Posts: `src/blog/posts/*.md` (rendered with `article.njk`)
- Other pages: `src/*.njk` or `src/tags/*.njk` (rendered with `base.njk`)

**Frontmatter in Markdown:**
```yaml
---
title: "Post Title"
subtitle: "Optional subtitle"
date: YYYY-MM-DD  # ISO format required for sorting
tags:
  - category1
  - category2
excerpt: "Snippet for collections"
---
```

**Filter Usage:**
- `{{ content | readTime }}` — estimate reading time
- `{{ date | postDate }}` — format date as "Jun 2026"
- `{{ date | dateToRfc3339 }}` — format for feeds/sitemap
- `{{ tag | slugify }}` — convert to URL-safe slug
- `{{ content | firstImage }}` — extract first `<img>` src for thumbnails

**Conditional & Loop Patterns:**
```nunjucks
{% if tags %}
  {% for tag in tags %}
    <span>{{ tag }}</span>
  {% endfor %}
{% endif %}

{% for post in collections.posts %}
  <!-- render post preview -->
{% endfor %}
```

## Build & Deployment

**No Build-Time Linting:** Code is not linted during `npm run build`; it passes directly to Eleventy.

**Dev vs. Build:**
- Development: `npm start` runs `eleventy --serve --watch` for live reload
- Production: `npm run build` runs `eleventy` for one-time static output

**Netlify Build Config (`netlify.toml`):**
- Node version: 18 (pinned in build environment)
- Command: `npm run build`
- Publish directory: `_site`

---

*Convention analysis: 2026-09-06*
