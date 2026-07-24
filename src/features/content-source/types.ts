export type SourceNewline = "\n" | "\r\n";

export interface ParseSourceOptions {
  sourceName?: string;
}

export interface ParsedMarkdownFrontmatter {
  frontmatter: unknown;
  body: string;
  newline: SourceNewline;
}

export interface StringifyMarkdownFrontmatterInput {
  frontmatter: unknown;
  body: string;
  newline?: SourceNewline;
}

export type ContentSourceErrorCode =
  | "YAML_DOCUMENT_COUNT"
  | "YAML_PARSE_FAILED"
  | "YAML_STRINGIFY_FAILED"
  | "FRONTMATTER_NOT_FOUND"
  | "FRONTMATTER_NOT_CLOSED";

export interface ContentSourceErrorOptions {
  code: ContentSourceErrorCode;
  sourceName?: string;
  details?: readonly string[];
  cause?: unknown;
}
