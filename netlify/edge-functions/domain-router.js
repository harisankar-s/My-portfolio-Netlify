// Everything lives on one domain, harisankarsivankutty.in: hub at /, CV at
// /about/, blog at /blog/ (posts at /blog/{slug}/), exam prep at /guides/, and
// so on, all straight from the Eleventy build. This edge function only:
//   - 301s the retired blog.harisankarsivankutty.in to the same path on the
//     apex (its old listing at / goes to /blog/), so old links and search
//     results keep working. Keep that domain attached in Netlify (or its DNS).
//   - 301s the retired brainbyte.harisankarsivankutty.in and any old
//     /brainbyte/* path: /guides/* and /files/* keep their path, everything
//     else goes to /guides/.
//   - gates the guide PDFs (below).
//
// Netlify Edge Functions run on a separate Deno pipeline from the Eleventy
// build, so they can't import src/_data/site.json; keep APEX_ORIGIN in sync
// with site.json's "url" by hand.
const APEX_ORIGIN = "https://harisankarsivankutty.in";
const OLD_BLOG_HOST = "blog.harisankarsivankutty.in";
const OLD_BRAINBYTE_HOST = "brainbyte.harisankarsivankutty.in";
const OLD_BRAINBYTE_PREFIX = "/brainbyte";

const isOldBrainbytePath = (path) =>
  path === OLD_BRAINBYTE_PREFIX || path.startsWith(OLD_BRAINBYTE_PREFIX + "/");

// Where an old BrainByte path lives now.
const brainbyteToApex = (path, search) => {
  if (/^\/guides(\/|$)/.test(path) || /^\/files\//.test(path)) {
    return `${APEX_ORIGIN}${path}${search}`;
  }
  return `${APEX_ORIGIN}/guides/`;
};

// Guide PDFs need the free newsletter sign-up. After a reader confirms their
// email with a code, netlify/functions/guide-otp.mjs sets an HttpOnly cookie
// bb_unlocked=v1.{expiry}.{HMAC-SHA256(OTP_SECRET, "bb_unlocked|v1|{expiry}")}.
// Without a valid one, a PDF link goes to that guide's sign-up box instead
// ({slug}-study-guide-edition-N.pdf belongs to /guides/{slug}/). Free
// resources stay open. Until OTP_SECRET is set, PDFs are served as before.
const GUIDE_PDF = /^\/files\/(.+?)-study-guide-edition-\d+\.pdf$/;
const enc = new TextEncoder();
async function hasValidUnlock(request, secret) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)bb_unlocked=v1\.(\d+)\.([0-9a-f]{64})(?:;|$)/);
  if (!m || Number(m[1]) * 1000 < Date.now()) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`bb_unlocked|v1|${m[1]}`)));
  const hex = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= hex.charCodeAt(i) ^ m[2].charCodeAt(i);
  return diff === 0;
}
const otpSecret = () =>
  (typeof Netlify !== "undefined" && Netlify.env.get("OTP_SECRET")) ||
  (typeof Netlify !== "undefined" && Netlify.env.get("NETLIFY_DEV") === "true" ? "dev-only-otp-secret" : "");

export default async (request, context) => {
  const url = new URL(request.url);
  const host = url.hostname;

  // Retired blog subdomain: same path on the apex; its listing moved to /blog/.
  if (host === OLD_BLOG_HOST) {
    const path = url.pathname === "/" ? "/blog/" : url.pathname;
    return Response.redirect(`${APEX_ORIGIN}${path}${url.search}`, 301);
  }

  // Retired BrainByte subdomain and old /brainbyte/* build paths.
  if (host === OLD_BRAINBYTE_HOST || isOldBrainbytePath(url.pathname)) {
    const path = isOldBrainbytePath(url.pathname)
      ? url.pathname.slice(OLD_BRAINBYTE_PREFIX.length) || "/"
      : url.pathname;
    return Response.redirect(brainbyteToApex(path, url.search), 301);
  }

  // Guide PDFs: only after the email-code sign-up.
  const pdf = url.pathname.match(GUIDE_PDF);
  const secret = pdf ? otpSecret() : "";
  if (pdf && secret && !(await hasValidUnlock(request, secret))) {
    return new Response(null, {
      status: 302,
      headers: { location: `/guides/${pdf[1]}/#unlock`, "cache-control": "no-store" },
    });
  }

  return context.next();
};
