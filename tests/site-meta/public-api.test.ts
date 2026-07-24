import { describe, expect, expectTypeOf, it } from "vitest";
import * as siteMeta from "../../src/features/site-meta";
import type { PageMeta, SiteConfig } from "../../src/features/site-meta";

describe("site-meta public API", () => {
  it("exports only the intended runtime API", () => {
    expect(Object.keys(siteMeta).sort()).toEqual([
      "SiteMetaError",
      "createCanonicalUrl",
      "createPageTitle",
      "defineSiteConfig",
      "serializeJsonLd",
      "serializeRobots",
    ]);
    expect(siteMeta).not.toHaveProperty("resolvePageMeta");
  });

  it("exposes input contracts without requiring a resolved model", () => {
    expectTypeOf<PageMeta>().toBeObject();
    expectTypeOf<SiteConfig>().toBeObject();
  });
});
