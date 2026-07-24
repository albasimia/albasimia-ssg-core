import { describe, expect, expectTypeOf, it } from "vitest";
import * as sitemap from "../../src/features/sitemap";
import type {
  SitemapErrorCode,
  SitemapErrorOptions,
  SitemapUrlInput,
} from "../../src/features/sitemap";

describe("sitemap public API", () => {
  it("exports only the intended runtime API", () => {
    expect(Object.keys(sitemap).sort()).toEqual([
      "SitemapError",
      "createSitemapXml",
    ]);
  });

  it("exposes domain-independent input and error contracts", () => {
    expectTypeOf<SitemapUrlInput>().toEqualTypeOf<string | URL>();
    expectTypeOf<SitemapErrorCode>().toEqualTypeOf<"SITEMAP_URL_INVALID">();
    expectTypeOf<SitemapErrorOptions>().toHaveProperty("path");
  });
});
