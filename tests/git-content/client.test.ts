import { describe, expect, it } from "vitest";
import {
  createGitHubClient,
  GitHubApiError,
  type GitHubFetch,
} from "../../src/features/git-content";

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function createMockFetch(responses: Response[]) {
  const calls: FetchCall[] = [];
  const fetch: GitHubFetch = async (url, init) => {
    calls.push({ url, init });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  };
  return { fetch, calls };
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function config(fetch: GitHubFetch) {
  return {
    owner: "example-owner",
    repo: "example-repo",
    branch: "feature/site",
    token: "secret-token",
    userAgent: "asc-tests",
    fetch,
  };
}

describe("createGitHubClient", () => {
  it("uses injected repository configuration and required GitHub headers", async () => {
    const { fetch, calls } = createMockFetch([json({ id: 1, name: "example-repo" })]);
    const client = createGitHubClient(config(fetch));

    await client.getRepository();

    expect(client.repository).toEqual({
      owner: "example-owner",
      repo: "example-repo",
      branch: "feature/site",
    });
    expect(calls[0]?.url).toBe("https://api.github.com/repos/example-owner/example-repo");
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(headers.get("User-Agent")).toBe("asc-tests");
    expect(headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
  });

  it("gets repository content with encoded path and selected ref", async () => {
    const { fetch, calls } = createMockFetch([json({ type: "file", path: "docs/a file.md" })]);
    const client = createGitHubClient(config(fetch));

    await client.getContent("docs/a file.md", { ref: "commit-sha" });

    expect(calls[0]?.url).toBe(
      "https://api.github.com/repos/example-owner/example-repo/contents/docs/a%20file.md?ref=commit-sha",
    );
  });

  it("supports the low-level Git Database operations needed by a later writer", async () => {
    const responses = Array.from({ length: 8 }, (_, index) => json({ sha: `sha-${index}`, object: { sha: "head" } }));
    const { fetch, calls } = createMockFetch(responses);
    const client = createGitHubClient(config(fetch));

    await client.getBranchHead();
    await client.createBlob({ content: "hello", encoding: "utf-8" });
    await client.getTree("tree-sha", { recursive: true });
    await client.createTree({
      baseTree: "base-tree",
      tree: [{ path: "docs/page.md", mode: "100644", type: "blob", sha: "blob-sha" }],
    });
    await client.getCommit("commit-sha");
    await client.createCommit({ message: "Update page", tree: "tree-sha", parents: ["parent-sha"] });
    await client.getRef("heads/main");
    await client.updateRef("heads/main", { sha: "new-sha" });

    expect(calls.map((call) => `${call.init?.method ?? "GET"} ${call.url}`)).toEqual([
      "GET https://api.github.com/repos/example-owner/example-repo/git/ref/heads/feature/site",
      "POST https://api.github.com/repos/example-owner/example-repo/git/blobs",
      "GET https://api.github.com/repos/example-owner/example-repo/git/trees/tree-sha?recursive=1",
      "POST https://api.github.com/repos/example-owner/example-repo/git/trees",
      "GET https://api.github.com/repos/example-owner/example-repo/git/commits/commit-sha",
      "POST https://api.github.com/repos/example-owner/example-repo/git/commits",
      "GET https://api.github.com/repos/example-owner/example-repo/git/ref/heads/main",
      "PATCH https://api.github.com/repos/example-owner/example-repo/git/refs/heads/main",
    ]);
    expect(JSON.parse(String(calls[3]?.init?.body))).toEqual({
      base_tree: "base-tree",
      tree: [{ path: "docs/page.md", mode: "100644", type: "blob", sha: "blob-sha" }],
    });
    expect(JSON.parse(String(calls[7]?.init?.body))).toEqual({ sha: "new-sha", force: false });
  });

  it.each([
    ["owner", { owner: "" }],
    ["repo", { repo: "owner/repo" }],
    ["branch", { branch: "" }],
    ["token", { token: "" }],
    ["userAgent", { userAgent: "" }],
    ["fetch", { fetch: undefined }],
  ])("rejects invalid %s configuration with a stable error", (path, override) => {
    const validFetch: GitHubFetch = async () => json({});
    expect(() => createGitHubClient({ ...config(validFetch), ...override } as never)).toThrow(
      expect.objectContaining<Partial<GitHubApiError>>({ code: "CONFIG_INVALID", path }),
    );
  });

  it("normalizes invalid operation input", () => {
    const validFetch: GitHubFetch = async () => json({});
    const client = createGitHubClient(config(validFetch));
    expect(() => client.getContent("../secret")).toThrow(
      expect.objectContaining<Partial<GitHubApiError>>({ code: "INPUT_INVALID", path: "path" }),
    );
  });
});
