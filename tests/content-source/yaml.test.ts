import { describe, expect, it } from "vitest";
import {
  ContentSourceError,
  parseYamlSource,
  stringifyYamlSource,
} from "../../src/features/content-source";

describe("parseYamlSource", () => {
  it("parses YAML 1.2 core values", () => {
    expect(parseYamlSource(`
title: Example
enabled: true
count: 2
missing: null
tags:
  - one
  - two
`)).toEqual({
      title: "Example",
      enabled: true,
      count: 2,
      missing: null,
      tags: ["one", "two"],
    });
  });

  it("parses quoted and multiline scalars", () => {
    expect(parseYamlSource(`
quoted: "true"
multiline: |
  first
  second
`)).toEqual({ quoted: "true", multiline: "first\nsecond\n" });
  });

  it("does not let sourceName change the parsed value", () => {
    expect(parseYamlSource("title: Example\n", { sourceName: "profile.yaml" }))
      .toEqual(parseYamlSource("title: Example\n"));
  });

  it("rejects zero and multiple documents with a stable code", () => {
    expectContentSourceError(
      () => parseYamlSource("", { sourceName: "empty.yaml" }),
      "YAML_DOCUMENT_COUNT",
      "empty.yaml",
      "documentCount=0",
    );
    expectContentSourceError(
      () => parseYamlSource("---\na: 1\n---\nb: 2\n"),
      "YAML_DOCUMENT_COUNT",
      undefined,
      "documentCount=2",
    );
  });

  it("rejects syntax errors and duplicate keys", () => {
    expectContentSourceError(
      () => parseYamlSource("value: [unterminated\n"),
      "YAML_PARSE_FAILED",
    );
    expectContentSourceError(
      () => parseYamlSource("value: first\nvalue: second\n"),
      "YAML_PARSE_FAILED",
    );
  });

  it("rejects aliases instead of expanding them", () => {
    expectContentSourceError(
      () => parseYamlSource("first: &shared\n  value: one\nsecond: *shared\n"),
      "YAML_PARSE_FAILED",
    );
  });
});

describe("stringifyYamlSource", () => {
  it("uses canonical formatting and preserves insertion order", () => {
    const value = {
      schemaVersion: 1,
      profile: {
        name: "Example",
        tags: ["one", "two"],
      },
    };
    const source = stringifyYamlSource(value);

    expect(source).toBe(`schemaVersion: 1
profile:
  name: Example
  tags:
    - one
    - two
`);
    expect(source.endsWith("\n")).toBe(true);
    expect(source.endsWith("\n\n")).toBe(false);
    expect(stringifyYamlSource(value)).toBe(source);
  });

  it("does not wrap long strings", () => {
    const longValue = "x".repeat(240);
    expect(stringifyYamlSource({ value: longValue })).toBe(`value: ${longValue}\n`);
  });

  it("duplicates shared values without emitting anchors or aliases", () => {
    const shared = { value: "same" };
    const source = stringifyYamlSource({ first: shared, second: shared });

    expect(source).not.toMatch(/[&*][a-zA-Z0-9_-]+/);
    expect(parseYamlSource(source)).toEqual({
      first: { value: "same" },
      second: { value: "same" },
    });
  });

  it("round-trips supported values", () => {
    const value = {
      title: "Example",
      enabled: false,
      nested: [{ id: "first" }, { id: "second" }],
      multiline: "first\nsecond\n",
      optional: null,
    };
    expect(parseYamlSource(stringifyYamlSource(value))).toEqual(value);
  });

  it("wraps serialization failures", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expectContentSourceError(
      () => stringifyYamlSource(cyclic),
      "YAML_STRINGIFY_FAILED",
    );
  });
});

function expectContentSourceError(
  action: () => unknown,
  code: ContentSourceError["code"],
  sourceName?: string,
  detail?: string,
): void {
  try {
    action();
    throw new Error("Expected ContentSourceError");
  } catch (error) {
    expect(error).toBeInstanceOf(ContentSourceError);
    const sourceError = error as ContentSourceError;
    expect(sourceError.code).toBe(code);
    expect(sourceError.sourceName).toBe(sourceName);
    expect(sourceError.details.length).toBeGreaterThan(0);
    if (detail) expect(sourceError.details).toContain(detail);
  }
}
