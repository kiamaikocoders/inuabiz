import { PUBLIC_PATHS, SITE_URL } from "@/lib/seo";

const PAGE_META: Record<
  (typeof PUBLIC_PATHS)[number],
  { changefreq: "weekly" | "monthly" | "yearly"; priority: string }
> = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/features": { changefreq: "weekly", priority: "0.9" },
  "/pricing": { changefreq: "weekly", priority: "0.9" },
  "/how-it-works": { changefreq: "monthly", priority: "0.8" },
  "/contact": { changefreq: "monthly", priority: "0.7" },
  "/signup": { changefreq: "monthly", priority: "0.8" },
  "/privacy": { changefreq: "yearly", priority: "0.3" },
  "/terms": { changefreq: "yearly", priority: "0.3" },
};

function pageUrl(path: (typeof PUBLIC_PATHS)[number]) {
  const normalized = path === "/" ? "" : path;
  return `${SITE_URL}${normalized}`;
}

/** XML sitemap for public marketing routes (served at /sitemap.xml). */
export function buildSitemapXml(lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = PUBLIC_PATHS.map((path) => {
    const meta = PAGE_META[path];
    return `  <url>
    <loc>${pageUrl(path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
