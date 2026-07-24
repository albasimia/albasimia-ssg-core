import { GitHubApiError } from "./errors.js";
import type {
  GitHubApiRequestConfig,
  GitHubRateLimitDiagnostics,
} from "./types.js";

const API_VERSION = "2022-11-28";
const MAX_DIAGNOSTIC_LENGTH = 2_000;

export interface GitHubApiRequester {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createGitHubApiRequester(
  config: GitHubApiRequestConfig,
): GitHubApiRequester {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const method = init.method ?? "GET";
      const url = `${config.baseUrl}${path}`;
      let response: Response;
      try {
        response = await config.fetch(url, {
          ...init,
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${config.token}`,
            "User-Agent": config.userAgent,
            "X-GitHub-Api-Version": API_VERSION,
            ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
          },
        });
      } catch {
        throw new GitHubApiError("GitHub API request failed before receiving a response", {
          code: "REQUEST_FAILED",
          method,
          url,
        });
      }

      const diagnostics = responseDiagnostics(response);
      const body = await readResponseBody(response);
      if (!response.ok) {
        const errorBody = normalizeErrorBody(body, config.token);
        throw new GitHubApiError(`GitHub API request failed with status ${response.status}`, {
          code: "HTTP_ERROR",
          status: response.status,
          method,
          url,
          ...diagnostics,
          ...errorBody,
        });
      }

      if (!body) {
        throw new GitHubApiError("GitHub API returned an empty response", {
          code: "RESPONSE_INVALID",
          status: response.status,
          method,
          url,
          ...diagnostics,
        });
      }
      try {
        return JSON.parse(body) as T;
      } catch {
        throw new GitHubApiError("GitHub API returned an invalid JSON response", {
          code: "RESPONSE_INVALID",
          status: response.status,
          method,
          url,
          ...diagnostics,
        });
      }
    },
  };
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function normalizeErrorBody(body: string, token: string): {
  githubMessage?: string;
  documentationUrl?: string;
  details?: readonly string[];
} {
  if (!body.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { githubMessage: sanitize(body, token) };
  }
  if (!isRecord(parsed)) return { githubMessage: sanitize(body, token) };

  const githubMessage = typeof parsed.message === "string"
    ? sanitize(parsed.message, token)
    : undefined;
  const documentationUrl = typeof parsed.documentation_url === "string"
    ? sanitize(parsed.documentation_url, token)
    : undefined;
  const details = normalizeDetails(parsed.errors, token);
  return {
    ...(githubMessage ? { githubMessage } : {}),
    ...(documentationUrl ? { documentationUrl } : {}),
    ...(details.length > 0 ? { details } : {}),
  };
}

function normalizeDetails(value: unknown, token: string): string[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if (typeof item === "string") return sanitize(item, token);
    try {
      return sanitize(JSON.stringify(item), token);
    } catch {
      return "Unserializable GitHub error detail";
    }
  });
}

function sanitize(value: string, token: string): string {
  return value.replaceAll(token, "[REDACTED]").slice(0, MAX_DIAGNOSTIC_LENGTH);
}

function responseDiagnostics(response: Response): {
  requestId?: string;
  rateLimit?: GitHubRateLimitDiagnostics;
} {
  const requestId = response.headers.get("x-github-request-id") ?? undefined;
  const rateLimit = compactRateLimit({
    limit: numberHeader(response, "x-ratelimit-limit"),
    remaining: numberHeader(response, "x-ratelimit-remaining"),
    used: numberHeader(response, "x-ratelimit-used"),
    reset: numberHeader(response, "x-ratelimit-reset"),
    resource: response.headers.get("x-ratelimit-resource") ?? undefined,
    retryAfter: numberHeader(response, "retry-after"),
  });
  return {
    ...(requestId ? { requestId } : {}),
    ...(rateLimit ? { rateLimit } : {}),
  };
}

function numberHeader(response: Response, name: string): number | undefined {
  const value = response.headers.get(name);
  if (value === null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function compactRateLimit(
  value: GitHubRateLimitDiagnostics,
): GitHubRateLimitDiagnostics | undefined {
  return Object.values(value).some((item) => item !== undefined) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
