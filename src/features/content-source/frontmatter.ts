import { ContentSourceError } from "./errors.js";
import type {
  ParsedMarkdownFrontmatter,
  ParseSourceOptions,
  SourceNewline,
  StringifyMarkdownFrontmatterInput,
} from "./types.js";
import { parseYamlSource, stringifyYamlSource } from "./yaml.js";

export function parseMarkdownFrontmatter(
  source: string,
  options: ParseSourceOptions = {},
): ParsedMarkdownFrontmatter {
  const newline = openingNewline(source);
  if (!newline) {
    throw new ContentSourceError(
      `${sourceLabel(options.sourceName)} does not start with YAML frontmatter`,
      {
        code: "FRONTMATTER_NOT_FOUND",
        sourceName: options.sourceName,
      },
    );
  }

  const normalized = normalizeNewlines(source);
  const remainder = normalized.slice(4);
  const closing = /^---(?:\n|$)/m.exec(remainder);
  if (!closing) {
    throw new ContentSourceError(
      `${sourceLabel(options.sourceName)} has unclosed YAML frontmatter`,
      {
        code: "FRONTMATTER_NOT_CLOSED",
        sourceName: options.sourceName,
      },
    );
  }

  const yamlSource = remainder.slice(0, closing.index);
  const body = remainder.slice(closing.index + closing[0].length);

  return {
    frontmatter: parseYamlSource(yamlSource, options),
    body,
    newline,
  };
}

export function stringifyMarkdownFrontmatter(
  input: StringifyMarkdownFrontmatterInput,
): string {
  const newline = input.newline ?? "\n";
  const yamlSource = stringifyYamlSource(input.frontmatter).slice(0, -1);
  const body = normalizeNewlines(input.body);
  const source = `---\n${yamlSource}\n---\n${body}`;

  return newline === "\n" ? source : source.replaceAll("\n", "\r\n");
}

function openingNewline(source: string): SourceNewline | null {
  if (source.startsWith("---\r\n")) return "\r\n";
  if (source.startsWith("---\n")) return "\n";
  return null;
}

function normalizeNewlines(source: string): string {
  return source.replaceAll("\r\n", "\n");
}

function sourceLabel(sourceName: string | undefined): string {
  return sourceName ?? "Markdown source";
}
