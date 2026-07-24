import { describe, expect, it } from "vitest";
import { serializeJsonLd, SiteMetaError } from "../../src/features/site-meta";

describe("serializeJsonLd", () => {
  it("escapes script-closing content and JavaScript line separators", () => {
    const result = serializeJsonLd({ value: "</script>\u2028\u2029" });
    expect(result).toBe('{"value":"\\u003c/script>\\u2028\\u2029"}');
  });

  it("rejects cycles, non-finite numbers, undefined, and non-plain objects", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const values = [cyclic, { value: Number.NaN }, { value: undefined }, { value: new Date() }, []];
    for (const value of values) {
      expect(() => serializeJsonLd(value as never)).toThrow(
        expect.objectContaining<Partial<SiteMetaError>>({ code: "JSON_LD_INVALID" }),
      );
    }
  });
});
