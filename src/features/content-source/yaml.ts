import YAML from "yaml";
import { ContentSourceError } from "./errors.js";
import type { ParseSourceOptions } from "./types.js";

export function parseYamlSource(
  source: string,
  options: ParseSourceOptions = {},
): unknown {
  let documents;

  try {
    documents = YAML.parseAllDocuments(source, {
      version: "1.2",
      schema: "core",
      uniqueKeys: true,
    });
  } catch (error) {
    throw yamlParseError(error, options.sourceName);
  }

  if (documents.length !== 1) {
    throw new ContentSourceError(
      `${sourceLabel(options.sourceName)} must contain exactly one YAML document`,
      {
        code: "YAML_DOCUMENT_COUNT",
        sourceName: options.sourceName,
        details: [`documentCount=${documents.length}`],
      },
    );
  }

  const document = documents[0];
  if (document.errors.length > 0) {
    throw new ContentSourceError(
      `${sourceLabel(options.sourceName)} contains invalid YAML`,
      {
        code: "YAML_PARSE_FAILED",
        sourceName: options.sourceName,
        details: document.errors.map((error) => error.message),
        cause: document.errors[0],
      },
    );
  }

  try {
    return document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    throw yamlParseError(error, options.sourceName);
  }
}

export function stringifyYamlSource(value: unknown): string {
  try {
    const source = YAML.stringify(value, {
      aliasDuplicateObjects: false,
      blockQuote: false,
      indent: 2,
      lineWidth: 0,
      sortMapEntries: false,
    });
    return source.endsWith("\n") ? source : `${source}\n`;
  } catch (error) {
    throw new ContentSourceError("Value cannot be serialized as canonical YAML", {
      code: "YAML_STRINGIFY_FAILED",
      details: [errorMessage(error)],
      cause: error,
    });
  }
}

function yamlParseError(
  error: unknown,
  sourceName: string | undefined,
): ContentSourceError {
  return new ContentSourceError(
    `${sourceLabel(sourceName)} contains invalid YAML`,
    {
      code: "YAML_PARSE_FAILED",
      sourceName,
      details: [errorMessage(error)],
      cause: error,
    },
  );
}

function sourceLabel(sourceName: string | undefined): string {
  return sourceName ?? "YAML source";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
