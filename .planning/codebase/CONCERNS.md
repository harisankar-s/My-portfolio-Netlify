# Codebase Concerns

**Analysis Date:** 2026-09-06

## Tech Debt

**Monolithic portfolio file ballooning in size:**
- Issue: `src/index.html` is now 90KB (2,787 lines) with all HTML/CSS/JS inlined. README documentation indicates it should be ~72KB, but the file has grown 25% beyond the target. All content, styling, and logic for the `/about/` surface are in a single file with no separation of concerns.
- Files: `src/index.html`
- Impact: Difficult to maintain and update individual sections (About, Experience, Projects, Clients, Skills, Contact). Hard to debug style or layout issues when all CSS is inline. Increases cognitive load when making any changes. Versioning and branching strategies are complicated by the large single file.
- Fix approach: Extract repeated sections (project cards, client tiles, timeline entries) into Nunjucks partials in `src/_includes/`. Use the `include` tag to reference them from the portfolio. This keeps the single-page design but enables reusable components. Target sub-40KB main file by moving inline CSS to a shared stylesheet or modular CSS approach.

**Duplicate CSS tokens and styles across layouts:**
- Issue: `src/_includes/article.njk` (15KB) and `src/_includes/base.njk` (7.5KB) define separate `<style>:root{}` blocks with identical design tokens (colors, fonts, spacing). Additionally, the portfolio file `src/index.html` has its own inline CSS. Any change to brand colors, typography, or spacing requires manual updates in three separate locations.
- Files: `src/_includes/article.njk` (lines 20–130), `src/_includes/base.njk` (lines 20–120), `src/index.html` (lines 27–140)
- Impact: Risk of visual inconsistency if one layout is updated but others are missed. Maintenance burden grows with every design iteration. Harder to enforce consistent spacing, color transitions, and typography across the site.
- Fix approach: Extract CSS variables into a shared partial, e.g., `src/_includes/css-variables.njk`, and include it in all three locations. Define a canonical `:root{}` block that is injected into all layouts. Use a build-time CSS generation step or a `<link>` to a shared stylesheet if moving away from inline CSS. Reduces duplication from three token sets to one.

**Hardcoded cross-links between blog and portfolio surfaces:**
- Issue: Multiple hardcoded `href="/"` and `href="/about/"` links spread across multiple files. Changing the homepage URL for the blog or the portfolio route requires manual edits in at least 5 locations. No shared navigation partial centralizes these routes.
- Files: `src/_includes/article.njk` (lines 163, 179, 214), `src/_includes/base.njk` (line 152), `src/index.html` (lines 623, 1321)
- Impact: If the blog URL structure changes from `/` to `/blog/` or the portfolio moves from `/about/` to a different path, several updates will be missed, breaking navigation. Risk of broken links in production.
- Fix approach: Create a site configuration object (extend `src/_data/site.json`) with `urls.blog` and `urls.portfolio` properties. Reference these in templates via Nunjucks: `{{ site.urls.blog }}` instead of hardcoding `"/"`. Centralizes route management and makes URL restructuring a single config change.

**Portfolio file processed as Nunjucks template despite being HTML:**
- Issue: `src/index.html` is configured with `htmlTemplateEngine: "njk"` in `.eleventy.js` (line 72), meaning the entire portfolio file runs through the Nunjucks engine. The portfolio contains template logic (line 1298: `{% for post in collections.posts %}`), but most of the file is static content that doesn't need templating. This adds build time and creates a fragile boundary between content and template code.
- Files: `.eleventy.js` (line 72), `src/index.html`
- Impact: Any accidental Nunjucks syntax in the portfolio content (e.g., `{{ }}` or `{% %}` in text) will break the build. Harder to audit which parts of the file are dynamic vs. static. Increases complexity of the build process for what should mostly be a static asset.
- Fix approach: Extract the "Recent Writing" section (line 1298 onward) into a Nunjucks partial that is included in the portfolio. Make that partial the only template-aware file for the portfolio surface. Keep the rest of `src/index.html` as static content, or move it to a layout and use Nunjucks frontmatter only. Separates concerns and reduces build-time surprises.

## Known Bugs

**`firstImage` filter regex doesn't handle all image attribute formats:**
- Symptoms: Post thumbnails may be missing or blank if the first image uses single quotes, srcset attributes, or picture elements instead of a simple `<img src="">` tag.
- Files: `.eleventy.js` (lines 57–62)
- Trigger: Add a blog post with an image using `srcset`, `<picture>` elements, or non-standard attribute quotes. The `firstImage` filter regex (`/<img[^>]+src=["']([^"']+)["']/i`) will fail to match.
- Workaround: Ensure the first image in every post uses a simple `<img src="...">` (not srcset or picture), and verify the src value is wrapped in double quotes.

**`readTime` filter calculates read time uniformly at 200wpm without accounting for code blocks:**
- Symptoms: Posts with large code blocks, tables, or diagrams show inflated read-time estimates. A post with 10KB of code might claim 20 min read time even if the actual prose is only 5 min.
- Files: `.eleventy.js` (lines 51–55)
- Trigger: Posts with inline code, `<pre><code>` blocks, or Mermaid diagrams. The filter counts all words equally without filtering out code or markup.
- Workaround: Manually override read time in post frontmatter if possible, or manually write a more nuanced estimate and add a custom filter for specific posts.

**Mermaid.js CDN fails silently if network is unavailable:**
- Symptoms: Blog posts with Mermaid diagrams render blank or show raw code if `cdn.jsdelivr.net` is unreachable. No fallback image or error message is displayed.
- Files: `src/_includes/article.njk` (line 242, lines 248–254)
- Trigger: Network outage or CDN downtime. User's ISP blocks the CDN. The page still loads but diagrams don't render.
- Workaround: Pre-render Mermaid diagrams as SVG during the Eleventy build step and embed the SVGs directly instead of relying on client-side Mermaid.js. Or serve Mermaid from a self-hosted location with a local fallback.

## Security Considerations

**Content Security Policy (CSP) header allows multiple external CDNs:**
- Risk: The CSP header in `netlify.toml` (line 37) allows scripts from `cdn.jsdelivr.net` (Mermaid), fonts from `fonts.googleapis.com` and `fonts.gstatic.com`, and images from `cdn-images-1.medium.com`. If any of these CDNs are compromised or if a URL is hijacked, arbitrary code could be injected.
- Files: `netlify.toml` (lines 37)
- Current mitigation: `script-src 'self' 'unsafe-inline'` allows inline scripts, which mitigates the need to load all scripts externally. However, `'unsafe-inline'` itself is a security weakness.
- Recommendations: (1) Migrate from inline CSS/JS to external files with hash-based CSP rules to eliminate `'unsafe-inline'`. (2) Use Subresource Integrity (SRI) hashes on all external CDN links. (3) Consider self-hosting critical dependencies like Mermaid.js instead of relying on CDN URLs.

**Portfolio file contains business-sensitive contact information and hardcoded project details:**
- Risk: The portfolio at `src/index.html` includes email addresses, Topmate booking link, LinkedIn, Twitter handles, and detailed project descriptions tied to specific clients. If the Git history or deployed site is indexed or archived, this information becomes permanently searchable.
- Files: `src/index.html` (contact section, client names, project details)
- Current mitigation: The site is not behind authentication, but information is only discoverable if someone visits the site.
- Recommendations: (1) Consider moving client names or sensitive project details to a separate config file (e.g., `src/_data/projects.json`) and gitignore any version that contains sensitive data. (2) Regularly audit Git history to ensure no private credentials or API keys were committed. (3) Use environment variables for contact info if the site is deployed in multiple contexts.

**Diagram HTML files stored in version control without validation:**
- Risk: Diagram HTML files in `src/images/posts/*/` (e.g., `ai-paradigms-comparison-light.html`) are embedded via `<iframe>` but are not validated or sanitized. If these files were modified maliciously or if a merge conflict introduces untrusted HTML, it could be served as-is.
- Files: `src/images/posts/*/` (e.g., `src/images/posts/traditional-ai-vs-agentic-ai-vs-agentic-rag/ai-paradigms-comparison-light.html`)
- Current mitigation: The CSP header restricts `frame-src 'self'`, allowing only same-origin iframes.
- Recommendations: (1) Add a pre-build validation step to ensure diagram HTML files don't contain external scripts or suspicious content. (2) Consider converting diagrams to static SVG/PNG during build time instead of storing interactive HTML files.

## Performance Bottlenecks

**Portfolio homepage (~90KB) loads all content inline without chunking or lazy-loading:**
- Problem: The `/about/` surface is served as a single 90KB HTML file with all CSS/JS inlined. No lazy-loading of below-the-fold sections (Projects, Clients, Contact). Images are not optimized or responsive.
- Files: `src/index.html`
- Cause: Single-file design philosophy (no build step, no module splitting). All sections (About, Timeline, Projects, Clients, Tech Stack, Contact) are rendered upfront.
- Improvement path: (1) Implement lazy-loading for non-critical sections using `loading="lazy"` on images and `IntersectionObserver` for off-screen content. (2) Extract CSS for above-the-fold sections into a critical CSS file and defer the rest. (3) Optimize and compress images in `src/images/logos/` and `src/images/profile/`. Current image directory is 2.4MB, which is likely unoptimized.

**Post diagrams (HTML iframes) with no caching headers override for individual files:**
- Problem: Post diagrams cached with `max-age=0, must-revalidate` means every page load forces a network request to validate the diagram HTML. If a post has multiple diagrams, this multiplies requests.
- Files: `netlify.toml` (lines 48–50), `src/images/posts/*/`
- Cause: The caching policy is broad and applies to all `/images/posts/*` files uniformly. No way to selectively cache a static diagram longer if it's rarely updated.
- Improvement path: (1) Add fingerprinting to diagram filenames (e.g., `diagram-v2-abc123.html`) so cache-busting is explicit rather than validation-based. (2) Split header rules: cache stable diagrams longer (30 days) and only revalidate for diagrams with a recent modification marker.

**Luxon datetime processing for every post on every build:**
- Problem: The `postDate` filter (`.eleventy.js` line 23–25) creates a new Luxon `DateTime` object for every post, every build. For sites with hundreds of posts, this adds up.
- Files: `.eleventy.js` (lines 23–25)
- Cause: Filter is called during rendering of every post. No caching of DateTime objects.
- Improvement path: Pre-process dates at build-time and store the formatted string in the data layer instead of formatting on-the-fly during rendering. Or use Eleventy's 11ty.js data files to cache filter results.

## Fragile Areas

**Tag page generation with manual filter logic:**
- Files: `src/tags/index.njk` (uses `tagCounts` filter), `.eleventy.js` (lines 37–49)
- Why fragile: The `tagCounts` filter manually iterates over posts and counts tags, filtering out the `"post"` tag. If post frontmatter changes or tags are added dynamically, this logic doesn't scale. The filter has no error handling for missing or malformed tags.
- Safe modification: Add validation to the filter: check that `post.data.tags` is an array before iterating. Document which tags are reserved (e.g., `"post"`) in the filter. If adding new tag logic, update the filter and test tag pages visually.
- Test coverage: Tag pages are not automatically tested. Manual verification that all posts appear on their respective tag pages is required.

**Redirect rules in Netlify config hardcoded and growing:**
- Files: `netlify.toml` (lines 8–26)
- Why fragile: Redirects are manually maintained. If a post slug changes, a redirect must be added by hand. This is error-prone and redirects accumulate, making the config harder to read.
- Safe modification: Before adding a new redirect, verify the old URL is no longer in use (check Netlify Analytics or a 404 log). When renaming a post, first ensure the redirect is added before deployment. Regularly audit redirects and remove old ones after a grace period (e.g., 6 months).
- Test coverage: Redirects are not tested in CI. Manual spot-checks required.

**Custom Eleventy filters depend on post data structure:**
- Files: `.eleventy.js` (filters), `src/blog/posts/posts.json`, post frontmatter
- Why fragile: The filters assume a specific post data structure (`post.data.tags`, `post.templateContent`, `post.date`). If the data structure changes (e.g., moving `date` to a different field or renaming `tags` to `categories`), filters silently fail or produce incorrect output.
- Safe modification: When adding or modifying a filter, test it against the actual post collection. Add inline comments documenting expected data structure. Before refactoring post frontmatter, update all filters that depend on it.
- Test coverage: Filters are not unit tested. They are only verified visually by running `npm start` and checking post listings.

## Scaling Limits

**Single-file portfolio grows with every new project, client, or timeline entry:**
- Current capacity: 90KB (~2,787 lines) with 2 featured projects, 8 clients, 5 timeline entries. README indicates the target was ~72KB.
- Limit: At 100KB+, build time and editor responsiveness degrade. Large files are harder to review in Git diffs. Publishing changes becomes slower.
- Scaling path: Break the portfolio into Nunjucks partials (one per major section: About, Timeline, Projects, Clients, Tech Stack, Contact). Use includes to assemble them into a single HTML file during the build. This keeps the generated output small while making source files manageable.

**Post collection adds build time with every new post:**
- Current capacity: 10 posts (140KB of markdown content). Each post is processed through Eleventy, the `readTime` filter, the `firstImage` filter, and tag collection.
- Limit: At 100+ posts, `npm start` watch mode may introduce noticeable latency on edits. Build time on Netlify could exceed deployment timeouts.
- Scaling path: (1) Cache filter results or pre-compute them during data processing. (2) Implement incremental Eleventy builds (if upgrading to a newer version). (3) Consider a separate microsite for posts if the count exceeds 200.

## Dependencies at Risk

**Eleventy v3.1.6 with no major version bump policy:**
- Risk: Using `^3.1.6` allows upgrades to v3.x, but v4 (when released) will require manual migration. No automated dependency upgrade strategy is in place.
- Impact: Security patches in v3 will be applied automatically, but breaking changes in v4 could go unnoticed until a manual upgrade is attempted. Dependency drift from the Node ecosystem.
- Migration plan: Set up Dependabot or Renovate to notify of minor and patch updates. Test upgrades in a preview branch before merging to main. When v4 is released, plan a migration phase with testing before upgrading.

**Luxon v3.7.2 with implicit timezone handling:**
- Risk: Luxon handles dates and timezones. If timezone logic changes between versions, post dates could render incorrectly. The `toDateTime` function in `.eleventy.js` (line 17–20) coerces dates to UTC.
- Impact: Post sorting by date and date rendering (e.g., "Jun 2026") depend on this logic. Incorrect date rendering breaks chronological ordering and SEO.
- Migration plan: When updating Luxon, test post dates visually in the blog listing and feed. Ensure the oldest and newest posts sort correctly.

**Google Fonts and Google CDN for critical fonts:**
- Risk: `fonts.googleapis.com` and `fonts.gstatic.com` are external dependencies. If Google's CDN is slow, offline, or blocked, fonts fail to load and the site falls back to system fonts, degrading the visual design.
- Impact: Serif and mono fonts (Instrument Serif, JetBrains Mono, Source Serif 4, Inter) are used extensively. Fallback fonts may not match the intended layout (monospace font widths differ).
- Migration plan: Self-host the web fonts instead of loading from Google. Download the font files and serve them from `src/` with `addPassthroughCopy()`. Update `@import` or `@font-face` URLs to point to the self-hosted copies. Reduces external dependencies and improves performance.

## Test Coverage Gaps

**No visual regression testing for portfolio or blog:**
- What's not tested: Changes to HTML, CSS, or layout of the portfolio homepage or blog listing. Font rendering across browsers. Image display and optimization. Responsive breakpoints (900px, 720px, 560px, 480px).
- Files: `src/index.html`, `src/blog/index.njk`, `src/_includes/article.njk`, `src/_includes/base.njk`
- Risk: A CSS change intended for the portfolio might inadvertently break blog post styling. An image crop or resize might fail silently. Responsive design might break on certain screen sizes without detection.
- Priority: **High** — The portfolio is the primary personal brand asset. Visual inconsistencies directly impact perceived quality.

**No tests for custom Eleventy filters:**
- What's not tested: Edge cases for `postDate`, `dateToRfc3339`, `slugify`, `tagCounts`, `readTime`, and `firstImage` filters. Invalid input (missing dates, empty strings, malformed tags).
- Files: `.eleventy.js` (filters)
- Risk: A post with unusual frontmatter (e.g., missing `date` or `tags`) could cause the filter to throw an error or return unexpected output, breaking the build or the blog listing.
- Priority: **Medium** — Filters are the glue between posts and templates. Breakage impacts all post rendering.

**No tests for Eleventy collection and pagination:**
- What's not tested: The `posts` collection (`.eleventy.js` line 10–14) sorts posts correctly by date. Tag pages generate for every unique tag. Pagination (if added) generates the correct number of pages.
- Files: `.eleventy.js` (posts collection), `src/tags/index.njk` (tag pagination)
- Risk: If posts are added with invalid dates or tag logic changes, the collection might fail silently or generate incorrect output. Tag pages might duplicate or omit posts.
- Priority: **Medium** — Collection logic is critical to site navigation and discoverability.

**No tests for cross-link validity:**
- What's not tested: Hardcoded `href="/"` and `href="/about/"` links actually point to valid pages. No broken links checker.
- Files: `src/_includes/article.njk`, `src/_includes/base.njk`, `src/index.html`
- Risk: If the blog or portfolio URL structure changes, navigation links break without detection.
- Priority: **Medium** — Broken navigation reduces usability.

**No tests for Netlify redirects:**
- What's not tested: Whether redirect rules in `netlify.toml` actually work. Whether old post URLs return a 301 redirect instead of 404.
- Files: `netlify.toml` (redirects)
- Risk: Redirects might fail silently or might not be applied on Netlify. Old Medium article links or `.html` URLs might 404 instead of redirecting.
- Priority: **Low** — Redirects are less frequently changed. Can be tested manually.

---

*Concerns audit: 2026-09-06*
