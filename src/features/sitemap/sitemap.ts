import { SitemapError } from "./errors";
import type { SitemapUrlInput } from "./types";

const XML_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";

export function createSitemapXml(urls: readonly SitemapUrlInput[]): string {
  const uniqueUrls = resolveUniqueUrls(urls);
  const entries = uniqueUrls.map((url) => `  <url><loc>${escapeXml(url.href)}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${XML_NAMESPACE}">`,
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

function resolveUniqueUrls(inputs: readonly SitemapUrlInput[]): URL[] {
  const seen = new Set<string>();
  const result: URL[] = [];

  inputs.forEach((input, index) => {
    const url = resolveUrl(input, index);
    if (seen.has(url.href)) return;
    seen.add(url.href);
    result.push(url);
  });

  return result;
}

function resolveUrl(input: SitemapUrlInput, index: number): URL {
  const path = `urls.${index}`;
  if (typeof input !== "string" && !(input instanceof URL)) {
    throw invalidUrl(path);
  }
  if (typeof input === "string" && input.trim() !== input) {
    throw invalidUrl(path);
  }

  let url: URL;
  try {
    url = new URL(input instanceof URL ? input.href : input);
  } catch (cause) {
    throw invalidUrl(path, cause);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw invalidUrl(path);
  }
  return url;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function invalidUrl(path: string, cause?: unknown): SitemapError {
  return new SitemapError(`${path} must be an absolute HTTP or HTTPS URL`, {
    code: "SITEMAP_URL_INVALID",
    path,
    cause,
  });
}
