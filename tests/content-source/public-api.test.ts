import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ContentSourceError,
  parseMarkdownFrontmatter,
  parseYamlSource,
  stringifyMarkdownFrontmatter,
  stringifyYamlSource,
  type ContentSourceErrorCode,
  type ContentSourceErrorOptions,
  type ParsedMarkdownFrontmatter,
  type ParseSourceOptions,
  type SourceNewline,
  type StringifyMarkdownFrontmatterInput,
} from "../../src/features/content-source";

describe("content-source public API", () => {
  it("exports the four codec functions and the shared error", () => {
    expect(parseYamlSource).toBeTypeOf("function");
    expect(stringifyYamlSource).toBeTypeOf("function");
    expect(parseMarkdownFrontmatter).toBeTypeOf("function");
    expect(stringifyMarkdownFrontmatter).toBeTypeOf("function");
    expect(ContentSourceError).toBeTypeOf("function");
  });

  it("keeps unvalidated values unknown", () => {
    expectTypeOf(parseYamlSource("title: Example\n")).toEqualTypeOf<unknown>();
    expectTypeOf(parseMarkdownFrontmatter("---\ntitle: Example\n---\n"))
      .toEqualTypeOf<ParsedMarkdownFrontmatter>();
    expectTypeOf<ParsedMarkdownFrontmatter["frontmatter"]>()
      .toEqualTypeOf<unknown>();
  });

  it("exports domain-independent supporting types", () => {
    expectTypeOf<SourceNewline>().toEqualTypeOf<"\n" | "\r\n">();
    expectTypeOf<ParseSourceOptions>().toEqualTypeOf<{ sourceName?: string }>();
    expectTypeOf<StringifyMarkdownFrontmatterInput>().toEqualTypeOf<{
      frontmatter: unknown;
      body: string;
      newline?: SourceNewline;
    }>();
    expectTypeOf<ContentSourceErrorCode>().toEqualTypeOf<
      | "YAML_DOCUMENT_COUNT"
      | "YAML_PARSE_FAILED"
      | "YAML_STRINGIFY_FAILED"
      | "FRONTMATTER_NOT_FOUND"
      | "FRONTMATTER_NOT_CLOSED"
    >();
    expectTypeOf<ContentSourceErrorOptions>().toHaveProperty("code");
  });
});
