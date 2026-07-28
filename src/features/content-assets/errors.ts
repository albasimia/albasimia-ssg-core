import type {
  ContentAssetErrorCode,
  ContentAssetErrorOptions,
} from "./types.js";

export class ContentAssetError extends Error {
  readonly code: ContentAssetErrorCode;
  readonly path?: string;
  override readonly cause?: unknown;

  constructor(message: string, options: ContentAssetErrorOptions) {
    super(message);
    this.name = "ContentAssetError";
    this.code = options.code;
    this.path = options.path;
    this.cause = options.cause;
  }
}
