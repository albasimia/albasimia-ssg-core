export type SitemapUrlInput = string | URL;

export type SitemapErrorCode = "SITEMAP_URL_INVALID";

export interface SitemapErrorOptions {
  code: SitemapErrorCode;
  path: string;
  cause?: unknown;
}
