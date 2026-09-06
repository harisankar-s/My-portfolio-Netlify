# Testing Patterns

**Analysis Date:** 2026-09-06

## Test Framework

**Runner:**
- None configured
- No testing framework dependencies (Jest, Vitest, Mocha, etc.)

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
npm start        # Local dev server with live reload
npm run build    # Production build
# No test command available
```

## Test File Organization

**Location:**
- No test files present in codebase
- No `.test.`, `.spec.` files found

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Verification Strategy

**Visual Testing via Dev Server:**
Per `CLAUDE.md`: *"No test suite, linter, or framework build step. There is no "run a single test" — verification is visual via the dev server."*

**Process:**
1. Run `npm start` to launch local Eleventy dev server with live reload
2. Navigate to `http://localhost:8080` (Eleventy default)
3. Visually verify:
   - Blog post rendering with correct layout (`article.njk`)
   - Portfolio page rendering (`src/index.html` with inline styles/JS)
   - Navigation, links, and responsive design across breakpoints
   - Markdown-to-HTML conversion with custom filters applied
   - Mermaid diagram rendering from markdown fenced blocks

**Manual Testing Checklist (Recommended):**
- [ ] Blog listing page loads at root `/`
- [ ] Individual blog posts render at `/blog/{slug}/`
- [ ] Portfolio/about page renders at `/about/`
- [ ] Navigation links work between surfaces
- [ ] Post filters apply correctly (`postDate`, `readTime`, `slugify`)
- [ ] Tag pages display at `/tags/{slug}/`
- [ ] RSS feed validates at `/feed.xml`
- [ ] Mermaid diagrams render correctly in posts with inline code blocks
- [ ] Responsive design passes at 900px, 720px, 560px, 480px breakpoints
- [ ] Links and CTA buttons are clickable and functional

## No Unit/Integration/E2E Testing

**Why:**
- Project is a static site generator with Eleventy
- Business logic is minimal: date formatting, slug generation, list filtering
- Most complexity is presentational (HTML/CSS/inline JavaScript)
- Risk of bugs is low because:
  - Layout logic is template-based and visual
  - Filters are simple, pure functions (no side effects)
  - Eleventy handles collection and pagination reliably

**What Is NOT Tested:**
- JavaScript filter functions (e.g., `toDateTime`, `readTime`, `slugify`) — assumed correct by design
- Nunjucks template rendering — verified visually
- Build output structure — validated manually during deploy
- Accessibility compliance — manual testing or automated tools (not configured)

## Coverage

**Requirements:** None enforced.

**View Coverage:**
- Not applicable; no coverage tools configured

**What Could Be Tested (If Framework Were Added):**
```javascript
// Example: if Jest were configured, filter functions in .eleventy.js could be unit tested

// toDateTime conversion
expect(toDateTime(new Date('2026-08-02')))
  .toEqual(DateTime.fromISO('2026-08-02', { zone: 'utc' }));

// postDate formatting
expect(eleventyConfig.filters.postDate(new Date('2026-08-02')))
  .toBe('Aug 2026');

// slugify
expect(eleventyConfig.filters.slugify('Data Engineering'))
  .toBe('data-engineering');

// readTime
expect(eleventyConfig.filters.readTime('<p>' + 'word '.repeat(300) + '</p>'))
  .toBeGreaterThanOrEqual(1);

// firstImage extraction
const html = '<p>Before</p><img src="/img/test.png"><p>After</p>';
expect(eleventyConfig.filters.firstImage(html))
  .toBe('/img/test.png');
```

## Common Patterns

**No Async Testing Pattern:**
- No promises or async/await tested
- Eleventy filters are synchronous only

**No Mocking:**
- No external dependencies to mock
- No API calls from build process

**No Error Scenario Testing:**
- Filters handle gracefully with guard clauses and fallback values
- Eleventy itself handles file I/O and template errors

## Debugging During Development

**Dev Server Output:**
```bash
npm start
# Eleventy outputs:
# - File watch events
# - Build times
# - Error messages with file/line references
```

**Browser DevTools:**
- Inspect HTML structure (validates Nunjucks output)
- Console logs from inline JavaScript in `index.html` and `article.njk`
- Network tab for deployed assets
- Responsive design mode for breakpoint testing

**Template Debugging:**
```nunjucks
{# Add debug output to templates if needed #}
{{ variableName }}
{# Eleventy will render this as plain text #}
```

## Accessibility Testing

**Current State:** Manual testing only

**Recommended Tools (Not Configured):**
- WAVE browser extension for WCAG evaluation
- axe DevTools for automated a11y checks
- Manual keyboard navigation testing (tab through nav and links)

**Known Accessibility Features:**
- Semantic HTML (`<nav>`, `<article>`, `<figure>`, `<details>`)
- ARIA labels where needed (e.g., `aria-label="breadcrumb"`)
- `prefers-reduced-motion` respected in portfolio CSS
- Focus states on interactive elements

## Deployment Validation

**Pre-Deploy Checks (Manual):**
1. Build locally: `npm run build`
2. Verify `_site/` directory contains expected files
3. Check generated HTML files for broken links (optional: use a link checker)
4. Test production build locally before pushing to git

**Netlify Automatic Checks:**
- Build command runs successfully
- Output published to `_site` directory
- Deploy logs show no warnings or errors
- Preview URL available before merge to main

## Performance Testing

**No Framework Configured:**
- No Lighthouse CI or performance testing tools
- Manual testing via Chrome DevTools Lighthouse tab
- Recommended: run Lighthouse audit on deployed site for CLS, LCP, FID metrics

---

*Testing analysis: 2026-09-06*
