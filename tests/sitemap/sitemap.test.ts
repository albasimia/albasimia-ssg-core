import { describe, expect, it } from "vitest";
import { createSitemapXml, SitemapError } from "../../src/features/sitemap";

describe("createSitemapXml", () => {
  it("creates deterministic XML from absolute URLs", () => {
    expect(createSitemapXml([
      "https://example.com/",
      new URL("https://example.com/about/"),
    ])).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about/</loc></url>
</urlset>
`);
  });

  it("escapes XML-sensitive URL characters", () => {
    const xml = createSitemapXml([
      "https://example.com/search/?first=1&second=2",
      "https://example.com/author's-page/",
    ]);

    expect(xml).toContain("first=1&amp;second=2");
    expect(xml).toContain("author&apos;s-page/");
    expect(xml).not.toContain("first=1&second=2");
  });

  it("preserves trailing slashes and input order", () => {
    const xml = createSitemapXml([
      "https://example.com/docs",
      "https://example.com/docs/",
    ]);

    expect(xml.indexOf("https://example.com/docs</loc>")).toBeLessThan(
      xml.indexOf("https://example.com/docs/</loc>"),
    );
  });

  it("keeps the first occurrence of each normalized duplicate URL", () => {
    const xml = createSitemapXml([
      "https://EXAMPLE.com",
      new URL("https://example.com/"),
      "https://example.com/about/",
      "https://example.com/about/",
    ]);

    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.match(/https:\/\/example\.com\//g)).toHaveLength(2);
  });

  it("supports an empty URL collection", () => {
    expect(createSitemapXml([])).toContain("<urlset");
    expect(createSitemapXml([])).not.toContain("<url>");
  });

  it.each([
    "about/",
    "/about/",
    "ftp://example.com/file",
    "file:///tmp/page.html",
    " https://example.com/",
  ])("rejects non-absolute or non-HTTP URLs: %s", (url) => {
    expect(() => createSitemapXml([url])).toThrow(
      expect.objectContaining<Partial<SitemapError>>({
        code: "SITEMAP_URL_INVALID",
        path: "urls.0",
      }),
    );
  });
});
