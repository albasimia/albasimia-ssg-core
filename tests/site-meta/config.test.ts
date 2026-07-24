import { describe, expect, it } from "vitest";
import { defineSiteConfig, SiteMetaError } from "../../src/features/site-meta";

describe("defineSiteConfig", () => {
  it("normalizes defaults and resolves asset URLs without mutating the input", () => {
    const favicons = [{ rel: "icon" as const, href: "/icon.svg" }];
    const config = defineSiteConfig({
      name: "Example",
      siteUrl: "https://example.com/base",
      description: "Description",
      locale: "en",
      favicons,
    });

    expect(config.siteUrl.href).toBe("https://example.com/base/");
    expect(config.title).toEqual({ default: "Example", separator: " | ", position: "suffix" });
    expect(config.defaultRobots).toEqual(["index", "follow", "max-image-preview:large"]);
    expect(config.favicons[0]?.href.href).toBe("https://example.com/icon.svg");
    expect(favicons[0]?.href).toBe("/icon.svg");
  });

  it("rejects invalid site values with a stable error", () => {
    expect(() => defineSiteConfig({
      name: "Example",
      siteUrl: "file:///tmp/site",
      description: "Description",
      locale: "en",
    })).toThrow(expect.objectContaining<Partial<SiteMetaError>>({ code: "SITE_URL_INVALID", path: "siteUrl" }));
  });

  it("does not expose verification tokens in validation errors", () => {
    const token = "secret\nvalue";
    try {
      defineSiteConfig({
        name: "Example",
        siteUrl: "https://example.com",
        description: "Description",
        locale: "en",
        verification: [{ name: "verify", content: token }],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SiteMetaError);
      expect(String(error)).not.toContain(token);
    }
  });

  it.each([
    { favicons: [{ rel: "shortcut" as never, href: "/icon.ico" }] },
    { themeColors: [{ color: "#fff" }, { color: "#fff" }] },
    { verification: [{ name: "verify", content: "one" }, { name: "verify", content: "two" }] },
    { openGraph: { imageAlt: "" } },
    { twitter: { site: "" } },
  ])("rejects invalid optional metadata: %o", (optional) => {
    expect(() => defineSiteConfig({
      name: "Example",
      siteUrl: "https://example.com",
      description: "Description",
      locale: "en",
      ...optional,
    })).toThrow(expect.objectContaining<Partial<SiteMetaError>>({ code: "SITE_CONFIG_INVALID" }));
  });
});
