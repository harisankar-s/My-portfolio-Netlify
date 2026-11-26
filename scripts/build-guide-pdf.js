#!/usr/bin/env node
// Builds the downloadable PDF for one exam-prep guide from src/_data/guides.json
// and saves it to src/files/{guide.pdf}, then writes the page count back to
// the guide's `pdfPages`. Uses the locally installed Google Chrome (headless,
// over the DevTools protocol, so the footer can carry "Page X of Y"); no npm
// dependencies. Needs Node 22+ (global WebSocket).
//
//   npm run guide-pdf -- gcp-pca-exam-tips
//   CHROME=/path/to/chrome npm run guide-pdf -- some-slug
//
// A new edition should get a new `pdf` filename (/files/* is cached).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const GUIDES = path.join(ROOT, "src/_data/guides.json");
const slug = process.argv[2];
if (!slug) { console.error("Usage: npm run guide-pdf -- <guide-slug>"); process.exit(1); }

const guides = JSON.parse(fs.readFileSync(GUIDES, "utf8"));
const g = guides.find((x) => x.slug === slug);
if (!g) { console.error(`No guide with slug "${slug}" in guides.json`); process.exit(1); }
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/site.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const word = g.domainWord || "Domain";
const tagOf = (d) => d.tag || `${word} ${d.n}`;
const weightOf = (d) => d.weightLabel || (d.weight ? `${d.weight}%` : "");
const lineOf = (d) => d.weightLabel || (d.weight ? `${d.weight}% of the exam` : "");
const added = new Date(g.added + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const guideUrl = `${site.portfolioUrl}/guides/${g.slug}/`;

const lesson = (l) => `
  <section class="lesson">
    <h3><span class="num">${esc(l.id)}</span> ${esc(l.title)}</h3>
    ${l.what ? `<p class="what">${rich(l.what)}</p>` : ""}
    <p class="tests"><b>What the exam tests:</b> ${rich(l.tests)}</p>
    <p class="label">Key rules</p>
    <ul class="rules">${l.rules.map((r) => `<li>${rich(r)}</li>`).join("")}</ul>
    <p class="label">${l.traps[0][2] ? "Exam traps <span>the answer that looks right, the one that is, and why</span>" : "Traps <span>wrong answer → right answer</span>"}</p>
    ${l.traps[0][2]
      ? l.traps.map((t) => `<div class="trap"><p class="tw"><span>✕ Tempting answer</span>${rich(t[0])}</p><p class="tr"><span>✓ Best answer</span>${rich(t[1])}</p><p class="ty"><b>Why:</b> ${rich(t[2])}</p></div>`).join("")
      : `<table class="traps">${l.traps.map((t) => `<tr><td class="w">${rich(t[0])}</td><td class="a">→</td><td class="r">${rich(t[1])}</td></tr>`).join("")}</table>`}
  </section>`;

const i = g.intro;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(g.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Inter, Arial, sans-serif; color: #0B1220; margin: 0; }
  h1 { font-size: 24pt; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6px; }
  h2 { font-size: 16pt; margin: 22px 0 6px; letter-spacing: -0.01em; }
  h3 { font-size: 12.5pt; margin: 0 0 6px; }
  p { margin: 0 0 8px; }
  code { font: 9.5pt "SF Mono", Menlo, monospace; background: #EEF2F8; padding: 0 3px; border-radius: 3px; }
  .kicker { font: 600 8.5pt "SF Mono", Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; color: #0066CC; margin-bottom: 8px; }
  .byline { color: #5A6478; margin-bottom: 14px; }
  .pitch { font-size: 12pt; color: #3A4458; }
  .stats { display: flex; gap: 8px; margin: 12px 0 4px; padding: 0; list-style: none; }
  .stats li { border: 1px solid #D1D5DB; border-radius: 999px; padding: 3px 10px; color: #3A4458; }
  .stats b { color: #0B1220; }
  .callout { background: #F3F5F9; border-radius: 8px; padding: 10px 12px; margin: 8px 0 10px; }
  .callout p { margin: 0 0 4px; }
  ol.passes, ol.meta { padding-left: 18px; margin: 4px 0 10px; }
  ol li { margin-bottom: 5px; }
  .note { color: #3A4458; font-size: 9.5pt; border-left: 3px solid #0071E3; padding-left: 10px; }
  table { border-collapse: collapse; width: 100%; }
  .facts td, .facts th, .weights td, .weights th { border-bottom: 1px solid #E5E7EB; padding: 5px 6px; text-align: left; vertical-align: top; }
  .facts th, .weights th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; color: #5A6478; }
  .weights td.n { white-space: nowrap; color: #5A6478; }
  .fine { font-size: 8.5pt; color: #5A6478; margin-top: 10px; }
  .domain { break-before: page; border-top: 3px solid #0071E3; padding-top: 10px; margin-bottom: 12px; }
  .domain .tag { font: 600 8.5pt "SF Mono", Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; color: #0066CC; }
  .domain h2 { margin: 2px 0 4px; }
  .domain p { color: #3A4458; }
  .lesson { margin: 0 0 14px; padding: 12px 0 0; border-top: 1px solid #D1D5DB; }
  .lesson h3, .lesson .label, .lesson .tests { break-after: avoid; }
  .traps tr, ul.rules li { break-inside: avoid; }
  .lesson .num { color: #0066CC; margin-right: 4px; }
  .tests { color: #3A4458; }
  .what { border-left: 3px solid #0071E3; padding-left: 10px; }
  .weights td.grp { font: 600 8.5pt "SF Mono", Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; color: #0066CC; padding-top: 10px; }
  .label { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #5A6478; margin: 8px 0 3px; }
  .label span { text-transform: none; letter-spacing: 0; font-weight: 400; }
  ul.rules { margin: 0 0 4px; padding-left: 16px; }
  ul.rules li { margin-bottom: 3px; }
  .traps td { padding: 4px 4px; vertical-align: top; border-top: 1px solid #F0F2F5; }
  .traps .w { width: 47%; color: #A1261A; }
  .traps .a { width: 4%; color: #9AA3B2; text-align: center; }
  .traps .r { width: 49%; color: #0F6B3A; font-weight: 600; }
  .trap { break-inside: avoid; border: 1px solid #E5E7EB; border-radius: 8px; margin: 0 0 6px; overflow: hidden; }
  .trap p { margin: 0; padding: 6px 10px; }
  .trap span { display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 1px; }
  .trap .tw { background: #FBF3F2; } .trap .tw span { color: #A1261A; }
  .trap .tr { font-weight: 600; padding-bottom: 2px; } .trap .tr span { color: #0F6B3A; }
  .trap .ty { color: #3A4458; font-size: 9.5pt; padding-top: 2px; }
  .part { break-before: page; padding-top: 70mm; }
  .part h1 { font-size: 30pt; }
  .part p { font-size: 13pt; color: #3A4458; }
  .part .tag, .domain .tag { font: 600 8.5pt "SF Mono", Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; color: #0066CC; }
  .part + .domain { break-before: page; }
  .end { break-inside: avoid; margin-top: 18px; padding: 14px; background: #F3F5F9; border-radius: 10px; }
  a { color: #0066CC; }
</style></head><body>
  <p class="kicker">${esc(g.kicker)}</p>
  <h1>${esc(g.title)}</h1>
  <p class="byline">${esc(site.author)} · ${added} · ${esc(g.edition)} · Free · <a href="${guideUrl}">${esc(guideUrl.replace(/^https?:\/\//, ""))}</a></p>
  <p class="pitch">${rich(g.pitch)}</p>
  <ul class="stats">${g.stats.map((s) => `<li><b>${esc(s.n)}</b> ${esc(s.label)}</li>`).join("")}</ul>

  <h2>How to use these tips</h2>
  <p>${rich(i.lead)}</p>
  <div class="callout">${i.parts.map((p) => `<p><b>${esc(p[0])}</b> ${rich(p[1])}</p>`).join("")}</div>
  <p><b>Work through each lesson in three passes:</b></p>
  <ol class="passes">${i.passes.map((p) => `<li><b>${esc(p[0])}</b> ${rich(p[1])}</li>`).join("")}</ol>
  <p class="note">${rich(i.versionNote)}</p>

  <h2>Exam facts</h2>
  ${i.factsLead ? `<p>${rich(i.factsLead)}</p>` : ""}
  <table class="facts"><tr><th>Item</th><th>Detail</th></tr>
    ${i.facts.map((f) => `<tr><td><b>${esc(f.label[0].toUpperCase() + f.label.slice(1))}</b></td><td>${esc(f.n)}${f.sub ? ", " + esc(f.sub) : ""}</td></tr>`).join("")}
  </table>

  ${i.metaRules ? `<h2>${esc(i.metaTitle)}</h2><p>${rich(i.metaLead)}</p>
  <ol class="meta">${i.metaRules.map((m) => `<li><b>${esc(m[0])}</b> ${rich(m[1])}</li>`).join("")}</ol>`
  : `<h2>Rules that come up again and again</h2><ul class="rules">${(i.recurring || []).map((r) => `<li>${rich(r)}</li>`).join("")}</ul>`}

  <h2>What's inside</h2>
  <table class="weights"><tr><th>${esc(word)}</th><th>Weight</th><th>Lessons</th></tr>
    ${g.domains.map((d, k) => `${d.group && (k === 0 || g.domains[k - 1].group !== d.group) ? `<tr><td colspan="3" class="grp">${esc(d.group)}</td></tr>` : ""}<tr><td>${d.group === "Service guide" ? d.n + ". " : esc(tagOf(d)) + " · "}${esc(d.title)}</td><td class="n">${esc(weightOf(d))}</td><td class="n">${d.lessons.length}</td></tr>`).join("")}
  </table>
  <p class="fine">${esc(i.disclaimer)}</p>

  ${g.domains.map((d, k) => `
  ${(g.parts || []).length > 1 && (k === 0 || g.domains[k - 1].part !== d.part) ? (() => { const pi = g.parts.findIndex((p) => p.id === d.part); const p = g.parts[pi]; return p ? `<div class="part"><span class="tag">Part ${pi + 1} of ${g.parts.length}</span><h1>${esc(p.name)}</h1><p>${esc(p.sub)}</p></div>` : ""; })() : ""}
  <div class="domain"><span class="tag">${esc(tagOf(d))}${lineOf(d) ? " · " + esc(lineOf(d)) : ""}</span>
    <h2>${esc(d.title)}</h2><p>${rich(d.sub)}</p></div>
  ${d.lessons.map(lesson).join("")}`).join("")}

  <div class="end"><h3>Thank you for studying with this guide.</h3>
    ${g.endNote ? `<p>${rich(g.endNote)}</p>` : ""}<p>${rich(g.pairWith || "")}</p>
    <p>Read it online, section by section: <a href="${guideUrl}">${esc(guideUrl)}</a></p></div>
</body></html>`;

function findChrome() {
  const c = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  const hit = c.find((p) => fs.existsSync(p));
  if (!hit) { console.error("Chrome not found. Set CHROME=/path/to/chrome."); process.exit(1); }
  return hit;
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guide-pdf-"));
  const htmlPath = path.join(tmp, "guide.html");
  fs.writeFileSync(htmlPath, html);
  const chrome = spawn(findChrome(), ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${path.join(tmp, "profile")}`, "--remote-debugging-port=0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
    chrome.on("exit", (code) => reject(new Error("Chrome exited early: " + code)));
    setTimeout(() => reject(new Error("Timed out starting Chrome")), 20000);
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const waiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method) waiters.filter((w) => w.method === msg.method).forEach((w) => w.res(msg.params));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const m = { id: ++id, method, params }; if (sessionId) m.sessionId = sessionId;
    pending.set(m.id, { res, rej }); ws.send(JSON.stringify(m));
  });
  const once = (method) => new Promise((res) => waiters.push({ method, res }));
  try {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    await send("Page.enable", {}, sessionId);
    const loaded = once("Page.loadEventFired");
    await send("Page.navigate", { url: "file://" + htmlPath }, sessionId);
    await loaded;
    const foot = `<div style="font:8px -apple-system,Helvetica,Arial,sans-serif;color:#5A6478;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(g.title)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
    const { data } = await send("Page.printToPDF", {
      printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: "<span></span>", footerTemplate: foot,
    }, sessionId);
    const out = path.join(ROOT, "src/files", g.pdf);
    const bytes = Buffer.from(data, "base64");
    fs.writeFileSync(out, bytes);
    const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    g.pdfPages = pages;
    fs.writeFileSync(GUIDES, JSON.stringify(guides, null, 2) + "\n");
    console.log(`Wrote ${path.relative(ROOT, out)} (${pages} pages, ${(bytes.length / 1024).toFixed(0)} KB); pdfPages updated.`);
  } finally {
    ws.close();
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
