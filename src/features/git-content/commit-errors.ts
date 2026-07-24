import type {
  GitFileCommitErrorCode,
  GitFileCommitErrorOptions,
} from "./commit-types.js";

export class GitFileCommitError extends Error {
  readonly code: GitFileCommitErrorCode;
  readonly path?: string;
  readonly details: readonly string[];

  constructor(message: string, options: GitFileCommitErrorOptions) {
    super(message);
    this.name = "GitFileCommitError";
    this.code = options.code;
    this.path = options.path;
    this.details = options.details ?? [];
  }
}
