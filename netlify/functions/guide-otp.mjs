// Email-code (OTP) sign-up for the exam-prep guides, after charliehills.ai:
// the reader proves the email is theirs with a 6-digit code, then the site
// subscribes it to BrainByte on Substack and unlocks every guide and PDF.
//
//   POST /api/guide-otp {action: "send", email}        -> emails a code
//   POST /api/guide-otp {action: "verify", email, code} -> checks it, subscribes,
//                                                         sets the unlock cookie
//
// Returning readers: every verified email is kept (as a SHA-256 hash, never the
// address) in the "guide-subscribers" Netlify Blobs store. A known email gets
// "Welcome back", still has to enter a code (anyone could type someone else's
// address), and is not sent to Substack again.
//
// Codes live in the "guide-otp" store: hashed, 10 minutes, 5 tries, a new code
// at most every 45 seconds and 5 an hour per address.
//
// The unlock cookie (bb_unlocked=v1.{expiry}.{HMAC}) is HttpOnly and signed
// with OTP_SECRET; netlify/edge-functions/domain-router.js checks the same
// signature before serving a guide PDF. A readable bb_verified=1 cookie tells
// src/assets/guides.js to open the lessons.
//
// Env vars (Netlify UI -> Site configuration -> Environment variables):
//   RESEND_API_KEY  Resend API key (resend.com), sends the codes
//   RESEND_FROM     sender, e.g. "BrainByte <codes@harisankarsivankutty.in>"
//                   (the domain must be verified in Resend)
//   OTP_SECRET      a long random string; signs the cookie and code hashes
// Under `netlify dev` without RESEND_API_KEY the code is returned in the
// response (devCode) and logged, so the flow can be tested without email, and
// nothing is sent to Substack unless GUIDE_OTP_SUBSTACK=1.

import { getStore } from "@netlify/blobs";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const site = require("../../src/_data/site.json");

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_TRIES = 5;
const RESEND_GAP_MS = 45 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const COOKIE_DAYS = 365;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isDev = () => process.env.NETLIFY_DEV === "true";
const secret = () => process.env.OTP_SECRET || (isDev() ? "dev-only-otp-secret" : "");
const json = (status, data, headers = {}) => Response.json(data, { status, headers });
const emailKey = (email) => createHash("sha256").update(email).digest("hex");
const codeHash = (key, code) => createHmac("sha256", secret()).update(`otp|${key}|${code}`).digest("hex");

// Same scheme as hasValidUnlock() in domain-router.js; keep them in step.
export function unlockCookieValue(sec, exp) {
  return `v1.${exp}.${createHmac("sha256", sec).update(`bb_unlocked|v1|${exp}`).digest("hex")}`;
}

function cleanEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : "";
}

async function sendCodeEmail(email, code) {
  const name = site.newsletter.name;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || `${name} <codes@harisankarsivankutty.in>`,
      to: [email],
      subject: `${code} is your ${name} code`,
      text: `Your ${name} code is ${code}\n\nEnter it on the guide page to open every free exam guide. It works for 10 minutes.\n\nDidn't ask for this? Ignore this email and nothing happens.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#0B1220">
<p style="font-size:15px;margin:0 0 8px">Your ${name} code</p>
<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${code}</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 16px">Enter it on the guide page to open every free exam guide. It works for 10 minutes.</p>
<p style="font-size:13px;color:#5A6478;margin:0">Didn't ask for this? Ignore this email and nothing happens.</p></div>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// Subscribes the address to the BrainByte Substack from the server. Substack
// has no official API, so this uses the endpoint its own embed form posts to.
// Substack's bot protection usually refuses this from Netlify's servers (403);
// then guides.js sends the same form from the reader's browser in a hidden
// frame, which Substack accepts.
async function subscribeOnSubstack(email, pageUrl) {
  // Under netlify dev, test addresses stay off the real list unless asked for.
  if (isDev() && process.env.GUIDE_OTP_SUBSTACK !== "1") return "skipped";
  const user = site.newsletter.username;
  if (!user) return "failed";
  try {
    const res = await fetch(`https://${user}.substack.com/api/v1/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; BrainByteSignup/1.0)" },
      body: JSON.stringify({ email, first_url: pageUrl, current_url: pageUrl, source: "embed" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`Substack subscribe returned ${res.status}`);
    return res.ok ? "subscribed" : "failed";
  } catch (e) {
    console.warn(`Substack subscribe failed: ${e.message}`);
    return "failed";
  }
}

async function handleSend(email) {
  const key = emailKey(email);
  const codes = getStore("guide-otp");
  const now = Date.now();
  const prev = (await codes.get(key, { type: "json" })) || {};
  const sends = (prev.sends || []).filter((t) => now - t < 3600 * 1000);
  if (prev.sentAt && now - prev.sentAt < RESEND_GAP_MS) {
    return json(429, { error: "We just sent you a code. Check your inbox (and spam), or send a new one in a minute.", codeSent: Date.now() < (prev.exp || 0) });
  }
  if (sends.length >= MAX_SENDS_PER_HOUR) {
    return json(429, { error: "Too many codes for this email. Try again in an hour." });
  }

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  await codes.setJSON(key, { hash: codeHash(key, code), exp: now + CODE_TTL_MS, tries: 0, sentAt: now, sends: [...sends, now] });
  const returning = (await getStore("guide-subscribers").get(key)) !== null;

  if (!process.env.RESEND_API_KEY) {
    if (isDev()) {
      console.log(`[guide-otp] dev code for this email: ${code}`);
      return json(200, { ok: true, returning, devCode: code });
    }
    console.error("[guide-otp] RESEND_API_KEY is not set");
    return json(500, { error: "Email codes aren't set up yet." });
  }
  try {
    await sendCodeEmail(email, code);
  } catch (e) {
    console.error(`[guide-otp] ${e.message}`);
    return json(502, { error: "Couldn't send the code. Check the address and try again." });
  }
  return json(200, { ok: true, returning });
}

async function handleVerify(email, rawCode, pageUrl, secure) {
  const code = String(rawCode || "").replace(/\D/g, "");
  if (code.length !== 6) return json(400, { error: "Enter the 6-digit code from the email." });
  const key = emailKey(email);
  const codes = getStore("guide-otp");
  const rec = await codes.get(key, { type: "json" });
  if (!rec || !rec.hash || Date.now() > rec.exp) {
    return json(400, { error: "That code has expired. Send a new one.", expired: true });
  }
  const ok = timingSafeEqual(Buffer.from(rec.hash), Buffer.from(codeHash(key, code)));
  if (!ok) {
    const tries = (rec.tries || 0) + 1;
    if (tries >= MAX_TRIES) {
      await codes.setJSON(key, { sentAt: rec.sentAt, sends: rec.sends });
      return json(400, { error: "Too many wrong tries. Send a new code.", expired: true });
    }
    await codes.setJSON(key, { ...rec, tries });
    return json(400, { error: `That code isn't right. ${MAX_TRIES - tries} tries left.` });
  }
  await codes.setJSON(key, { sentAt: rec.sentAt, sends: rec.sends });

  const subs = getStore("guide-subscribers");
  const known = await subs.get(key, { type: "json" });
  let substack = "already";
  if (!known || known.substack === "failed") {
    substack = await subscribeOnSubstack(email, pageUrl);
    await subs.setJSON(key, { verifiedAt: known?.verifiedAt || new Date().toISOString(), substack });
  }

  const exp = Math.floor(Date.now() / 1000) + COOKIE_DAYS * 86400;
  const attrs = `Path=/; Max-Age=${COOKIE_DAYS * 86400}; SameSite=Lax${secure ? "; Secure" : ""}`;
  const headers = new Headers();
  headers.append("Set-Cookie", `bb_unlocked=${unlockCookieValue(secret(), exp)}; ${attrs}; HttpOnly`);
  headers.append("Set-Cookie", `bb_verified=1; ${attrs}`); // readable: tells guides.js to open the page
  return json(200, { ok: true, returning: Boolean(known), substack }, headers);
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!secret()) {
    console.error("[guide-otp] OTP_SECRET is not set");
    return json(500, { error: "Email codes aren't set up yet." });
  }
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Bad request" }); }
  if (body.website) return json(200, { ok: true }); // honeypot: bots fill every field
  const email = cleanEmail(body.email);
  if (!email) return json(400, { error: "Enter a valid email address." });

  const url = new URL(req.url);
  const pageUrl = typeof body.page === "string" && body.page.startsWith(url.origin) ? body.page : `${url.origin}/guides/`;
  if (body.action === "send") return handleSend(email);
  if (body.action === "verify") return handleVerify(email, body.code, pageUrl, url.protocol === "https:");
  return json(400, { error: "Unknown action" });
};

export const config = { path: "/api/guide-otp" };
