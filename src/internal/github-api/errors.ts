import type {
  GitHubApiErrorCode,
  GitHubApiErrorOptions,
  GitHubRateLimitDiagnostics,
} from "./types.js";

export class GitHubApiError extends Error {
  readonly code: GitHubApiErrorCode;
  readonly status?: number;
  readonly githubMessage?: string;
  readonly documentationUrl?: string;
  readonly requestId?: string;
  readonly rateLimit?: GitHubRateLimitDiagnostics;
  readonly method?: string;
  readonly url?: string;
  readonly path?: string;
  readonly details: readonly string[];

  constructor(message: string, options: GitHubApiErrorOptions) {
    super(message);
    this.name = "GitHubApiError";
    this.code = options.code;
    this.status = options.status;
    this.githubMessage = options.githubMessage;
    this.documentationUrl = options.documentationUrl;
    this.requestId = options.requestId;
    this.rateLimit = options.rateLimit;
    this.method = options.method;
    this.url = options.url;
    this.path = options.path;
    this.details = options.details ?? [];
  }
}
