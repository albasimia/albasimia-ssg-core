import { describe, expect, it } from "vitest";
import {
  createDeploymentStatusClient,
  GitHubApiError,
  type DeploymentStatusFetch,
} from "../../src/features/deploy-status";

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    status: "completed",
    conclusion: "success",
    workflow_url: "https://api.github.com/repos/owner/repo/actions/workflows/42",
    html_url: "https://github.com/owner/repo/actions/runs/101",
    head_sha: "commit-sha",
    head_branch: "main",
    created_at: "2026-07-25T00:00:00Z",
    updated_at: "2026-07-25T00:01:00Z",
    run_number: 7,
    ...overrides,
  };
}

function mockFetch(body: unknown, status = 200, headers?: HeadersInit) {
  const calls: FetchCall[] = [];
  const fetch: DeploymentStatusFetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers,
    });
  };
  return { fetch, calls };
}

function config(fetch: DeploymentStatusFetch, workflow: string | number = "release.yml") {
  return {
    owner: "owner",
    repo: "repo",
    token: "private-token",
    userAgent: "asc-tests",
    fetch,
    workflow,
  };
}

describe("createDeploymentStatusClient", () => {
  it("uses a workflow file and applies branch, commit, and result-count filters", async () => {
    const { fetch, calls } = mockFetch({ workflow_runs: [run()] });
    const client = createDeploymentStatusClient(config(fetch));

    const result = await client.listDeploymentRuns({
      branch: "feature/site",
      commitSha: "commit-sha",
      limit: 50,
    });

    expect(calls[0]?.url).toBe(
      "https://api.github.com/repos/owner/repo/actions/workflows/release.yml/runs?branch=feature%2Fsite&head_sha=commit-sha&per_page=50",
    );
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe("Bearer private-token");
    expect(result[0]).toEqual({
      id: 101,
      status: "completed",
      conclusion: "success",
      workflowUrl: "https://api.github.com/repos/owner/repo/actions/workflows/42",
      runUrl: "https://github.com/owner/repo/actions/runs/101",
      commitSha: "commit-sha",
      branch: "main",
      createdAt: "2026-07-25T00:00:00Z",
      updatedAt: "2026-07-25T00:01:00Z",
      runNumber: 7,
    });
  });

  it("accepts a numeric workflow ID and uses the default page size", async () => {
    const { fetch, calls } = mockFetch({ workflow_runs: [] });
    const client = createDeploymentStatusClient(config(fetch, 12345));

    await client.listDeploymentRuns();

    expect(client.repository).toEqual({ owner: "owner", repo: "repo", workflow: 12345 });
    expect(calls[0]?.url.endsWith("/actions/workflows/12345/runs?per_page=20")).toBe(true);
  });

  it.each([
    ["queued", "queued"],
    ["requested", "queued"],
    ["waiting", "queued"],
    ["pending", "queued"],
    ["in_progress", "in_progress"],
    ["completed", "completed"],
  ])("normalizes status %s to %s", async (raw, expected) => {
    const { fetch } = mockFetch({ workflow_runs: [run({ status: raw, conclusion: null })] });
    const [result] = await createDeploymentStatusClient(config(fetch)).listDeploymentRuns();
    expect(result?.status).toBe(expected);
    expect(result?.conclusion).toBeNull();
  });

  it.each([
    "success",
    "failure",
    "cancelled",
    "skipped",
    "timed_out",
    "action_required",
    "neutral",
    "stale",
    "startup_failure",
  ])("preserves supported conclusion %s", async (conclusion) => {
    const { fetch } = mockFetch({ workflow_runs: [run({ conclusion })] });
    const [result] = await createDeploymentStatusClient(config(fetch)).listDeploymentRuns();
    expect(result?.conclusion).toBe(conclusion);
  });

  it("maps unknown status and conclusion without failing", async () => {
    const { fetch } = mockFetch({
      workflow_runs: [run({ status: "future_status", conclusion: "future_conclusion" })],
    });

    const [result] = await createDeploymentStatusClient(config(fetch)).listDeploymentRuns();

    expect(result).toMatchObject({
      status: "unknown",
      unknownStatus: "future_status",
      conclusion: "unknown",
      unknownConclusion: "future_conclusion",
    });
  });

  it("gets the run for a commit SHA", async () => {
    const { fetch, calls } = mockFetch({ workflow_runs: [run({ head_sha: "target-sha" })] });
    const result = await createDeploymentStatusClient(config(fetch))
      .getDeploymentRunForCommit("target-sha", { branch: "main", limit: 5 });

    expect(result?.commitSha).toBe("target-sha");
    expect(calls[0]?.url).toContain("branch=main&head_sha=target-sha&per_page=5");
  });

  it("returns null when no run matches the commit", async () => {
    const { fetch } = mockFetch({ workflow_runs: [] });
    await expect(createDeploymentStatusClient(config(fetch)).getDeploymentRunForCommit("missing-sha"))
      .resolves.toBeNull();
  });

  it.each([0, 101, 1.5])("rejects invalid pagination limits: %s", async (limit) => {
    const { fetch, calls } = mockFetch({ workflow_runs: [] });
    const client = createDeploymentStatusClient(config(fetch));
    await expect(client.listDeploymentRuns({ limit })).rejects.toMatchObject({
      code: "INPUT_INVALID",
      path: "limit",
    });
    expect(calls).toHaveLength(0);
  });

  it("rejects an invalid workflow setting", () => {
    const { fetch } = mockFetch({ workflow_runs: [] });
    expect(() => createDeploymentStatusClient(config(fetch, 0))).toThrow(
      expect.objectContaining<Partial<GitHubApiError>>({ code: "CONFIG_INVALID", path: "workflow" }),
    );
  });
});
