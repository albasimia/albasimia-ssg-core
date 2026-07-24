import { describe, expect, expectTypeOf, it } from "vitest";
import * as gitContent from "../../src/features/git-content";
import type {
  CommitGitFileChangesInput,
  CommitGitFileChangesResult,
  GitFileChange,
  GitHubApiErrorCode,
  GitHubClient,
  GitHubClientConfig,
  GitHubFetch,
  GitHubRateLimitDiagnostics,
} from "../../src/features/git-content";

describe("git-content public API", () => {
  it("exports the client factory and stable error only at runtime", () => {
    expect(Object.keys(gitContent).sort()).toEqual([
      "GitFileCommitError",
      "GitHubApiError",
      "commitGitFileChanges",
      "createGitHubClient",
    ]);
    expect(gitContent).not.toHaveProperty("createGitHubRequester");
  });

  it("exposes runtime-neutral configuration and diagnostics", () => {
    expectTypeOf<GitHubFetch>().toBeFunction();
    expectTypeOf<GitHubClientConfig>().toHaveProperty("fetch");
    expectTypeOf<GitHubClient>().toHaveProperty("createTree");
    expectTypeOf<GitHubRateLimitDiagnostics>().toHaveProperty("remaining");
    expectTypeOf<GitHubApiErrorCode>().toEqualTypeOf<
      "CONFIG_INVALID" | "INPUT_INVALID" | "REQUEST_FAILED" | "HTTP_ERROR" | "RESPONSE_INVALID"
    >();
    expectTypeOf<CommitGitFileChangesInput>().toHaveProperty("expectedHeadSha");
    expectTypeOf<GitFileChange>().toHaveProperty("path");
    expectTypeOf<CommitGitFileChangesResult>().toHaveProperty("status");
  });
});
