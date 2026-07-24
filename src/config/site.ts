import { defineSiteConfig } from "@/features/site-meta";

export const siteConfig = defineSiteConfig({
  name: import.meta.env.PUBLIC_SITE_NAME ?? "ASC Example Site",
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? "https://example.com/",
  description: "A minimal site built with albasimia-ssg-core.",
  locale: "ja",
  favicons: [
    { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  ],
});

export type { SiteConfig } from "@/features/site-meta";
