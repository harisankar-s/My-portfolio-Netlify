// Routes requests by hostname so one Eleventy build serves two domains:
//   harisankarsivankutty.in       -> hub at / (built at /home/), CV at /about/,
//                                    exam prep at /guides/, guide PDFs at /files/,
//                                    newsletter archive at /newsletter/,
//                                    audience pages at /for/{slug}/,
//                                    free resources at /resources/*
//   blog.harisankarsivankutty.in  -> blog (built at /)
//
// The apex domain serves the hub, the CV and the exam prep pages. Anything
// else (blog posts, tags, feed, /ask/, /now/, ...) 301s to the blog
// subdomain so that content is never indexable at two hosts. The blog
// subdomain folds /about/, /home/, /guides/ and /files/ back to the apex for
// the same reason.
//
// BrainByte used to be its own subdomain (brainbyte.harisankarsivankutty.in,
// built at /brainbyte/). It now lives on the apex, like charliehills.ai keeps
// everything on one domain, so every old BrainByte URL 301s to its new home:
// /guides/* and /files/* keep their path, everything else goes to /guides/.

// Netlify Edge Functions run on a separate Deno deploy pipeline from the
// Eleventy build, so these can't import src/_data/site.json directly. Keep
// them in sync with site.json's "url" and "portfolioUrl" hostnames by hand.
const APEX_HOSTS = new Set(["harisankarsivankutty.in", "www.harisankarsivankutty.in"]);
const APEX_ORIGIN = "https://harisankarsivankutty.in";
const BLOG_HOST = "blog.harisankarsivankutty.in";
const OLD_BRAINBYTE_HOST = "brainbyte.harisankarsivankutty.in";
const OLD_BRAINBYTE_PREFIX = "/brainbyte";

// Shared static/API paths every host serves as-is.
const SHARED_PATHS = [
  /^\/images\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/\.netlify\//,
];

// Exam prep pages, their PDFs, the newsletter archive, the audience pages
// and the free resources vault: apex only.
const APEX_ONLY_PATHS = [/^\/guides(\/|$)/, /^\/files\//, /^\/newsletter(\/|$)/, /^\/for\//, /^\/resources(\/|$)/];

// Paths the apex (profile) domain serves directly; everything else redirects
// to the blog subdomain.
const APEX_ALLOWED_PATHS = [/^\/$/, /^\/about\/$/, ...APEX_ONLY_PATHS, ...SHARED_PATHS];

const isOldBrainbytePath = (path) =>
  path === OLD_BRAINBYTE_PREFIX || path.startsWith(OLD_BRAINBYTE_PREFIX + "/");

// Where an old BrainByte path lives now on the apex.
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

  // Runs before the domain split so it also applies under netlify dev.
  if (host !== BLOG_HOST && host !== OLD_BRAINBYTE_HOST) {
    const pdf = url.pathname.match(GUIDE_PDF);
    const secret = pdf ? otpSecret() : "";
    if (pdf && secret && !(await hasValidUnlock(request, secret))) {
      return new Response(null, {
        status: 302,
        headers: { location: `/guides/${pdf[1]}/#unlock`, "cache-control": "no-store" },
      });
    }
  }

  // Old BrainByte subdomain: everything moves to the apex.
  if (host === OLD_BRAINBYTE_HOST) {
    const path = isOldBrainbytePath(url.pathname)
      ? url.pathname.slice(OLD_BRAINBYTE_PREFIX.length) || "/"
      : url.pathname;
    return Response.redirect(brainbyteToApex(path, url.search), 301);
  }

  // Old /brainbyte/* build paths on the production hosts. Only these hosts,
  // so localhost (netlify dev) still behaves like the build.
  if ((APEX_HOSTS.has(host) || host === BLOG_HOST) && isOldBrainbytePath(url.pathname)) {
    const path = url.pathname.slice(OLD_BRAINBYTE_PREFIX.length) || "/";
    return Response.redirect(brainbyteToApex(path, url.search), 301);
  }

  if (APEX_HOSTS.has(host)) {
    if (url.pathname === "/about") {
      return Response.redirect(`${url.protocol}//${host}/about/`, 301);
    }
    if (url.pathname === "/home" || url.pathname === "/home/") {
      return Response.redirect(`${url.protocol}//${host}/`, 301);
    }
    if (url.pathname === "/guides" || url.pathname === "/newsletter" || url.pathname === "/resources") {
      return Response.redirect(`${url.protocol}//${host}${url.pathname}/`, 301);
    }
    if (url.pathname === "/") {
      return context.rewrite("/home/");
    }
    const allowed = APEX_ALLOWED_PATHS.some((re) => re.test(url.pathname));
    if (!allowed) {
      url.hostname = BLOG_HOST;
      return Response.redirect(url.toString(), 301);
    }
    return context.next();
  }

  if (host === BLOG_HOST) {
    if (url.pathname === "/about" || url.pathname === "/about/") {
      return Response.redirect(`${APEX_ORIGIN}/about/`, 301);
    }
    if (url.pathname === "/home" || url.pathname === "/home/") {
      return Response.redirect(`${APEX_ORIGIN}/`, 301);
    }
    if (APEX_ONLY_PATHS.some((re) => re.test(url.pathname))) {
      return Response.redirect(`${APEX_ORIGIN}${url.pathname}${url.search}`, 301);
    }
  }

  return context.next();
};
