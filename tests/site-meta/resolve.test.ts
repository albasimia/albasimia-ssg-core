import { describe, expect, it } from "vitest";
import { defineSiteConfig } from "../../src/features/site-meta";
import { resolvePageMeta } from "../../src/features/site-meta/resolve";

const site = defineSiteConfig({
  name: "Example",
  siteUrl: "https://example.com/",
  description: "Site description",
  locale: "en",
  openGraph: { image: "/default.png", imageAlt: "Default image", locale: "en_US" },
  twitter: { site: "@example" },
  favicons: [{ rel: "icon", href: "/icon.svg" }],
  themeColors: [{ color: "#fff" }],
  verification: [{ name: "verify", content: "token" }],
});

describe("resolvePageMeta", () => {
  it("resolves required values and social metadata", () => {
    const result = resolvePageMeta(site, { title: "About" }, { pathname: "/about/" });

    expect(result.title).toBe("About | Example");
    expect(result.canonicalUrl.href).toBe("https://example.com/about/");
    expect(result.openGraph).toMatchObject({
      title: "About | Example",
      description: "Site description",
      image: new URL("https://example.com/default.png"),
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "About | Example",
      site: "@example",
    });
  });

  it("applies page overrides and allows empty replacement arrays", () => {
    const result = resolvePageMeta(site, {
      description: "Page description",
      robots: ["noindex", "nofollow"],
      favicons: [],
      themeColors: [],
      openGraph: { title: "OG title", image: "/page.png" },
      twitter: { title: "X title" },
      jsonLd: [{ "@type": "WebPage" }, { "@type": "Thing" }],
    }, { pathname: "/page/" });

    expect(result.robots).toBe("noindex, nofollow");
    expect(result.favicons).toEqual([]);
    expect(result.themeColors).toEqual([]);
    expect(result.openGraph).toMatchObject({ title: "OG title", image: new URL("https://example.com/page.png") });
    expect(result.twitter).toMatchObject({ title: "X title", image: new URL("https://example.com/page.png") });
    expect(result.serializedJsonLd).toHaveLength(2);
  });

  it("supports independent OGP and Twitter disabling", () => {
    expect(resolvePageMeta(site, { openGraph: false }, { pathname: "/" }).openGraph).toBe(false);
    expect(resolvePageMeta(site, { twitter: false }, { pathname: "/" }).twitter).toBe(false);
  });
});
