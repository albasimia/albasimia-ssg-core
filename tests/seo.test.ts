import { describe, expect, it } from "vitest";
import { createCanonicalUrl } from "../src/lib/seo";

describe("createCanonicalUrl", () => {
  it("creates an absolute URL from a pathname", () => {
    const result = createCanonicalUrl("/about/", new URL("https://example.com"));
    expect(result.toString()).toBe("https://example.com/about/");
  });
});
