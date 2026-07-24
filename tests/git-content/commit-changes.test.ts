import { describe, expect, it, vi } from "vitest";
import {
  commitGitFileChanges,
  GitFileCommitError,
  GitHubApiError,
  type CommitGitFileChangesInput,
  type GitHubClient,
  type GitHubTreeEntry,
} from "../../src/features/git-content";

const headSha = "head-sha";
const baseTreeSha = "base-tree-sha";

function gitObject(sha: string) {
  return { type: "commit" as const, sha, url: `https://api.github.test/${sha}` };
}

function createMockClient(baseEntries: GitHubTreeEntry[] = []) {
  let blobIndex = 0;
  return {
    repository: { owner: "owner", repo: "repo", branch: "main" },
    getRepository: vi.fn(),
    getContent: vi.fn(),
    getRef: vi.fn(),
    getBranchHead: vi.fn(async () => ({
      ref: "refs/heads/main",
      node_id: "ref-node",
      url: "https://api.github.test/ref",
      object: gitObject(headSha),
    })),
    getCommit: vi.fn(async (sha: string) => ({
      sha,
      url: "https://api.github.test/commit",
      message: "base",
      tree: { sha: baseTreeSha, url: "https://api.github.test/tree" },
      parents: [],
    })),
    getTree: vi.fn(async () => ({
      sha: baseTreeSha,
      url: "https://api.github.test/tree",
      tree: baseEntries,
      truncated: false,
    })),
    createBlob: vi.fn(async () => ({
      sha: `blob-${++blobIndex}`,
      url: "https://api.github.test/blob",
    })),
    createTree: vi.fn(async () => ({
      sha: "new-tree-sha",
      url: "https://api.github.test/new-tree",
      tree: [],
      truncated: false,
    })),
    createCommit: vi.fn(async () => ({
      sha: "new-commit-sha",
      url: "https://api.github.test/new-commit",
      message: "update",
      tree: { sha: "new-tree-sha", url: "https://api.github.test/new-tree" },
      parents: [{ sha: headSha, url: "https://api.github.test/head" }],
    })),
    updateRef: vi.fn(async () => ({
      ref: "refs/heads/main",
      node_id: "updated-ref",
      url: "https://api.github.test/ref",
      object: gitObject("new-commit-sha"),
    })),
  } satisfies GitHubClient;
}

function input(
  client: GitHubClient,
  changes: CommitGitFileChangesInput["changes"],
): CommitGitFileChangesInput {
  return {
    client,
    expectedHeadSha: headSha,
    message: "Update files",
    author: { name: "Author", email: "author@example.com" },
    changes,
  };
}

describe("commitGitFileChanges", () => {
  it("combines multiple writes into one tree and one commit", async () => {
    const client = createMockClient();
    const result = await commitGitFileChanges(input(client, [
      { type: "write", path: "docs/one.md", content: "one" },
      { type: "write", path: "docs/two.md", content: "two", encoding: "utf-8" },
    ]));

    expect(client.createBlob).toHaveBeenCalledTimes(2);
    expect(client.createTree).toHaveBeenCalledOnce();
    expect(client.createTree).toHaveBeenCalledWith({
      baseTree: baseTreeSha,
      tree: [
        { path: "docs/one.md", mode: "100644", type: "blob", sha: "blob-1" },
        { path: "docs/two.md", mode: "100644", type: "blob", sha: "blob-2" },
      ],
    });
    expect(client.createCommit).toHaveBeenCalledWith({
      message: "Update files",
      tree: "new-tree-sha",
      parents: [headSha],
      author: { name: "Author", email: "author@example.com" },
    });
    expect(client.updateRef).toHaveBeenCalledWith("heads/main", {
      sha: "new-commit-sha",
      force: false,
    });
    expect(result).toEqual({
      status: "committed",
      baseHeadSha: headSha,
      commitSha: "new-commit-sha",
      treeSha: "new-tree-sha",
      changedPaths: ["docs/one.md", "docs/two.md"],
    });
  });

  it("handles write, delete, and copy while reusing the base blob SHA", async () => {
    const client = createMockClient([
      { path: "bin/tool", mode: "100755", type: "blob", sha: "old-write", size: 1 },
      { path: "docs/remove.md", mode: "100644", type: "blob", sha: "remove-sha", size: 1 },
      { path: "templates/base.md", mode: "100644", type: "blob", sha: "source-sha", size: 1 },
    ]);

    await commitGitFileChanges(input(client, [
      { type: "write", path: "bin/tool", content: "updated" },
      { type: "delete", path: "docs/remove.md" },
      { type: "copy", sourcePath: "templates/base.md", path: "docs/copied.md" },
    ]));

    expect(client.createBlob).toHaveBeenCalledOnce();
    expect(client.createTree).toHaveBeenCalledWith({
      baseTree: baseTreeSha,
      tree: [
        { path: "bin/tool", mode: "100755", type: "blob", sha: "blob-1" },
        { path: "docs/remove.md", mode: "100644", type: "blob", sha: null },
        { path: "docs/copied.md", mode: "100644", type: "blob", sha: "source-sha" },
      ],
    });
  });

  it("returns before every write when expectedHeadSha differs", async () => {
    const client = createMockClient();
    client.getBranchHead.mockResolvedValueOnce({
      ref: "refs/heads/main",
      node_id: "ref-node",
      url: "https://api.github.test/ref",
      object: gitObject("different-head"),
    });

    const result = await commitGitFileChanges(input(client, [
      { type: "write", path: "docs/page.md", content: "content" },
    ]));

    expect(result).toEqual({
      status: "conflict",
      stage: "head-check",
      expectedHeadSha: headSha,
      actualHeadSha: "different-head",
    });
    expect(client.getCommit).not.toHaveBeenCalled();
    expect(client.createBlob).not.toHaveBeenCalled();
    expect(client.createTree).not.toHaveBeenCalled();
    expect(client.createCommit).not.toHaveBeenCalled();
    expect(client.updateRef).not.toHaveBeenCalled();
  });

  it.each([409, 422] as const)("returns a stable ref-update conflict for HTTP %s", async (status) => {
    const client = createMockClient();
    client.updateRef.mockRejectedValueOnce(new GitHubApiError("ref rejected", {
      code: "HTTP_ERROR",
      status,
      requestId: "REQUEST-ID",
    }));

    const result = await commitGitFileChanges(input(client, [
      { type: "write", path: "docs/page.md", content: "content" },
    ]));

    expect(result).toEqual({
      status: "conflict",
      stage: "ref-update",
      expectedHeadSha: headSha,
      baseHeadSha: headSha,
      commitSha: "new-commit-sha",
      treeSha: "new-tree-sha",
      changedPaths: ["docs/page.md"],
      githubStatus: status,
      requestId: "REQUEST-ID",
    });
  });

  it("rejects empty changes", async () => {
    const client = createMockClient();
    await expect(commitGitFileChanges(input(client, []))).rejects.toMatchObject({
      code: "EMPTY_CHANGES",
      path: "changes",
    });
    expect(client.getBranchHead).not.toHaveBeenCalled();
  });

  it("rejects duplicate destination paths", async () => {
    const client = createMockClient();
    await expect(commitGitFileChanges(input(client, [
      { type: "write", path: "docs/page.md", content: "first" },
      { type: "delete", path: "docs/page.md" },
    ]))).rejects.toMatchObject({ code: "DUPLICATE_PATH", path: "changes.1.path" });
    expect(client.getBranchHead).not.toHaveBeenCalled();
  });

  it.each(["/absolute.md", "../outside.md", "docs//page.md", "docs\\page.md", "docs/page.md/"])(
    "rejects invalid repository paths: %s",
    async (path) => {
      const client = createMockClient();
      await expect(commitGitFileChanges(input(client, [
        { type: "write", path, content: "content" },
      ]))).rejects.toMatchObject({ code: "INVALID_PATH", path: "changes.0.path" });
      expect(client.getBranchHead).not.toHaveBeenCalled();
    },
  );

  it.each(["createBlob", "createTree", "createCommit"] as const)(
    "does not update the ref when %s fails",
    async (method) => {
      const client = createMockClient();
      client[method].mockRejectedValueOnce(new Error(`${method} failed`));

      await expect(commitGitFileChanges(input(client, [
        { type: "write", path: "docs/page.md", content: "private file content" },
      ]))).rejects.toThrow(`${method} failed`);
      expect(client.updateRef).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing copy source without exposing file content", async () => {
    const client = createMockClient();
    let error: unknown;
    try {
      await commitGitFileChanges(input(client, [
        { type: "write", path: "private.md", content: "sensitive-content" },
        { type: "copy", sourcePath: "missing.md", path: "copy.md" },
      ]));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(GitFileCommitError);
    expect(error).toMatchObject({ code: "COPY_SOURCE_NOT_FOUND", path: "missing.md" });
    expect(String(error)).not.toContain("sensitive-content");
    expect(client.updateRef).not.toHaveBeenCalled();
  });
});
