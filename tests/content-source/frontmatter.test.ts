import { describe, expect, it } from "vitest";
import {
  ContentSourceError,
  parseMarkdownFrontmatter,
  stringifyMarkdownFrontmatter,
} from "../../src/features/content-source";

describe("parseMarkdownFrontmatter", () => {
  it("separates LF frontmatter and body", () => {
    const result = parseMarkdownFrontmatter(
      "---\ntitle: Example\ntags:\n  - one\n---\n# Heading\n\nBody.\n",
    );

    expect(result).toEqual({
      frontmatter: { title: "Example", tags: ["one"] },
      body: "# Heading\n\nBody.\n",
      newline: "\n",
    });
  });

  it("detects CRLF and normalizes the body to LF", () => {
    const result = parseMarkdownFrontmatter(
      "---\r\ntitle: Example\r\n---\r\nFirst\r\nSecond\r\n",
    );

    expect(result.newline).toBe("\r\n");
    expect(result.body).toBe("First\nSecond\n");
  });

  it("keeps body delimiters and empty bodies", () => {
    expect(parseMarkdownFrontmatter("---\ntitle: Example\n---\n").body).toBe("");
    expect(parseMarkdownFrontmatter(
      "---\ntitle: Example\n---\nBefore\n---\nAfter\n",
    ).body).toBe("Before\n---\nAfter\n");
  });

  it.each([
    ["scalar", "value", "value"],
    ["array", "- one\n- two", ["one", "two"]],
    ["null", "null", null],
  ])("accepts %s frontmatter before domain validation", (_label, yaml, expected) => {
    expect(parseMarkdownFrontmatter(`---\n${yaml}\n---\n`).frontmatter)
      .toEqual(expected);
  });

  it("uses the opening delimiter newline for mixed input", () => {
    const result = parseMarkdownFrontmatter(
      "---\r\ntitle: Example\n---\r\nFirst\nSecond\r\n",
    );
    expect(result).toEqual({
      frontmatter: { title: "Example" },
      body: "First\nSecond\n",
      newline: "\r\n",
    });
  });

  it.each([
    ["plain body", "Body only\n"],
    ["leading blank line", "\n---\ntitle: Example\n---\n"],
    ["leading whitespace", " ---\ntitle: Example\n---\n"],
    ["byte order mark", "\uFEFF---\ntitle: Example\n---\n"],
    ["spaced opening delimiter", "--- \ntitle: Example\n---\n"],
  ])("rejects %s without an exact opening delimiter", (_label, source) => {
    expectContentSourceError(
      () => parseMarkdownFrontmatter(source, { sourceName: "article.md" }),
      "FRONTMATTER_NOT_FOUND",
      "article.md",
    );
  });

  it.each([
    ["missing delimiter", "---\ntitle: Example\nBody\n"],
    ["spaced closing delimiter", "---\ntitle: Example\n--- \nBody\n"],
  ])("rejects %s as unclosed frontmatter", (_label, source) => {
    expectContentSourceError(
      () => parseMarkdownFrontmatter(source),
      "FRONTMATTER_NOT_CLOSED",
    );
  });

  it("preserves YAML error codes and source names", () => {
    expectContentSourceError(
      () => parseMarkdownFrontmatter(
        "---\nvalue: first\nvalue: second\n---\n",
        { sourceName: "article.md" },
      ),
      "YAML_PARSE_FAILED",
      "article.md",
    );
    expectContentSourceError(
      () => parseMarkdownFrontmatter(
        "---\nfirst: &shared one\nsecond: *shared\n---\n",
      ),
      "YAML_PARSE_FAILED",
    );
  });
});

describe("stringifyMarkdownFrontmatter", () => {
  it("uses LF and canonical YAML by default", () => {
    expect(stringifyMarkdownFrontmatter({
      frontmatter: { title: "Example", tags: ["one"] },
      body: "# Heading\n",
    })).toBe("---\ntitle: Example\ntags:\n  - one\n---\n# Heading\n");
  });

  it("uses CRLF throughout when requested", () => {
    const source = stringifyMarkdownFrontmatter({
      frontmatter: { title: "Example" },
      body: "First\nSecond\r\n",
      newline: "\r\n",
    });

    expect(source).toBe(
      "---\r\ntitle: Example\r\n---\r\nFirst\r\nSecond\r\n",
    );
    expect(source.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("preserves body whitespace and trailing newline state", () => {
    const bodyWithoutNewline = "  Body with spaces  ";
    const bodyWithNewline = "\nBody\n";

    expect(stringifyMarkdownFrontmatter({
      frontmatter: { title: "Example" },
      body: bodyWithoutNewline,
    }).endsWith(bodyWithoutNewline)).toBe(true);
    expect(stringifyMarkdownFrontmatter({
      frontmatter: { title: "Example" },
      body: bodyWithNewline,
    }).endsWith(bodyWithNewline)).toBe(true);
  });

  it.each(["\n", "\r\n"] as const)(
    "round-trips semantic content with %j",
    (newline) => {
      const source = stringifyMarkdownFrontmatter({
        frontmatter: {
          schemaVersion: 1,
          profile: { name: "Example", links: ["https://example.com"] },
        },
        body: "# Profile\n\nDescription.\n",
        newline,
      });
      const result = parseMarkdownFrontmatter(source);

      expect(result.frontmatter).toEqual({
        schemaVersion: 1,
        profile: { name: "Example", links: ["https://example.com"] },
      });
      expect(result.body).toBe("# Profile\n\nDescription.\n");
      expect(result.newline).toBe(newline);
    },
  );
});

function expectContentSourceError(
  action: () => unknown,
  code: ContentSourceError["code"],
  sourceName?: string,
): void {
  try {
    action();
    throw new Error("Expected ContentSourceError");
  } catch (error) {
    expect(error).toBeInstanceOf(ContentSourceError);
    const sourceError = error as ContentSourceError;
    expect(sourceError.code).toBe(code);
    expect(sourceError.sourceName).toBe(sourceName);
  }
}
