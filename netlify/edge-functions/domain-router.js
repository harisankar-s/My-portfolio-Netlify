// Routes requests by hostname so one Eleventy build serves three domains:
//   harisankarsivankutty.in            -> hub at / (built at /home/), CV at /about/
//   blog.harisankarsivankutty.in       -> blog (built at /)
//   brainbyte.harisankarsivankutty.in  -> BrainByte learning hub (built at /brainbyte/)
//
// The apex domain serves two pages: its root is internally rewritten to the
// hub (/home/ build output) and /about/ serves the CV as built. Anything else
// (blog posts, tags, feed, /ask/, /now/, ...) 301s to the blog subdomain so
// that content is never indexable at two hosts. The blog subdomain folds
// /about/ and /home/ back to the apex for the same reason. BrainByte's public "/x" is internally
// rewritten to "/brainbyte/x"; "/brainbyte/*" on any host 301s to the
// BrainByte host so those pages also live at exactly one URL.

// Netlify Edge Functions run on a separate Deno deploy pipeline from the
// Eleventy build, so these can't import src/_data/site.json directly. Keep
// them in sync with site.json's "url", "portfolioUrl" and "brainbyteUrl"
// hostnames by hand.
const APEX_HOSTS = new Set(["harisankarsivankutty.in", "www.harisankarsivankutty.in"]);
const BLOG_HOST = "blog.harisankarsivankutty.in";
const BRAINBYTE_HOST = "brainbyte.harisankarsivankutty.in";
const BRAINBYTE_PREFIX = "/brainbyte";

// Shared static/API paths every host serves as-is.
const SHARED_PATHS = [
  /^\/images\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/\.netlify\//,
];

// Paths the apex (profile) domain serves directly; everything else redirects
// to the blog subdomain.
const APEX_ALLOWED_PATHS = [/^\/$/, /^\/about\/$/, ...SHARED_PATHS];

const isBrainbytePath = (path) =>
  path === BRAINBYTE_PREFIX || path.startsWith(BRAINBYTE_PREFIX + "/");

const toBrainbyte = (url) => {
  const rest = url.pathname.slice(BRAINBYTE_PREFIX.length) || "/";
  return `https://${BRAINBYTE_HOST}${rest}${url.search}`;
};

export default async (request, context) => {
  const url = new URL(request.url);
  const host = url.hostname;

  if (host === BRAINBYTE_HOST) {
    if (isBrainbytePath(url.pathname)) {
      return Response.redirect(toBrainbyte(url), 301);
    }
    if (SHARED_PATHS.some((re) => re.test(url.pathname))) {
      return context.next();
    }
    // Everything else is BrainByte content. Unknown paths fall through to
    // the site's normal 404 handling after the rewrite.
    return context.rewrite(`${BRAINBYTE_PREFIX}${url.pathname}${url.search}`);
  }

  // Only the production hosts fold /brainbyte/* onto the subdomain, so
  // localhost (netlify dev) can still browse /brainbyte/ directly.
  if ((APEX_HOSTS.has(host) || host === BLOG_HOST) && isBrainbytePath(url.pathname)) {
    return Response.redirect(toBrainbyte(url), 301);
  }

  if (APEX_HOSTS.has(host)) {
    if (url.pathname === "/about") {
      return Response.redirect(`${url.protocol}//${host}/about/`, 301);
    }
    if (url.pathname === "/home" || url.pathname === "/home/") {
      return Response.redirect(`${url.protocol}//${host}/`, 301);
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

  if (host === BLOG_HOST && (url.pathname === "/about" || url.pathname === "/about/")) {
    return Response.redirect("https://harisankarsivankutty.in/about/", 301);
  }
  if (host === BLOG_HOST && (url.pathname === "/home" || url.pathname === "/home/")) {
    return Response.redirect("https://harisankarsivankutty.in/", 301);
  }

  return context.next();
};
