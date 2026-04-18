# Harisankar Sivankutty — Portfolio

A single-page, zero-dependency redesign of [harisankarsivankutty.in](https://harisankarsivankutty.in/).

## What's in this folder

```
harisankar-portfolio/
├── index.html      ← everything (HTML + CSS + JS inline, ~52 KB)
├── images/         ← your photo + 6 client logos
└── README.md
```

That's it. No build step, no npm, no gulp, no jQuery.

## Deploy to Netlify

**Option 1 — drag & drop (easiest):**
1. Zip the `harisankar-portfolio` folder (or just its contents)
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the folder in — live in ~10 seconds

**Option 2 — replace your existing site:**
Drop `index.html` and the `images/` folder into your existing Netlify repo,
replace everything else. Keep your domain config as-is.

**Option 3 — Git:**
```bash
git init
git add .
git commit -m "Portfolio redesign"
git remote add origin <your-repo>
git push -u origin main
```
Then connect the repo in Netlify.

## What to personalize before going live

Search `index.html` for these strings and swap in your real values:

| Placeholder | Where | Change to |
|---|---|---|
| `hello@harisankarsivankutty.in` | Contact section (2 places: `mailto:` + visible text) | Your actual email |
| `within 48h` | Contact meta | Your real response time, if different |

Everything else — role, years, stats, company descriptions, education, languages —
is already populated from your existing site.

## Design spec (for reference)

- **Fonts:** Instrument Serif (display, italic accents) + JetBrains Mono (body + labels)
- **Palette:** `#0A0A0B` bg · `#EDEDEB` fg · `#D4FF4A` electric-lime accent
- **Aesthetic:** editorial-tech / terminal-log hybrid
- **Browser support:** all modern browsers (uses IntersectionObserver, CSS custom props, `aspect-ratio`)
- **Accessibility:** respects `prefers-reduced-motion`, semantic HTML, keyboard-focusable nav
- **Mobile:** fully responsive, breakpoints at 900px / 720px / 560px / 480px

## Editing

Everything is in one file. Common edits:

- **Change accent color:** search for `--accent: #D4FF4A` in `:root`, swap hex
- **Add a new timeline entry:** copy a `<div class="timeline-item">…</div>` block under Experience
- **Add a client:** copy a `<article class="client-card">…</article>` block under Clients
- **Add a stack category:** copy a `<div class="stack-group">…</div>` block

No compilation needed — save and refresh.
