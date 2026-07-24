import type { SitemapErrorCode, SitemapErrorOptions } from "./types.js";

export class SitemapError extends Error {
  readonly code: SitemapErrorCode;
  readonly path: string;
  override readonly cause?: unknown;

  constructor(message: string, options: SitemapErrorOptions) {
    super(message);
    this.name = "SitemapError";
    this.code = options.code;
    this.path = options.path;
    this.cause = options.cause;
  }
}
