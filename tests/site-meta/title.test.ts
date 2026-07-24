import { describe, expect, it } from "vitest";
import { createPageTitle } from "../../src/features/site-meta";

const policy = { default: "Site", separator: " | ", position: "suffix" as const };

describe("createPageTitle", () => {
  it.each([
    [{}, "Site"],
    [{ title: "About" }, "About | Site"],
    [{ title: "About", titleMode: "absolute" as const }, "About"],
    [{ title: "Site" }, "Site"],
  ])("resolves %o", (page, expected) => {
    expect(createPageTitle(page, policy)).toBe(expected);
  });

  it("supports prefix policies", () => {
    expect(createPageTitle({ title: "About" }, { ...policy, position: "prefix" })).toBe("Site | About");
  });

  it.each([
    [{ title: "" }, policy, "PAGE_META_INVALID"],
    [{ title: "About" }, { ...policy, separator: "" }, "SITE_CONFIG_INVALID"],
    [{ title: "About", titleMode: "other" as never }, policy, "PAGE_META_INVALID"],
  ] as const)("rejects invalid title input", (page, inputPolicy, code) => {
    expect(() => createPageTitle(page, inputPolicy)).toThrow(expect.objectContaining({ code }));
  });
});
