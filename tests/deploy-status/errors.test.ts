import { describe, expect, it } from "vitest";
import {
  createDeploymentStatusClient,
  GitHubApiError,
  type DeploymentStatusFetch,
} from "../../src/features/deploy-status";

const token = "private-token";

function client(fetch: DeploymentStatusFetch) {
  return createDeploymentStatusClient({
    owner: "owner",
    repo: "repo",
    token,
    userAgent: "asc-tests",
    fetch,
    workflow: "workflow.yml",
  });
}

async function capture(fetch: DeploymentStatusFetch): Promise<GitHubApiError> {
  try {
    await client(fetch).listDeploymentRuns();
    throw new Error("Expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(GitHubApiError);
    return error as GitHubApiError;
  }
}

describe("deployment status errors", () => {
  it("uses shared GitHub diagnostics and redacts secrets", async () => {
    const error = await capture(async () => new Response(JSON.stringify({
      message: `rate limited ${token}`,
      documentation_url: "https://docs.github.com/rest/actions",
      errors: [`secret ${token}`],
    }), {
      status: 429,
      headers: {
        "x-github-request-id": "ACTIONS-REQUEST",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1784937600",
        "retry-after": "60",
      },
    }));

    expect(error).toMatchObject({
      code: "HTTP_ERROR",
      status: 429,
      requestId: "ACTIONS-REQUEST",
      rateLimit: { remaining: 0, reset: 1784937600, retryAfter: 60 },
    });
    expect(error.message).not.toContain(token);
    expect(error.githubMessage).not.toContain(token);
    expect(error.details.join(" ")).not.toContain(token);
  });

  it("handles non-JSON and empty error bodies", async () => {
    const textError = await capture(async () => new Response("unavailable", { status: 502 }));
    const emptyError = await capture(async () => new Response(null, { status: 503 }));
    expect(textError.githubMessage).toBe("unavailable");
    expect(emptyError.githubMessage).toBeUndefined();
  });

  it("does not expose transport causes", async () => {
    const error = await capture(async () => {
      throw new Error(`failed ${token}`);
    });
    expect(error.code).toBe("REQUEST_FAILED");
    expect(error.message).not.toContain(token);
    expect(error).not.toHaveProperty("cause");
  });
});
