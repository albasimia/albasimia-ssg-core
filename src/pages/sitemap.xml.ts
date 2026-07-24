import type { APIRoute } from "astro";
import { siteConfig } from "@/config/site";
import { createSitemapXml } from "@/features/sitemap";

const sitemapPaths = ["/", "/about/"] as const;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site ?? siteConfig.siteUrl;
  const urls = sitemapPaths.map((pathname) => new URL(pathname, siteUrl));

  return new Response(createSitemapXml(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
