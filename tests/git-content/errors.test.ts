import { describe, expect, it } from "vitest";
import {
  createGitHubClient,
  GitHubApiError,
  type GitHubFetch,
} from "../../src/features/git-content";

const token = "private-token";

function client(fetch: GitHubFetch) {
  return createGitHubClient({
    owner: "owner",
    repo: "repo",
    branch: "main",
    token,
    userAgent: "asc-tests",
    fetch,
  });
}

async function captureError(fetch: GitHubFetch): Promise<GitHubApiError> {
  try {
    await client(fetch).getRepository();
    throw new Error("Expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(GitHubApiError);
    return error as GitHubApiError;
  }
}

describe("GitHubApiError", () => {
  it("preserves GitHub diagnostics and rate-limit headers", async () => {
    const error = await captureError(async () => new Response(JSON.stringify({
      message: "Validation failed",
      documentation_url: "https://docs.github.com/rest/git/refs",
      errors: [{ resource: "Reference", field: "sha", code: "invalid" }],
    }), {
      status: 422,
      headers: {
        "x-github-request-id": "REQUEST-123",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-used": "5000",
        "x-ratelimit-reset": "1784937600",
        "x-ratelimit-resource": "core",
        "retry-after": "60",
      },
    }));

    expect(error).toMatchObject({
      code: "HTTP_ERROR",
      status: 422,
      githubMessage: "Validation failed",
      documentationUrl: "https://docs.github.com/rest/git/refs",
      requestId: "REQUEST-123",
      method: "GET",
      rateLimit: {
        limit: 5000,
        remaining: 0,
        used: 5000,
        reset: 1784937600,
        resource: "core",
        retryAfter: 60,
      },
    });
    expect(error.details).toEqual(['{"resource":"Reference","field":"sha","code":"invalid"}']);
  });

  it("handles non-JSON and empty error responses", async () => {
    const textError = await captureError(async () => new Response("upstream unavailable", { status: 502 }));
    const emptyError = await captureError(async () => new Response(null, { status: 404 }));

    expect(textError.githubMessage).toBe("upstream unavailable");
    expect(emptyError.githubMessage).toBeUndefined();
    expect(emptyError.status).toBe(404);
  });

  it("redacts the configured token from every textual diagnostic", async () => {
    const error = await captureError(async () => new Response(JSON.stringify({
      message: `failed ${token}`,
      documentation_url: `https://example.com/${token}`,
      errors: [`detail ${token}`],
    }), { status: 400 }));

    expect(error.message).not.toContain(token);
    expect(error.githubMessage).not.toContain(token);
    expect(error.documentationUrl).not.toContain(token);
    expect(error.details.join(" ")).not.toContain(token);
  });

  it("normalizes transport failures without exposing their cause", async () => {
    const error = await captureError(async () => {
      throw new Error(`network failed with ${token}`);
    });

    expect(error.code).toBe("REQUEST_FAILED");
    expect(error.message).not.toContain(token);
    expect(error).not.toHaveProperty("cause");
  });

  it.each([
    ["not json", "invalid JSON"],
    ["", "empty response"],
  ])("normalizes invalid successful responses", async (body, message) => {
    const error = await captureError(async () => new Response(body || null, { status: 200 }));
    expect(error).toMatchObject({ code: "RESPONSE_INVALID", status: 200 });
    expect(error.message).toContain(message);
  });
});
