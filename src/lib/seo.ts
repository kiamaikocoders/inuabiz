/** Canonical origin — Vercel redirects apex → www; use www in canonicals/sitemap. */
export const SITE_URL = "https://www.inuabiz.co.ke";
/** Public marketing apex (redirects to SITE_URL). */
export const SITE_APEX = "https://inuabiz.co.ke";
export const SITE_NAME = "InuaBiz";
export const SITE_EMAIL = "hello@inuabiz.co.ke";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export const PUBLIC_PATHS = [
  "/",
  "/features",
  "/pricing",
  "/how-it-works",
  "/contact",
  "/signup",
  "/privacy",
  "/terms",
] as const;

type SeoInput = {
  title: string;
  description: string;
  path: string;
  /** defaults to index,follow */
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/** Shared meta + canonical + Open Graph + Twitter for marketing pages. */
export function pageHead({
  title,
  description,
  path,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  ogTitle,
  ogDescription,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  jsonLd,
}: SeoInput) {
  const url = absoluteUrl(path);
  const socialTitle = ogTitle ?? title;
  const socialDescription = ogDescription ?? description;

  const ldBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { name: "googlebot", content: robots },
    { name: "application-name", content: SITE_NAME },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_KE" },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:title", content: socialTitle },
    { property: "og:description", content: socialDescription },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${SITE_NAME} — micro-POS for Kenyan vendors` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: socialTitle },
    { name: "twitter:description", content: socialDescription },
    { name: "twitter:image", content: image },
    // TanStack Router special: emits <script type="application/ld+json">
    ...ldBlocks.map((block) => ({ "script:ld+json": block })),
  ];

  const links = [
    { rel: "canonical", href: url },
    { rel: "alternate", hrefLang: "en-KE", href: url },
    { rel: "alternate", hrefLang: "x-default", href: url },
  ];

  return { meta, links };
}

/** Auth, till, and admin surfaces — keep out of Google. */
export function privateHead(title: string, description?: string) {
  return {
    meta: [
      { title },
      ...(description ? [{ name: "description", content: description }] : []),
      { name: "robots", content: "noindex,nofollow" },
      { name: "googlebot", content: "noindex,nofollow" },
    ],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["Inua Biz", "InuaBiz Kenya", "InuaBiz POS"],
    url: SITE_URL,
    logo: `${SITE_URL}/emails/inuabiz-logo.png`,
    email: SITE_EMAIL,
    description:
      "InuaBiz is a mobile-first micro-POS for Kenyan dukas, boutiques, chemists and eateries — M-Pesa till, credit ledger, stock and AI restock advice.",
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE_EMAIL,
      availableLanguage: ["en", "sw"],
      areaServed: "KE",
    },
    sameAs: [SITE_URL],
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: ["Inua Biz", "InuaBiz POS"],
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Point of Sale",
    operatingSystem: "Web, Android",
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    description:
      "Kenya micro-POS with M-Pesa STK, Till and Paybill reconciliation, digital credit (kukopesha), inventory alerts and AI restock notes for MSMEs.",
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      price: "3000",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
      description: "Standard plan per shop / month after free trial",
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    featureList: [
      "Mobile POS for Kenyan dukas",
      "M-Pesa STK, Till and Paybill reconciliation",
      "Customer credit ledger (kukopesha)",
      "Inventory and low-stock alerts",
      "AI restock advice",
      "Multi-shop support",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["Inua Biz", "inuabiz"],
    url: SITE_URL,
    inLanguage: "en-KE",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
