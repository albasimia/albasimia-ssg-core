import { GitHubApiError } from "./errors";
import type {
  GitHubClientConfig,
  GitHubFetch,
  GitHubRepositoryConfig,
} from "./types";

export interface ResolvedGitHubClientConfig {
  readonly repository: GitHubRepositoryConfig;
  readonly token: string;
  readonly userAgent: string;
  readonly fetch: GitHubFetch;
}

export function resolveGitHubClientConfig(
  input: GitHubClientConfig,
): ResolvedGitHubClientConfig {
  const owner = requiredText(input.owner, "owner");
  const repo = requiredText(input.repo, "repo");
  const branch = requiredText(input.branch, "branch");
  const token = requiredText(input.token, "token");
  const userAgent = requiredText(input.userAgent, "userAgent");
  if (owner.includes("/") || repo.includes("/")) throw invalidConfig(owner.includes("/") ? "owner" : "repo");
  if (typeof input.fetch !== "function") throw invalidConfig("fetch");

  return {
    repository: { owner, repo, branch },
    token,
    userAgent,
    fetch: input.fetch,
  };
}

export function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalidConfig(path);
  }
  return value.trim();
}

export function requiredInputText(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new GitHubApiError(`${path} is invalid`, {
      code: "INPUT_INVALID",
      path,
    });
  }
  return value.trim();
}

function invalidConfig(path: string): GitHubApiError {
  return new GitHubApiError(`${path} is invalid`, {
    code: "CONFIG_INVALID",
    path,
  });
}
