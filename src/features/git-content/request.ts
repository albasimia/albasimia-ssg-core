import type { ResolvedGitHubClientConfig } from "./config";
import {
  createGitHubApiRequester,
  type GitHubApiRequester,
} from "../../internal/github-api/request";

const API_ROOT = "https://api.github.com";

export type GitHubRequester = GitHubApiRequester;

export function createGitHubRequester(
  config: ResolvedGitHubClientConfig,
): GitHubRequester {
  return createGitHubApiRequester({
    baseUrl: `${API_ROOT}/repos/${encodeURIComponent(config.repository.owner)}/${encodeURIComponent(config.repository.repo)}`,
    token: config.token,
    userAgent: config.userAgent,
    fetch: config.fetch,
  });
}
