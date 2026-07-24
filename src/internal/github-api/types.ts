export type GitHubApiErrorCode =
  | "CONFIG_INVALID"
  | "INPUT_INVALID"
  | "REQUEST_FAILED"
  | "HTTP_ERROR"
  | "RESPONSE_INVALID";

export interface GitHubRateLimitDiagnostics {
  readonly limit?: number;
  readonly remaining?: number;
  readonly used?: number;
  readonly reset?: number;
  readonly resource?: string;
  readonly retryAfter?: number;
}

export interface GitHubApiErrorOptions {
  code: GitHubApiErrorCode;
  status?: number;
  githubMessage?: string;
  documentationUrl?: string;
  requestId?: string;
  rateLimit?: GitHubRateLimitDiagnostics;
  method?: string;
  url?: string;
  path?: string;
  details?: readonly string[];
}

export type GitHubApiFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface GitHubApiRequestConfig {
  readonly baseUrl: string;
  readonly token: string;
  readonly userAgent: string;
  readonly fetch: GitHubApiFetch;
}
