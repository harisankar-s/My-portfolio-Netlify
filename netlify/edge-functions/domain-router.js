// Routes requests by hostname so one Eleventy build serves two domains:
//   harisankarsivankutty.in       -> profile (portfolio, built at /about/)
//   blog.harisankarsivankutty.in  -> blog (built at /)
//
// The apex domain only ever shows the portfolio: its root is internally
// rewritten to the /about/ build output, and anything else (blog posts,
// tags, feed, /ask/, /now/, ...) 301s to the blog subdomain so that content
// is never indexable at two hosts. The blog subdomain folds /about/ back to
// the apex root for the same reason.

// Netlify Edge Functions run on a separate Deno deploy pipeline from the
// Eleventy build, so these can't import src/_data/site.json directly. Keep
// them in sync with site.json's "url" and "portfolioUrl" hostnames by hand.
const APEX_HOSTS = new Set(["harisankarsivankutty.in", "www.harisankarsivankutty.in"]);
const BLOG_HOST = "blog.harisankarsivankutty.in";

// Paths the apex (profile) domain serves directly; everything else redirects
// to the blog subdomain.
const APEX_ALLOWED_PATHS = [
  /^\/$/,
  /^\/images\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/\.netlify\//,
];

export default async (request, context) => {
  const url = new URL(request.url);
  const host = url.hostname;

  if (APEX_HOSTS.has(host)) {
    if (url.pathname === "/about" || url.pathname === "/about/") {
      return Response.redirect(`${url.protocol}//${host}/`, 301);
    }
    if (url.pathname === "/") {
      return context.rewrite("/about/");
    }
    const allowed = APEX_ALLOWED_PATHS.some((re) => re.test(url.pathname));
    if (!allowed) {
      url.hostname = BLOG_HOST;
      return Response.redirect(url.toString(), 301);
    }
    return context.next();
  }

  if (host === BLOG_HOST && (url.pathname === "/about" || url.pathname === "/about/")) {
    return Response.redirect("https://harisankarsivankutty.in/", 301);
  }

  return context.next();
};
