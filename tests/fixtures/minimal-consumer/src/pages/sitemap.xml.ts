import type { APIRoute } from "astro";
import { createSitemapXml } from "albasimia-ssg-core/sitemap";

export const GET: APIRoute = () => new Response(
  createSitemapXml(["https://consumer.example/"]),
  { headers: { "Content-Type": "application/xml; charset=utf-8" } },
);
