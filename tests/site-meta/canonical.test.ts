import { describe, expect, it } from "vitest";
import { createCanonicalUrl, SiteMetaError } from "../../src/features/site-meta";

describe("createCanonicalUrl", () => {
  it("preserves pathname, query, and trailing slash", () => {
    expect(createCanonicalUrl("/about/?page=2", new URL("https://example.com/base/")))
      .toEqual(new URL("https://example.com/about/?page=2"));
  });

  it.each(["https://other.example/path", "//other.example/path", "about/", "/about/#part"])(
    "rejects invalid site paths: %s",
    (pathname) => {
      expect(() => createCanonicalUrl(pathname, new URL("https://example.com")))
        .toThrow(expect.objectContaining<Partial<SiteMetaError>>({ code: "CANONICAL_URL_INVALID" }));
    },
  );
});
