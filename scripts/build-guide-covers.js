#!/usr/bin/env node
// Draws the cover thumbnails for the exam-prep cards on /guides/ as SVG
// (src/images/guides/{name}.svg). Each cover is a small diagram of what the
// exam is about, glowing on the site's night sky: an agent loop for CCAR-F,
// a cloud architecture for PCA, and so on. No dependencies.
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

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(covers)) {
  const file = path.join(OUT, `${name}-v${VERSION}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`${path.relative(path.join(__dirname, ".."), file)}  ${(svg.length / 1024).toFixed(1)} KB`);
}
