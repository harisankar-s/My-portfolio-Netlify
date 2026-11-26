#!/usr/bin/env node
// Draws the cover thumbnails for the exam-prep cards on /guides/ as SVG
// (src/images/guides/{name}.svg). Each cover is a small diagram of what the
// exam is about, glowing on the site's night sky: an agent loop for CCAR-F,
// a cloud architecture for PCA, and so on. It also draws the hub's card
// covers (src/images/cards/). No dependencies.
//
//   npm run guide-covers
//
// /images/* is cached for 30 days, so a redrawn cover needs a new file name
// (bump VERSION) and the new path in exams.json / brainbyte.json tracks.
const fs = require("fs");
const path = require("path");

const VERSION = "1";
const OUT = path.join(__dirname, "..", "src/images/guides");
const W = 800, H = 500;
// Thumbnails show at ~300px wide, so drawn elements are scaled up from their
// layout sizes to stay readable.
const NODE = 1.7, SPARK = 1.35, LINE = 1.7;

// Deterministic randomness so covers don't change on every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => Math.round(n * 10) / 10;

// ---- glyphs on a 24-unit grid (stroke icons) ----
const G = {
  tool: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  chat: '<path d="M4 5h16v11H10l-4 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>',
  code: '<path d="M8.5 8l-4 4 4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.5V21"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  chart: '<path d="M4 20h16"/><path d="M6 16l4-5 3.5 3L19 7"/><circle cx="19" cy="7" r="1.2"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.8 14.6c2.3.3 4 1.8 4.7 4.4"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="1.6"/><rect x="4" y="13" width="16" height="7" rx="1.6"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h6M11 16.5h6"/>',
  k8s: '<path d="M12 2.8l7.6 3.7 1.9 8.2-5.3 6.6H7.8l-5.3-6.6 1.9-8.2z"/><circle cx="12" cy="12" r="2.4"/><path d="M12 6v3.6M12 14.4V18M6.6 9.8l3.1 1.4M14.3 12.8l3.1 1.4M17.4 9.8l-3.1 1.4M9.7 12.8l-3.1 1.4"/>',
  split: '<path d="M4 12h6"/><path d="M10 12c3 0 4-5 8-5M10 12c3 0 4 5 8 5"/><path d="M16 5l2 2-2 2M16 15l2 2-2 2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.8 2.6 14.2 0 17M12 3.5c-2.6 2.8-2.6 14.2 0 17"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l3 2.5L7 15M12.5 15.5h4.5"/>',
  sensor: '<circle cx="12" cy="13" r="2"/><path d="M8.5 9.5a5 5 0 0 0 0 7M15.5 9.5a5 5 0 0 1 0 7M6 7a8.5 8.5 0 0 0 0 12M18 7a8.5 8.5 0 0 1 0 12"/>',
  funnel: '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  book: '<path d="M4 5.5c2.5-1 5.5-1 8 .8v13c-2.5-1.8-5.5-1.8-8-.8z"/><path d="M20 5.5c-2.5-1-5.5-1-8 .8v13c2.5-1.8 5.5-1.8 8-.8z"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  film: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M16 3v18M4 7.5h4M4 12h4M4 16.5h4M16 7.5h4M16 12h4M16 16.5h4"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4v-4.5M21.5 9.5v5"/>',
  layers: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5"/>',
  wand: '<path d="M4 20L15 9"/><path d="M13 7l4 4"/><path d="M18 3v3M16.5 4.5h3M20 9v2M19 10h2M10 3.5v2M9 4.5h2"/>',
  rocket: '<path d="M12 3c3.5 2 5 5.5 5 9.5l-2.5 3h-5L7 12.5C7 8.5 8.5 5 12 3z"/><circle cx="12" cy="10" r="1.8"/><path d="M9.5 15.5L7 19l3-1M14.5 15.5L17 19l-3-1"/>',
  graph: '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="12" cy="17" r="2.2"/><circle cx="5" cy="17" r="1.6"/><path d="M7.9 7.2l2.9 7.9M16.6 8.8l-3.4 6.4M8 6.3l7.8.5M6.6 17h3.2"/>',
  repo: '<path d="M6 3.5h11a1 1 0 0 1 1 1V18H7.5A1.5 1.5 0 0 0 6 19.5zM6 19.5A1.5 1.5 0 0 0 7.5 21H18"/><path d="M9.5 7.5h5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
  rules: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2 2.3-2.2M4 18l1.2 1.2 2.3-2.2"/>',
  web: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18M7 13h6M7 16h9"/>',
  pen: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  star: '<path d="M12 3c.6 4.6 3.4 7.9 8 9-4.6 1.1-7.4 4.4-8 9-.6-4.6-3.4-7.9-8-9 4.6-1.1 7.4-4.4 8-9z"/>',
};

class Scene {
  constructor(name, pal, seed) { this.name = name; this.p = pal; this.r = rng(seed); this.defs = []; this.body = []; this.id = 0; }
  uid(s) { return `${s}${++this.id}`; }
  add(x) { this.body.push(x); return this; }
  sky() {
    const p = this.p, r = this.r;
    this.defs.push(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset=".65" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.bot}"/></linearGradient>`,
      `<filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>`,
      `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
      `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`,
      `<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`,
      `<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".035"/></pattern>`);
    this.add(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
    for (const [cx, cy, rx, ry, c, o] of p.nebula) this.add(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${o}" filter="url(#blur40)"/>`);
    this.add(`<rect width="${W}" height="${H}" fill="url(#grid)"/>`);
    let stars = "";
    for (let i = 0; i < 140; i++) {
      const x = r() * W, y = r() * H, s = r() < .08 ? 1.6 : r() * .9 + .3;
      stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#fff" opacity="${f(.25 + r() * .6)}"/>`;
    }
    this.add(`<g>${stars}</g>`);
    return this;
  }
  finish() { this.add(`<rect width="${W}" height="${H}" fill="url(#vig)"/>`); }
  // Claude-style sparkle: tapered rays around a soft core.
  sparkle(cx, cy, R, color = "#E8845F", rays = 12) {
    R *= SPARK;
    let g = "";
    for (let i = 0; i < rays; i++) {
      const a = (360 / rays) * i + (i % 2 ? 7 : 0), len = R * (i % 3 === 0 ? 1 : i % 3 === 1 ? .82 : .9);
      g += `<path d="M${f(-R * .07)} 0 Q0 ${f(-len * .5)} 0 ${f(-len)} Q0 ${f(-len * .5)} ${f(R * .07)} 0 Z" transform="rotate(${a})"/>`;
    }
    return this.add(`<g transform="translate(${cx} ${cy})"><circle r="${f(R * 1.3)}" fill="${color}" opacity=".22" filter="url(#soft)"/><g fill="${color}" filter="url(#glow)">${g}<circle r="${f(R * .12)}" fill="#3a2016" opacity=".55"/></g></g>`);
  }
  // A glassy tile with a glowing glyph.
  node(cx, cy, s, glyph, color, opts = {}) {
    s *= NODE;
    const k = s / 24, half = s * 1.05, rad = s * .32;
    const tile = opts.bare ? "" :
      `<rect x="${f(-half)}" y="${f(-half)}" width="${f(half * 2)}" height="${f(half * 2)}" rx="${f(rad)}" fill="${opts.fill || "#0E1630"}" fill-opacity=".85" stroke="${color}" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<rect x="${f(-half + 2)}" y="${f(-half + 2)}" width="${f(half * 2 - 4)}" height="${f(half * .9)}" rx="${f(rad - 2)}" fill="#fff" opacity=".05"/>`;
    return this.add(`<g transform="translate(${cx} ${cy})">${tile}<g transform="translate(${f(-12 * k)} ${f(-12 * k)}) scale(${f(k)})" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">${G[glyph]}</g></g>`);
  }
  link(x1, y1, x2, y2, color, { bend = 0, dash = false, dots = 0, w = 1.6, o = .55 } = {}) {
    w *= LINE;
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    let d = `<path d="M${f(x1)} ${f(y1)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${o}"${dash ? ' stroke-dasharray="4 6"' : ""} stroke-linecap="round"/>`;
    for (let i = 1; i <= dots; i++) {
      const t = i / (dots + 1), x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2;
      d += `<circle cx="${f(x)}" cy="${f(y)}" r="4.2" fill="${color}" filter="url(#glow)"/>`;
    }
    return this.add(d);
  }
  box(x, y, w, h, color, { dash = true, o = .45, r = 16, fill = "none" } = {}) {
    return this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${color}" stroke-opacity="${o}" stroke-width="1.4"${dash ? ' stroke-dasharray="5 6"' : ""}/>`);
  }
  svg() {
    this.finish();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true"><defs>${this.defs.join("")}</defs>${this.body.join("")}</svg>\n`;
  }
}

const ORANGE = "#EE8A63", BLUE = "#7FB2FF", CYAN = "#5EE0F0", VIOLET = "#B79BFF", GREEN = "#5EE6A8", AMBER = "#FFC46B", RED = "#FF6A4D";
const covers = {};

// CCAR-F: the agent loop. Claude at the centre, its tools in orbit.
covers["ccar-f"] = (() => {
  const s = new Scene("ccar-f", { top: "#060B1E", mid: "#0C1A3E", bot: "#10224D", nebula: [[400, 250, 260, 170, "#1F4FE0", .45], [620, 120, 160, 90, "#6A3BE0", .3]] }, 11).sky();
  s.add(`<ellipse cx="400" cy="250" rx="250" ry="180" fill="none" stroke="${BLUE}" stroke-opacity=".25" stroke-dasharray="3 7"/>`);
  s.add(`<ellipse cx="400" cy="250" rx="150" ry="108" fill="none" stroke="${ORANGE}" stroke-opacity=".22"/>`);
  const tools = [["tool", 0], ["search", 45], ["doc", 90], ["chat", 135], ["db", 180], ["code", 225], ["plug", 270], ["gear", 315]];
  for (const [g, a] of tools) {
    const x = 400 + 250 * Math.cos((a - 90) * Math.PI / 180), y = 250 + 180 * Math.sin((a - 90) * Math.PI / 180);
    s.link(400, 250, x, y, BLUE, { o: .18, w: 1 });
    s.node(f(x), f(y), 20, g, a % 90 === 0 ? ORANGE : BLUE);
  }
  // loop arrows on the inner ring
  s.add(`<path d="M520 182 A150 108 0 0 1 548 270" fill="none" stroke="${ORANGE}" stroke-width="2.2" stroke-linecap="round" filter="url(#glow)"/><path d="M541 262l7 10 6-11" fill="none" stroke="${ORANGE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`);
  s.add(`<path d="M280 318 A150 108 0 0 1 252 230" fill="none" stroke="${ORANGE}" stroke-width="2.2" stroke-linecap="round" filter="url(#glow)"/><path d="M259 238l-7-10-6 11" fill="none" stroke="${ORANGE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`);
  return s.sparkle(400, 250, 62).svg();
})();

// CCAR-P: a multi-agent system with governance and evaluation.
covers["ccar-p"] = (() => {
  const s = new Scene("ccar-p", { top: "#0A0820", mid: "#1A1240", bot: "#2A1640", nebula: [[400, 130, 240, 120, "#6A3BE0", .45], [400, 470, 360, 110, "#E0820E", .25]] }, 22).sky();
  s.box(150, 285, 500, 150, VIOLET, { o: .35 });
  for (const x of [250, 400, 550]) s.link(400, 150, x, 355, ORANGE, { dots: 2, o: .5 });
  s.link(250, 355, 400, 355, VIOLET, { dash: true, o: .4 }).link(400, 355, 550, 355, VIOLET, { dash: true, o: .4 });
  s.sparkle(400, 145, 52);
  for (const x of [250, 400, 550]) s.sparkle(x, 358, 26, "#F2A27F", 10);
  s.node(110, 150, 24, "shield", GREEN).node(690, 150, 24, "chart", AMBER);
  s.link(150, 150, 345, 145, GREEN, { dash: true, o: .4, bend: .08 }).link(650, 150, 455, 145, AMBER, { dash: true, o: .4, bend: -.08 });
  s.node(95, 400, 18, "lock", VIOLET).node(705, 400, 18, "users", VIOLET);
  return s.svg();
})();

// CCDV-F: building with the API. An editor sends requests to Claude.
covers["ccdv-f"] = (() => {
  const s = new Scene("ccdv-f", { top: "#05121C", mid: "#082436", bot: "#0B2E3E", nebula: [[300, 260, 260, 170, "#0E9F6E", .35], [640, 140, 150, 110, "#1F4FE0", .35]] }, 33).sky();
  s.add(`<g transform="translate(90 95)"><rect width="390" height="300" rx="18" fill="#0A1622" fill-opacity=".9" stroke="${GREEN}" stroke-opacity=".45" stroke-width="1.5"/><rect width="390" height="38" rx="18" fill="#fff" opacity=".05"/><circle cx="24" cy="19" r="5" fill="#FF6A4D"/><circle cx="42" cy="19" r="5" fill="${AMBER}"/><circle cx="60" cy="19" r="5" fill="${GREEN}"/></g>`);
  const lines = [[0, 140, CYAN], [1, 210, VIOLET], [1, 120, GREEN], [2, 180, AMBER], [2, 90, CYAN], [1, 60, VIOLET], [0, 100, GREEN], [1, 200, CYAN], [2, 150, ORANGE], [0, 70, VIOLET]];
  lines.forEach(([ind, w, c], i) => s.add(`<rect x="${120 + ind * 26}" y="${150 + i * 22}" width="${w}" height="8" rx="4" fill="${c}" opacity=".75"/>`));
  s.add(`<rect x="${120 + 26 * 2 + 150 + 6}" y="${150 + 8 * 22 - 4}" width="3" height="16" fill="#fff" filter="url(#glow)"/>`);
  s.link(480, 190, 620, 160, ORANGE, { dots: 3, bend: -.12 });
  s.link(620, 300, 480, 300, CYAN, { dots: 3, bend: -.12 });
  s.add(`<text x="500" y="118" fill="${ORANGE}" font-family="ui-monospace, Menlo, monospace" font-size="21" font-weight="600" opacity=".9">POST /v1/messages</text>`);
  s.sparkle(660, 225, 48);
  s.node(700, 405, 18, "tool", CYAN).node(585, 415, 16, "plug", VIOLET);
  return s.svg();
})();

// PCA: a Google Cloud architecture. Users → load balancer → two regions → database.
covers["pca"] = (() => {
  const s = new Scene("pca", { top: "#050D22", mid: "#0B1E48", bot: "#0E2655", nebula: [[400, 220, 330, 190, "#1F4FE0", .5], [140, 420, 160, 90, "#0E9F6E", .2], [680, 90, 140, 80, "#E0820E", .18]] }, 44).sky();
  // the cloud boundary, with Google's four colours on its rim
  s.add(`<path d="M150 440 H650 a70 70 0 0 0 6 -139 a95 95 0 0 0 -150 -88 a120 120 0 0 0 -222 30 a85 85 0 0 0 -134 95 a52 52 0 0 0 0 102z" fill="#7FB2FF" fill-opacity=".05" stroke="${BLUE}" stroke-opacity=".55" stroke-width="2" filter="url(#glow)"/>`);
  for (const [x, y, c] of [[196, 300, "#4285F4"], [330, 215, "#EA4335"], [520, 212, "#FBBC04"], [660, 300, "#34A853"]]) s.add(`<circle cx="${x}" cy="${y}" r="5" fill="${c}" filter="url(#glow)"/>`);
  s.node(400, 58, 17, "users", "#DCE8FF");
  s.link(400, 85, 400, 228, BLUE, { dots: 2 });
  s.node(400, 245, 19, "split", BLUE);
  s.box(180, 296, 200, 92, BLUE, { o: .45 }).box(420, 296, 200, 92, BLUE, { o: .45 });
  s.link(380, 262, 290, 300, BLUE, { o: .5 }).link(420, 262, 510, 300, BLUE, { o: .5 });
  s.node(235, 342, 16, "server", CYAN).node(325, 342, 16, "k8s", CYAN).node(475, 342, 16, "server", CYAN).node(565, 342, 16, "k8s", CYAN);
  s.link(290, 382, 385, 410, GREEN, { o: .5 }).link(510, 382, 415, 410, GREEN, { o: .5 });
  s.node(400, 428, 15, "db", GREEN);
  return s.svg();
})();

// GCP Data Engineer: sensors stream into Pub/Sub, Dataflow processes, BigQuery stores.
covers["gcp-pde"] = (() => {
  const s = new Scene("gcp-pde", { top: "#04121A", mid: "#07263A", bot: "#0A2F46", nebula: [[420, 260, 330, 160, "#0B7FA6", .45], [140, 120, 150, 100, "#1F4FE0", .3]] }, 55).sky();
  for (const [y] of [[130], [250], [370]]) s.link(130, y, 300, 250, CYAN, { dots: 2, bend: (250 - y) / 900, o: .45 });
  s.link(320, 250, 480, 250, CYAN, { dots: 2 }).link(480, 250, 660, 250, BLUE, { dots: 2 });
  for (const [y, g] of [[130, "sensor"], [250, "users"], [370, "sensor"]]) s.node(95, y, 15, g, CYAN);
  s.node(300, 250, 19, "chat", CYAN).node(480, 250, 20, "funnel", BLUE).node(665, 250, 24, "table", AMBER);
  s.add(`<path d="M545 120 l35 -22 l35 12 l35 -36 l45 -14" fill="none" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`);
  s.box(525, 52, 230, 88, AMBER, { o: .3, dash: false });
  s.add(`<path d="M0 430 C200 390 300 470 470 425 S700 400 800 430 V500 H0z" fill="${CYAN}" opacity=".08"/>`);
  return s.svg();
})();

// Production data engineering: a pipeline DAG with quality gates, one flagged.
covers["data-engineering"] = (() => {
  const s = new Scene("data-engineering", { top: "#04140F", mid: "#08261C", bot: "#0B2F24", nebula: [[400, 250, 320, 170, "#0E9F6E", .4], [680, 90, 140, 90, "#E0820E", .2]] }, 66).sky();
  const N = { a: [100, 150], b: [100, 350], c: [295, 250], d: [495, 140], e: [495, 360], f: [695, 250] };
  for (const [u, v] of [["a", "c"], ["b", "c"], ["c", "d"], ["c", "e"], ["d", "f"], ["e", "f"]]) s.link(N[u][0], N[u][1], N[v][0], N[v][1], GREEN, { dots: 2, o: .5 });
  s.node(...N.a, 18, "db", GREEN).node(...N.b, 18, "doc", GREEN).node(...N.c, 20, "gear", GREEN).node(...N.d, 18, "table", GREEN).node(...N.e, 18, "table", AMBER).node(...N.f, 20, "chart", GREEN);
  for (const k of ["c", "d", "f"]) s.add(`<g transform="translate(${N[k][0] + 34} ${N[k][1] - 34})"><circle r="13" fill="#0B2F24" stroke="${GREEN}"/><path d="M-4.5 0l3 3 6-6" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round"/></g>`);
  s.add(`<g transform="translate(${N.e[0] + 34} ${N.e[1] - 34})"><circle r="13" fill="#2A1E0B" stroke="${AMBER}"/><path d="M0 -5v5M0 4v.5" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round"/></g>`);
  s.add(`<path d="M640 50 a26 26 0 1 0 22 38 a20 20 0 0 1 -22 -38z" fill="#F4E7C5" opacity=".9" filter="url(#glow)"/>`);
  return s.svg();
})();

// Databricks: the lakehouse. Bronze, silver and gold layers under one roof.
covers["databricks"] = (() => {
  const s = new Scene("databricks", { top: "#12060A", mid: "#2A0C12", bot: "#1B0C1A", nebula: [[400, 170, 300, 150, "#FF3621", .35], [150, 420, 200, 100, "#6A3BE0", .25]] }, 77).sky();
  s.add(`<path d="M200 230 L400 105 L600 230" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`);
  s.add(`<path d="M250 230 V395 M550 230 V395" stroke="${RED}" stroke-opacity=".4" stroke-width="2" stroke-dasharray="4 6"/>`);
  const layers = [[250, "#E8B04B", "gold"], [305, "#B9C2CF", "silver"], [360, "#C27A45", "bronze"]];
  for (const [y, c] of layers) s.add(`<path d="M190 ${y} C280 ${y - 14} 340 ${y + 14} 400 ${y} S520 ${y - 14} 610 ${y} V${y + 38} C520 ${y + 52} 460 ${y + 24} 400 ${y + 38} S280 ${y + 52} 190 ${y + 38}z" fill="${c}" fill-opacity=".22" stroke="${c}" stroke-opacity=".8" stroke-width="1.6" filter="url(#glow)"/>`);
  s.node(400, 182, 14, "chart", AMBER, { bare: true });
  for (const [x, y] of [[140, 120], [660, 150], [700, 360], [110, 330]]) s.sparkle(x, y, 10, "#FF7A5C", 8);
  s.add(`<path d="M0 440 C160 425 260 455 400 440 S650 425 800 445 V500 H0z" fill="${RED}" opacity=".08"/>`);
  return s.svg();
})();


// ---- card covers (src/images/cards/): free resources (rs-{slug}) and
// starter kits (kit-{name}). Same night sky; one small picture per card.
const cards = {};
const PAL = {
  blue: { top: "#050D22", mid: "#0B1E48", bot: "#0E2655", nebula: [[400, 250, 300, 170, "#1F4FE0", .5], [660, 100, 150, 90, "#6A3BE0", .25]] },
  violet: { top: "#0A0820", mid: "#1A1240", bot: "#24123E", nebula: [[400, 240, 300, 160, "#6A3BE0", .5], [160, 420, 180, 90, "#C2368F", .2]] },
  green: { top: "#04140F", mid: "#08261C", bot: "#0B2F24", nebula: [[400, 250, 320, 170, "#0E9F6E", .42], [670, 100, 140, 90, "#1F4FE0", .25]] },
  amber: { top: "#120A06", mid: "#24140C", bot: "#1C1220", nebula: [[400, 250, 300, 160, "#E0820E", .35], [150, 110, 160, 90, "#6A3BE0", .25]] },
  teal: { top: "#04121A", mid: "#07263A", bot: "#0A2F46", nebula: [[420, 260, 330, 160, "#0B7FA6", .45], [140, 120, 150, 100, "#1F4FE0", .3]] },
};
// A hub glyph (or Claude's sparkle) at the centre with its parts in orbit.
function orbit(name, pal, seed, center, sats, c1, c2) {
  const s = new Scene(name, PAL[pal], seed).sky();
  const rx = 255, ry = 165;
  s.add(`<ellipse cx="400" cy="250" rx="${rx}" ry="${ry}" fill="none" stroke="${c1}" stroke-opacity=".22" stroke-dasharray="3 7"/>`);
  s.add(`<ellipse cx="400" cy="250" rx="145" ry="96" fill="none" stroke="${c2}" stroke-opacity=".2"/>`);
  sats.forEach((g, i) => {
    const a = -150 + (300 / Math.max(1, sats.length - 1)) * i, rad = (a - 90) * Math.PI / 180;
    const x = 400 + rx * Math.sin((a) * Math.PI / 180) * 1, y = 250 - ry * Math.cos((a) * Math.PI / 180);
    s.link(400, 250, x, y, c1, { o: .2, w: 1, dots: i % 2 ? 1 : 0 });
    s.node(f(x), f(y), 18, g, i % 2 ? c2 : c1);
    void rad;
  });
  if (center === "sparkle") s.sparkle(400, 250, 60);
  else s.node(400, 250, 30, center, c2);
  return s.svg();
}
// A left-to-right flow of steps, with a quality badge on each.
function flow(name, pal, seed, steps, c1, c2, flag = -1) {
  const s = new Scene(name, PAL[pal], seed).sky();
  const n = steps.length, x0 = 110, x1 = 690;
  const xs = steps.map((_, i) => x0 + ((x1 - x0) / (n - 1)) * i), ys = steps.map((_, i) => 250 + (i % 2 ? -60 : 60) * (i > 0 && i < n - 1 ? 1 : 0));
  for (let i = 0; i < n - 1; i++) s.link(xs[i], ys[i], xs[i + 1], ys[i + 1], c1, { dots: 2, o: .5 });
  steps.forEach((g, i) => {
    s.node(xs[i], ys[i], i === n - 1 ? 22 : 19, g, i === flag ? AMBER : i === n - 1 ? c2 : c1);
    const bx = xs[i] + 34, by = ys[i] - 36;
    if (i === flag) s.add(`<g transform="translate(${bx} ${by})"><circle r="12" fill="#2A1E0B" stroke="${AMBER}"/><path d="M0 -5v5M0 4v.5" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round"/></g>`);
    else if (i % 2 === 0) s.add(`<g transform="translate(${bx} ${by})"><circle r="12" fill="#0B1A2A" stroke="${GREEN}"/><path d="M-4.5 0l3 3 6-6" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round"/></g>`);
  });
  s.add(`<path d="M0 440 C200 405 300 470 470 430 S700 410 800 435 V500 H0z" fill="${c1}" opacity=".07"/>`);
  return s.svg();
}

// Free resources: each cover carries a short headline from its title on the
// left (the number or key word, then two short lines) and a picture of the
// thing itself on the right. The card's category tag sits over the top-left.
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const txt = (x, y, size, str, { fill = "#fff", w = 700, o = 1, font = FONT, ls = 0, anchor = "start" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" fill-opacity="${o}" font-family="${font}" font-size="${size}" font-weight="${w}" letter-spacing="${ls}" text-anchor="${anchor}">${esc(str)}</text>`;
function resource(name, pal, seed, hero, lines, c1, art) {
  const s = new Scene(name, PAL[pal], seed).sky();
  s.defs.push(`<linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${c1}"/></linearGradient>`);
  s.defs.push(`<linearGradient id="shadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".45" stop-color="#000" stop-opacity=".15"/><stop offset=".6" stop-color="#000" stop-opacity="0"/></linearGradient>`);
  s.add(`<rect width="800" height="500" fill="url(#shadeL)"/>`);
  const hs = hero.length <= 1 ? 170 : hero.length === 2 ? 150 : hero.length === 3 ? 118 : 96;
  s.add(`<text x="52" y="285" fill="url(#hero)" font-family="${FONT}" font-size="${hs}" font-weight="800" letter-spacing="-4" filter="url(#glow)">${esc(hero)}</text>`);
  lines.forEach((l, i) => s.add(txt(56, 345 + i * 44, 36, l, { o: i ? .72 : .95, ls: -.5 })));
  s.add(`<rect x="56" y="${345 + lines.length * 44 - 8}" width="56" height="5" rx="2.5" fill="${c1}" filter="url(#glow)"/>`);
  art(s);
  return s.svg();
}
const win = (s, x, y, w, h, c, title) => s.add(`<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="16" fill="#0A1222" fill-opacity=".92" stroke="${c}" stroke-opacity=".55" stroke-width="1.6"/><rect width="${w}" height="34" rx="16" fill="#fff" opacity=".05"/><circle cx="20" cy="17" r="4.5" fill="#FF6A4D"/><circle cx="36" cy="17" r="4.5" fill="${AMBER}"/><circle cx="52" cy="17" r="4.5" fill="${GREEN}"/>${title ? txt(w > 220 ? w / 2 : 66, 22, 14, title, { fill: "#C9D3E6", w: 500, font: MONO, anchor: w > 220 ? "middle" : "start", o: .8 }) : ""}</g>`);

const RES = {
  "four-rules-that-stop-claude-overbuilding": () => resource("rs-four-rules", "amber", 301, "4", ["rules that stop", "overbuilding"], ORANGE, (s) => {
    win(s, 440, 70, 320, 360, ORANGE, "CLAUDE.md");
    ["Ask before guessing", "Keep the code small", "Touch only what's asked", "Prove it works"].forEach((t, i) => {
      const y = 145 + i * 72;
      s.add(`<circle cx="478" cy="${y}" r="17" fill="${ORANGE}" fill-opacity=".18" stroke="${ORANGE}" stroke-width="1.6"/>`);
      s.add(txt(478, y + 6, 17, String(i + 1), { fill: ORANGE, w: 800, anchor: "middle" }));
      s.add(txt(506, y + 6, 17, t, { fill: "#E6ECF7", w: 600 }));
      s.add(`<path d="M728 ${y}l6 6 12-12" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
    });
  }),
  "free-ai-courses-on-github": () => resource("rs-courses", "green", 302, "7", ["free AI courses", "on GitHub"], GREEN, (s) => {
    [[-10, 470, 120, BLUE], [-3, 500, 105, VIOLET], [4, 530, 90, GREEN]].forEach(([r, x, y, c], i) => {
      s.add(`<g transform="translate(${x} ${y}) rotate(${r})"><rect width="220" height="280" rx="18" fill="#0B1A16" fill-opacity=".95" stroke="${c}" stroke-opacity=".6" stroke-width="1.6"/>${i === 2 ? "" : ""}</g>`);
    });
    s.node(640, 190, 22, "cap", GREEN, { bare: true });
    s.add(txt(640, 262, 15, "LESSON 1 OF 12", { fill: GREEN, w: 700, font: MONO, anchor: "middle", ls: 1.5 }));
    [0, 1, 2].forEach((i) => s.add(`<rect x="560" y="${288 + i * 26}" width="160" height="9" rx="4.5" fill="#fff" opacity=".12"/><rect x="560" y="${288 + i * 26}" width="${[150, 96, 40][i]}" height="9" rx="4.5" fill="${GREEN}" opacity=".85"/>`));
    s.node(735, 95, 13, "repo", CYAN);
  }),
  "add-3d-animations-to-your-videos-with-claude": () => resource("rs-3d", "violet", 303, "3D", ["animations for", "your videos"], VIOLET, (s) => {
    const c = (x, y, z) => [600 + (x - z) * 0.87 * 95, 200 + (x + z) * 0.5 * 95 - y * 95];
    const P = [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => c(x * .8, y * .8, z * .8));
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    s.add(`<path d="M${f(P[4][0])} ${f(P[4][1])} L${f(P[5][0])} ${f(P[5][1])} L${f(P[6][0])} ${f(P[6][1])} L${f(P[7][0])} ${f(P[7][1])}Z" fill="${VIOLET}" opacity=".18"/>`);
    s.add(`<g stroke="${VIOLET}" stroke-width="2.4" stroke-linecap="round" filter="url(#glow)">${E.map(([a, b]) => `<path d="M${f(P[a][0])} ${f(P[a][1])} L${f(P[b][0])} ${f(P[b][1])}"/>`).join("")}</g>`);
    P.forEach(([x, y]) => s.add(`<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${CYAN}" filter="url(#glow)"/>`));
    s.add(`<ellipse cx="600" cy="200" rx="190" ry="60" fill="none" stroke="${CYAN}" stroke-opacity=".35" stroke-dasharray="3 7" transform="rotate(-14 600 200)"/>`);
    s.add(`<rect x="440" y="395" width="320" height="40" rx="10" fill="#140F2E" stroke="${VIOLET}" stroke-opacity=".5"/>`);
    [470, 540, 625, 700].forEach((x, i) => s.add(`<path d="M${x} 405l10 10-10 10-10-10z" fill="${i === 2 ? CYAN : VIOLET}" opacity=".9"/>`));
    s.add(`<path d="M625 385v60" stroke="#fff" stroke-width="2" filter="url(#glow)"/>`);
  }),
  "claude-connectors-worth-adding": () => resource("rs-connectors", "amber", 304, "8", ["Claude connectors", "worth adding"], ORANGE, (s) => {
    const G8 = ["mail", "db", "doc", "chat", "search", "bell", "table", "globe"];
    G8.forEach((g, i) => {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x = 600 + 155 * Math.cos(a), y = 245 + 150 * Math.sin(a);
      s.link(600, 245, x, y, ORANGE, { o: .3, w: 1, dots: 1 });
      s.node(f(x), f(y), 14, g, i % 2 ? AMBER : CYAN);
    });
    s.add(`<circle cx="600" cy="245" r="56" fill="#1A120C" stroke="${ORANGE}" stroke-opacity=".6" stroke-width="1.6"/>`);
    s.sparkle(600, 245, 34);
  }),
  "github-repos-for-claude-code": () => resource("rs-repos", "amber", 305, "15", ["repos that make", "Claude Code better"], AMBER, (s) => {
    win(s, 435, 70, 330, 360, AMBER, "~/claude-code");
    s.add(txt(458, 136, 16, "$ git clone …", { fill: GREEN, w: 600, font: MONO }));
    ["skills", "agents", "hooks", "mcp-servers", "commands"].forEach((r, i) => {
      const y = 180 + i * 48;
      s.add(`<rect x="456" y="${y - 24}" width="288" height="38" rx="9" fill="#fff" fill-opacity=".04" stroke="#fff" stroke-opacity=".08"/>`);
      s.node(478, y - 5, 9, "repo", AMBER, { bare: true });
      s.add(txt(502, y + 1, 16, r, { fill: "#E6ECF7", w: 600, font: MONO }));
      s.add(`<path d="M716 ${y - 14}l3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1z" fill="${AMBER}" opacity=".9"/>`);
    });
  }),
  "free-repos-for-better-claude-videos": () => resource("rs-video-repos", "violet", 306, "6", ["repos for videos", "that don't look AI"], VIOLET, (s) => {
    s.add(`<rect x="430" y="125" width="345" height="230" rx="12" fill="#0B0918" stroke="${VIOLET}" stroke-opacity=".5"/>`);
    for (let i = 0; i < 12; i++) s.add(`<rect x="${442 + i * 28}" y="134" width="14" height="10" rx="2" fill="#fff" opacity=".25"/><rect x="${442 + i * 28}" y="336" width="14" height="10" rx="2" fill="#fff" opacity=".25"/>`);
    [[442, "#3B2A7A", "#F2A27F"], [557, "#1E3A6B", "#7FB2FF"], [672, "#4A2048", "#FFC46B"]].forEach(([x, sky, sun], i) => {
      s.add(`<g><rect x="${x}" y="156" width="100" height="168" rx="6" fill="${sky}"/><circle cx="${x + 62}" cy="${218 + i * 6}" r="18" fill="${sun}" opacity=".9" filter="url(#glow)"/><path d="M${x} 324 L${x + 30} ${270 - i * 8} L${x + 55} 292 L${x + 80} ${258 + i * 6} L${x + 100} 286 V324z" fill="#0B0918" opacity=".85"/></g>`);
    });
    s.add(`<circle cx="602" cy="240" r="30" fill="#fff" fill-opacity=".92"/><path d="M594 226l22 14-22 14z" fill="#1A1240"/>`);
    s.node(740, 410, 13, "repo", VIOLET).node(470, 410, 13, "wand", CYAN);
  }),
  "run-gemini-inside-claude-code": () => resource("rs-gemini", "blue", 307, "2", ["builders in one", "Claude Code"], BLUE, (s) => {
    win(s, 430, 150, 160, 220, ORANGE, "claude");
    win(s, 615, 150, 160, 220, BLUE, "gemini");
    [[450, ORANGE], [635, BLUE]].forEach(([x, c]) => [0, 1, 2, 3, 4].forEach((i) => s.add(`<rect x="${x}" y="${200 + i * 30}" width="${[110, 80, 120, 60, 95][(i + (x > 600 ? 2 : 0)) % 5]}" height="8" rx="4" fill="${c}" opacity=".7"/>`)));
    s.sparkle(510, 98, 28);
    s.add(`<g transform="translate(695 98)" filter="url(#glow)"><path d="M0 -38c3 20 15 35 38 38-23 3-35 18-38 38-3-20-15-35-38-38 23-3 35-18 38-38z" fill="${BLUE}"/></g>`);
    s.add(`<path d="M592 410 C620 430 640 430 668 410" fill="none" stroke="${CYAN}" stroke-width="2.4" stroke-linecap="round" filter="url(#glow)"/><path d="M660 404l8 6-9 4" fill="none" stroke="${CYAN}" stroke-width="2.4" stroke-linecap="round"/>`);
  }),
  "give-claude-a-map-of-your-codebase": () => resource("rs-map", "teal", 308, "Map", ["your codebase", "with graphify"], CYAN, (s) => {
    const r = rng(42), pts = [];
    [[530, 160, CYAN], [690, 170, ORANGE], [560, 340, GREEN], [710, 340, VIOLET]].forEach(([cx, cy, c]) => {
      const hub = [cx, cy, c]; pts.push(hub);
      for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = 35 + r() * 40, p = [cx + d * Math.cos(a), cy + d * Math.sin(a), c]; s.link(cx, cy, p[0], p[1], c, { o: .45, w: .8 }); pts.push(p); s.add(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="5" fill="${c}" opacity=".85"/>`); }
    });
    [[0, 7], [7, 14], [0, 14], [14, 21], [7, 21]].forEach(([a, b]) => s.link(pts[a][0], pts[a][1], pts[b][0], pts[b][1], "#DCE8FF", { o: .3, w: .9, dash: true }));
    [0, 7, 14, 21].forEach((i) => s.add(`<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="13" fill="${pts[i][2]}" filter="url(#glow)"/>`));
    s.add(`<g transform="translate(735 410)"><circle r="26" fill="none" stroke="#fff" stroke-width="4"/><path d="M19 19l20 20" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`);
  }),
  "which-ai-model-should-you-use": () => resource("rs-models", "blue", 309, "A/B", ["the 2-model test", "for any task"], CYAN, (s) => {
    s.add(`<path d="M450 400 H770" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`);
    [["A", ORANGE, [150, 95, 180]], ["B", BLUE, [120, 210, 140]]].forEach(([l, c, hs], k) => hs.forEach((h, i) => {
      const x = 470 + i * 100 + k * 38;
      s.add(`<rect x="${x}" y="${400 - h}" width="32" height="${h}" rx="6" fill="${c}" fill-opacity=".8"${(k === 0 && i === 2) || (k === 1 && i === 1) ? ' filter="url(#glow)"' : ""}/>`);
    }));
    ["Speed", "Cost", "Quality"].forEach((t, i) => s.add(txt(505 + i * 100, 428, 14, t, { fill: "#C9D3E6", w: 600, font: MONO, anchor: "middle" })));
    s.add(`<g transform="translate(470 88)"><rect width="64" height="34" rx="17" fill="${ORANGE}" fill-opacity=".2" stroke="${ORANGE}"/>${txt(32, 23, 17, "A", { fill: ORANGE, w: 800, anchor: "middle" })}</g>`);
    s.add(txt(570, 112, 18, "vs", { fill: "#fff", o: .6, w: 600, anchor: "middle" }));
    s.add(`<g transform="translate(606 88)"><rect width="64" height="34" rx="17" fill="${BLUE}" fill-opacity=".2" stroke="${BLUE}"/>${txt(32, 23, 17, "B", { fill: BLUE, w: 800, anchor: "middle" })}</g>`);
    s.add(`<path d="M700 100l8 8 16-16" fill="none" stroke="${GREEN}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`);
  }),
  "make-a-cinematic-short-film-starring-you": () => resource("rs-film", "violet", 310, "30s", ["a cinematic film", "starring you"], AMBER, (s) => {
    s.defs.push(`<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1650"/><stop offset=".6" stroke-color="#000" stop-color="#C2568F"/><stop offset="1" stop-color="#FFB46B"/></linearGradient>`);
    s.add(`<rect x="430" y="130" width="345" height="220" rx="8" fill="url(#dusk)"/>`);
    s.add(`<circle cx="602" cy="290" r="46" fill="#FFD9A0" opacity=".9" filter="url(#glow)"/>`);
    s.add(`<path d="M430 350 V310 C500 296 560 316 602 306 S720 300 775 312 V350z" fill="#120A1E"/>`);
    s.add(`<g fill="#120A1E"><circle cx="560" cy="246" r="15"/><path d="M538 312 C540 278 548 264 560 264 S580 278 582 312z"/></g>`);
    s.add(`<rect x="430" y="130" width="345" height="26" fill="#000"/><rect x="430" y="324" width="345" height="26" fill="#000"/>`);
    s.add(`<g transform="translate(470 58) rotate(-8)"><rect width="150" height="58" rx="6" fill="#1A1A22" stroke="#fff" stroke-opacity=".4"/><path d="M0 0 h150 v18 h-150z" fill="#fff" opacity=".9"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${10 + i * 30} 0 l18 0 l-12 18 l-18 0z" fill="#1A1A22"/>`).join("")}${txt(14, 46, 16, "SCENE 1 · TAKE 1", { fill: "#fff", w: 700, font: MONO, o: .85 })}</g>`);
    s.add(txt(760, 400, 22, "REC ●", { fill: "#FF6A4D", w: 800, font: MONO, anchor: "end" }));
  }),
};
// v2: the first, orbit-style resource covers were v1; a new name skips any cached copy.
const RS_VERSION = "2";
for (const [slug, draw] of Object.entries(RES)) cards[`rs-${slug}`] = [draw(), RS_VERSION];

// Starter kits
cards["kit-website"] = orbit("kit-website", "green", 401, "web", ["user", "doc", "pen", "globe", "rocket"], GREEN, CYAN);
cards["kit-pipeline"] = flow("kit-pipeline", "teal", 402, ["sensor", "chat", "funnel", "table", "chart"], CYAN, AMBER);
cards["kit-quality"] = orbit("kit-quality", "green", 403, "shield", ["table", "check", "bell", "funnel", "chart"], GREEN, AMBER);
cards["kit-rag"] = orbit("kit-rag", "amber", 404, "sparkle", ["search", "doc", "db", "chat", "plug"], AMBER, ORANGE);
cards["kit-data-vault"] = orbit("kit-data-vault", "violet", 405, "layers", ["table", "db", "code", "lock", "graph"], VIOLET, CYAN);

const CARDS = path.join(__dirname, "..", "src/images/cards");
fs.mkdirSync(CARDS, { recursive: true });
for (const [name, entry] of Object.entries(cards)) {
  const [svg, v] = Array.isArray(entry) ? entry : [entry, VERSION];
  const file = path.join(CARDS, `${name}-v${v}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`${path.relative(path.join(__dirname, ".."), file)}  ${(svg.length / 1024).toFixed(1)} KB`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(covers)) {
  const file = path.join(OUT, `${name}-v${VERSION}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`${path.relative(path.join(__dirname, ".."), file)}  ${(svg.length / 1024).toFixed(1)} KB`);
}
