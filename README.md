# Harisankar Sivankutty — Portfolio

Single-page portfolio for [harisankarsivankutty.in](https://harisankarsivankutty.in/).
Custom-designed, zero build step, deploys anywhere static.

## What's in this folder

```
harisankar-portfolio/
├── index.html      ← everything (HTML + CSS + JS inline, ~60 KB)
├── images/         ← portrait + 6 client logos + favicon
└── README.md
```

No npm, no gulp, no jQuery. Just open `index.html` in a browser and it works.

## Test locally

Pick any of these — they all work:

```bash
# Python (already on macOS/Linux)
python3 -m http.server 8000
# → http://localhost:8000

# Node
npx serve
# → http://localhost:3000

# Or just double-click index.html
```

## Deploy to Netlify via Git

Assuming your Netlify site is already connected to your repo and auto-deploys on push to `main`:

```bash
# Create a preview branch (recommended — don't push straight to main)
git checkout -b redesign

# Drop the new files in (at your repo root)
cp -r /path/to/harisankar-portfolio/* .

# Commit & push
git add .
git commit -m "Portfolio redesign"
git push origin redesign
```

Netlify will generate a preview URL (format: `redesign--yoursite.netlify.app`).
Verify it, then merge to main:

```bash
git checkout main
git merge redesign
git push origin main
```

**Important — Netlify build settings:**
This site needs no build step. In your Netlify dashboard under
**Site configuration → Build & deploy → Build settings**, set:

- **Build command:** leave empty
- **Publish directory:** `.` (root)

(If your current setup uses `npm run build` publishing to `theme/`, change those.)

## What's on the page

1. **Hero** — name, status badge, role + tagline, stats (10+ yrs · 6+ clients · 3 clouds · 2 certs), tech ticker
2. **About** — decade-of-engineering intro, portrait, meta (expertise, certifications, languages, education, location)
3. **Credentials** — AWS Solutions Architect · Associate · RHCE · Current role
4. **Experience** — timeline: Thoughtworks → Ayla → Bayer → 6D Technologies
5. **Clients & Domains** — Ayla, Bayer, Ooredoo, Airtel, Etisalat, AIS Thailand
6. **Tech Stack** — 9-block grid: Data/Big Data · Cloud · GenAI · Data Platform & Quality · Languages · Delivery · Certs · Domains & IoT · Always-learning note
7. **Contact** — Topmate booking CTA · Email · LinkedIn · Twitter · response/timezone/availability
8. **Footer**

## Personalize before merging to main

Find-and-replace in `index.html`:

| Currently in file | Change to |
|---|---|
| `hello@harisankarsivankutty.in` | Your real email (used in contact section `mailto:` + visible text) |
| `Within 48 hours` | Your real response time, if different |

Everything else — role, experience, companies, certifications, Topmate link,
LinkedIn, Twitter — is already wired to your real values.

## Design spec

- **Fonts:** Instrument Serif (display) · JetBrains Mono (body/labels) — via Google Fonts CDN
- **Palette:** `#0A0A0B` bg · `#EDEDEB` fg · `#D4FF4A` electric-lime accent
- **No external JS libraries** — vanilla JS, ~40 lines (IntersectionObserver for reveal-on-scroll, smooth anchor scroll)
- **Accessibility:** respects `prefers-reduced-motion`, semantic HTML, keyboard-focusable nav
- **Browser support:** all modern browsers (uses IntersectionObserver, CSS custom properties, `aspect-ratio`)

## Common edits

All in one file. Ctrl/Cmd+F for these markers:

- **Change accent color:** search `--accent: #D4FF4A` in `:root`
- **Add a timeline entry:** copy a `<div class="timeline-item">…</div>` block
- **Add a client:** copy an `<article class="client-card">…</article>` block
- **Add a skill category:** copy a `<div class="stack-group">…</div>` block — note the grid is sized for 9 items (3×3); adding more needs a grid adjustment
- **Update Topmate link:** search `topmate.io/harisankar_sivankutty` (appears in nav CTA + contact button)

Save and refresh — no compile step needed.
