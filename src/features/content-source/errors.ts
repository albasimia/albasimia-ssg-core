import type {
  ContentSourceErrorCode,
  ContentSourceErrorOptions,
} from "./types";

export class ContentSourceError extends Error {
  readonly code: ContentSourceErrorCode;
  readonly sourceName?: string;
  readonly details: readonly string[];
  override readonly cause?: unknown;

  constructor(message: string, options: ContentSourceErrorOptions) {
    super(message);
    this.name = "ContentSourceError";
    this.code = options.code;
    this.sourceName = options.sourceName;
    this.details = options.details ?? [];
    this.cause = options.cause;
  }
}
