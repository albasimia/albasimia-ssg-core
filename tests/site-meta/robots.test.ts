import { describe, expect, it } from "vitest";
import { serializeRobots, SiteMetaError } from "../../src/features/site-meta";

describe("serializeRobots", () => {
  it("trims, deduplicates, and preserves directive order", () => {
    expect(serializeRobots([" noindex ", "nofollow", "noindex"]))
      .toBe("noindex, nofollow");
  });

  const invalidDirectives: readonly { directives: readonly string[] }[] = [
    { directives: [] },
    { directives: [""] },
    { directives: ["index, follow"] },
  ];

  it.each(invalidDirectives)("rejects invalid directives", ({ directives }) => {
    expect(() => serializeRobots(directives)).toThrow(
      expect.objectContaining<Partial<SiteMetaError>>({ code: "PAGE_META_INVALID" }),
    );
  });
});
