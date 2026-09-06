# Technology Stack

**Analysis Date:** 2026-09-06

## Languages

**Primary:**
- JavaScript (Node.js) - Build scripts, Eleventy configuration, custom filters

## Runtime

**Environment:**
- Node.js v18 - Pinned in `netlify.toml` for consistent builds across development and production

**Package Manager:**
- npm
- Lockfile: Not detected (`package-lock.json` not present in repo)

## Frameworks

**Core:**
- Eleventy (11ty) v3.1.6 - Static site generator for blog and portfolio
- Nunjucks - Template engine for HTML/Markdown rendering (`markdownTemplateEngine: "njk"`, `htmlTemplateEngine: "njk"`)

**Data/Time:**
- Luxon v3.7.2 - Date/time handling library used in `.eleventy.js` custom filters for date formatting (RFC 3339, post date display)

**Build/Dev:**
- Eleventy CLI - `eleventy --serve --watch` for development, `eleventy` for production build

## Key Dependencies

**Critical:**
- `@11ty/eleventy` v3.1.6 - Static site generation; transforms Markdown and Nunjucks templates in `src/` to HTML in `_site/`
- `luxon` v3.7.2 - Powers `postDate` filter ("Jun 2026" format) and `dateToRfc3339` filter for RSS/Atom feeds and sitemaps

**None beyond Eleventy and Luxon** - No frontend frameworks (React, Vue), no backend frameworks, no databases, no ORM

## Configuration

**Environment:**
- Node version: `NODE_VERSION = "18"` in `netlify.toml` [build.environment]
- No `.env` or `.env.local` required (static site; no runtime secrets)

**Build:**
- `.eleventy.js` - Eleventy configuration file containing:
  - Passthrough copy rules for static assets (`src/images`, `src/source`, `src/theme`)
  - Custom Eleventy filters (`postDate`, `dateToRfc3339`, `slugify`, `tagCounts`, `readTime`, `firstImage`)
  - Directory configuration (input: `src`, output: `_site`, includes/layouts: `_includes`)
  - Markdown and HTML templating engines set to Nunjucks
- `netlify.toml` - Netlify build and deployment configuration
- `package.json` - npm scripts (`start`, `build`) and dependencies

## Platform Requirements

**Development:**
- Node.js v18 (or compatible)
- npm
- Text editor or IDE for editing Markdown and Nunjucks templates

**Production:**
- Netlify hosting
- Static file serving (any CDN capable of serving HTML/CSS/JS)
- No database, no server-side runtime required

---

*Stack analysis: 2026-09-06*
