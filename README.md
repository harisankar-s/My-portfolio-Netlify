# Harisankar Sivankutty — Portfolio

Single-page portfolio for [harisankarsivankutty.in](https://harisankarsivankutty.in/).
Custom-designed, zero build step, deploys anywhere static.

## What's in this folder

```
harisankar-portfolio/
├── index.html      ← everything (HTML + CSS + JS inline, ~72 KB)
├── images/         ← portrait + 6 client logos + favicon
└── README.md
```

No npm, no gulp, no jQuery. Just open `index.html` in a browser and it works.

## Test locally

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

```bash
# Create a preview branch (recommended)
git checkout -b redesign

# Drop the new files in (at your repo root)
cp -r /path/to/harisankar-portfolio/* .

# Commit & push
git add .
git commit -m "Portfolio redesign"
git push origin redesign
```

Netlify generates a preview URL (`redesign--yoursite.netlify.app`). Verify it, then:

```bash
git checkout main
git merge redesign
git push origin main
```

**Netlify build settings** — this site needs no build step:

- **Build command:** leave empty
- **Publish directory:** `.` (root)

(Change from `npm run build` / `theme/` if that's your current setup.)

## Page structure

1. **[01] About** — decade-of-engineering intro, portrait, meta
2. **Credentials** — AWS Solutions Architect · Associate · RHCE · Current role
3. **[02] Experience · Work history** — timeline: Thoughtworks → Ayla → Bayer → 6D Technologies
4. **[03] Featured Projects · Case studies** — deep-dive case studies:
   - **JCPenney (USA)** — Enterprise Data Platform Modernisation. Great Expectations + DataHub, dbt, Spark on AWS EMR, Kafka
   - **Otto GmbH (Germany)** — Assortment Analytics Platform. Data Vault modelling, BigQuery-to-Snowflake pipeline
5. **[04] Clients · Domains** — 8 clients with hex tiles
6. **[05] Tech stack & skills** — 9-block grid: Data · Cloud · GenAI · Data Platform · Languages · Delivery · Certs · Domains · Always-learning note
7. **[06] Contact** — Topmate booking CTA · Email · LinkedIn · Twitter
8. **Footer**

## Personalize before merging to main

Find-and-replace in `index.html`:

| Currently in file | Change to |
|---|---|
| `hello@harisankarsivankutty.in` | Your real email (2 places in Contact) |
| `Within 48 hours` | Your real response time, if different |

Everything else — roles, experience, project details, certifications, Topmate link, LinkedIn, Twitter — is wired to your real values.

## Design spec

- **Fonts:** Instrument Serif (display) · JetBrains Mono (body/labels) — via Google Fonts CDN
- **Palette:** `#0A0A0B` bg · `#EDEDEB` fg · `#D4FF4A` electric-lime accent
- **Zero external JS libraries** — vanilla JS (~40 lines: IntersectionObserver for reveals, smooth anchor scroll, nav scroll state)
- **Accessibility:** respects `prefers-reduced-motion`, semantic HTML, keyboard-focusable nav
- **Mobile:** responsive breakpoints at 900px / 720px / 560px / 480px

## Adding a new project / client / skill

All in one file. Find these anchors with Ctrl/Cmd+F:

- **Add a project case study:** find `<!-- Project 02 — Otto -->`, copy the entire `<article class="project-card">…</article>` block below it, update the number to `03`, fill in content. Don't forget to update the heading "`Project 03 / 03`" in other cards if you want the counter accurate.
- **Add a client:** find `<!-- CLIENTS / DOMAINS -->`, copy any `<article class="client-card">…</article>` block. For logo tiles, use `<div class="client-hex"><img src="..."></div>`. For text tiles, use `<div class="client-hex client-hex--text"><span class="hex-mark">XYZ</span></div>`.
- **Add a timeline entry:** copy a `<div class="timeline-item">…</div>` block under `<!-- EXPERIENCE -->`
- **Change accent color:** `--accent: #D4FF4A` in `:root`
- **Update Topmate link:** search `topmate.io/harisankar_sivankutty` (appears in nav CTA + contact button)

Save and refresh — no compile step.
