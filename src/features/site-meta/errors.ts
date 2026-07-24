import type { SiteMetaErrorCode, SiteMetaErrorOptions } from "./types";

export class SiteMetaError extends Error {
  readonly code: SiteMetaErrorCode;
  readonly path?: string;
  readonly details: readonly string[];
  override readonly cause?: unknown;

  constructor(message: string, options: SiteMetaErrorOptions) {
    super(message);
    this.name = "SiteMetaError";
    this.code = options.code;
    this.path = options.path;
    this.details = options.details ?? [];
    this.cause = options.cause;
  }
}
