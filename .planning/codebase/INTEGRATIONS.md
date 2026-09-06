# External Integrations

**Analysis Date:** 2026-09-06

## APIs & External Services

**Content Syndication:**
- RSS/Atom feeds - Exported via `src/feed.njk` and `src/sitemap.njk`; available at `/feed.xml`
  - Uses `dateToRfc3339` Eleventy filter for RFC 3339 date compliance
  - Pulls post data from `collections.posts` collection

**Social/Professional Networking:**
- LinkedIn - Social link in `src/index.html` and `src/_includes/article.njk`
  - URL: `https://www.linkedin.com/in/harisankarsivankutty/`
- Medium - External writing platform link in `src/index.html`
  - URL: `https://medium.com/@brainbytebyhari`
- Topmate - Booking/consultation link in `src/index.html` and `src/_includes/article.njk`
  - URL: `https://topmate.io/harisankar_sivankutty`

## Data Storage

**Databases:**
- None - Static site; all content stored as Markdown files in `src/blog/posts/` and rendered at build time

**File Storage:**
- Local filesystem only - Images stored in `src/images/`, `src/images/posts/`, copied verbatim to `_site/images/` via `addPassthroughCopy` in `.eleventy.js`
- Post diagrams (SVG and interactive HTML iframes) live in `src/images/posts/{post-slug}/`
- Netlify serves static assets from `_site/` directory

**Caching:**
- Browser caching configured in `netlify.toml`:
  - `/images/*` (brand/photo assets): 30-day cache (`max-age=2592000`)
  - `/images/posts/*` (post diagrams): No cache (`max-age=0, must-revalidate`) for automatic updates on diagram changes

## Authentication & Identity

**Auth Provider:**
- None - Static site; no user authentication, login, or session management
- Social links are outbound only (no integration with LinkedIn/Medium APIs)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error monitoring service configured

**Logs:**
- Build logs: Netlify build environment (no custom logging)
- No application logging (static site)

## CI/CD & Deployment

**Hosting:**
- Netlify - Serves the `_site/` directory
- Build command: `npm run build` (runs `eleventy`)
- Build environment: `NODE_VERSION = "18"` pinned in `netlify.toml`

**CI Pipeline:**
- Netlify automatic deployments on git push
- Redirect rules configured for old blog URL patterns:
  - `/blog/` → `/` (301)
  - `/blog/edp_medium_article/` → `/blog/building-enterprise-data-platform-lessons-learned/` (301)
  - `/blog/data-vault-bigquery.html` → `/blog/data-vault-bigquery/` (301)
  - `/blog/dbt-testing-guide.html` → `/blog/dbt-testing-guide/` (301)

## Environment Configuration

**Required env vars:**
- None - Static site requires no runtime environment variables

**Secrets location:**
- Not applicable (no secrets required for static build)

## CDN & External Resources

**Font Delivery:**
- Google Fonts (googleapis.com, gstatic.com)
  - `Source Serif 4` (article layout, `src/_includes/article.njk`)
  - `Instrument Serif` (portfolio layout, `src/_includes/base.njk` and `src/index.html`)
  - `Inter` (UI/headings, multiple layouts)
  - `JetBrains Mono` (code/monospace, multiple layouts)

**JavaScript Libraries:**
- Mermaid.js v11 (diagram rendering) - Loaded from `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs` in `src/_includes/article.njk`
  - Used for rendering fenced ````mermaid``` code blocks in blog posts

**Image CDN:**
- Medium CDN (`cdn-images-1.medium.com`) - Allowed for image sources in CSP header (`netlify.toml`)

## Content Security Policy

**CSP Header** (configured in `netlify.toml`):
```
default-src 'self'; 
base-uri 'self'; 
object-src 'none'; 
frame-ancestors 'self'; 
frame-src 'self'; 
img-src 'self' data: https://cdn-images-1.medium.com; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com; 
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
connect-src 'self' https://cdn.jsdelivr.net; 
form-action 'self'; 
upgrade-insecure-requests
```

**Allowed external domains:**
- `fonts.googleapis.com` - Google Fonts stylesheets
- `fonts.gstatic.com` - Google Fonts assets
- `cdn.jsdelivr.net` - Mermaid.js library
- `cdn-images-1.medium.com` - Medium images embedded in posts

## Security Headers

**Additional security headers** (configured in `netlify.toml`):
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()` - Disable unnecessary permissions
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` - Force HTTPS

## Webhooks & Callbacks

**Incoming:**
- None - Static site; no webhook endpoints

**Outgoing:**
- None - No external service calls or integrations that trigger webhooks

---

*Integration audit: 2026-09-06*
