import { GitHubApiError } from "./errors";
import { GitFileCommitError } from "./commit-errors";
import type {
  CommitGitFileChangesInput,
  CommitGitFileChangesResult,
  GitFileChange,
  GitFileMode,
} from "./commit-types";
import { validateCommitGitFileChangesInput } from "./commit-validation";
import type {
  GitHubTree,
  GitHubTreeEntry,
  GitHubTreeEntryInput,
} from "./types";

export async function commitGitFileChanges(
  input: CommitGitFileChangesInput,
): Promise<CommitGitFileChangesResult> {
  const value = validateCommitGitFileChangesInput(input);
  const head = await value.client.getBranchHead();
  const baseHeadSha = head.object.sha;

  if (baseHeadSha !== value.expectedHeadSha) {
    return {
      status: "conflict",
      stage: "head-check",
      expectedHeadSha: value.expectedHeadSha,
      actualHeadSha: baseHeadSha,
    };
  }

  const baseCommit = await value.client.getCommit(baseHeadSha);
  const baseTree = await value.client.getTree(baseCommit.tree.sha, { recursive: true });
  if (baseTree.truncated) {
    throw new GitFileCommitError("base tree is truncated", {
      code: "BASE_TREE_TRUNCATED",
      path: "changes",
    });
  }

  const writtenBlobs = new Map<string, string>();
  for (const change of value.changes) {
    if (change.type !== "write") continue;
    const blob = await value.client.createBlob({
      content: change.content,
      encoding: change.encoding ?? "utf-8",
    });
    writtenBlobs.set(change.path, blob.sha);
  }

  const entries = createTreeEntries(value.changes, baseTree, writtenBlobs);
  const newTree = await value.client.createTree({
    baseTree: baseCommit.tree.sha,
    tree: entries,
  });
  const newCommit = await value.client.createCommit({
    message: value.message,
    tree: newTree.sha,
    parents: [baseHeadSha],
    author: value.author,
  });

  try {
    await value.client.updateRef(`heads/${value.client.repository.branch}`, {
      sha: newCommit.sha,
      force: false,
    });
  } catch (error) {
    if (isRefConflict(error)) {
      return {
        status: "conflict",
        stage: "ref-update",
        expectedHeadSha: value.expectedHeadSha,
        baseHeadSha,
        commitSha: newCommit.sha,
        treeSha: newTree.sha,
        changedPaths: value.changedPaths,
        githubStatus: error.status,
        ...(error.requestId ? { requestId: error.requestId } : {}),
      };
    }
    throw error;
  }

  return {
    status: "committed",
    baseHeadSha,
    commitSha: newCommit.sha,
    treeSha: newTree.sha,
    changedPaths: value.changedPaths,
  };
}

function createTreeEntries(
  changes: readonly GitFileChange[],
  baseTree: GitHubTree,
  writtenBlobs: ReadonlyMap<string, string>,
): GitHubTreeEntryInput[] {
  const baseEntries = new Map(baseTree.tree.map((entry) => [entry.path, entry]));
  return changes.map((change) => {
    if (change.type === "write") {
      const sha = writtenBlobs.get(change.path);
      if (!sha) throw new GitFileCommitError("write blob was not created", {
        code: "INVALID_INPUT",
        path: change.path,
      });
      return {
        path: change.path,
        mode: change.mode ?? blobMode(baseEntries.get(change.path)) ?? "100644",
        type: "blob",
        sha,
      };
    }
    if (change.type === "delete") {
      return {
        path: change.path,
        mode: blobMode(baseEntries.get(change.path)) ?? "100644",
        type: "blob",
        sha: null,
      };
    }

    const source = baseEntries.get(change.sourcePath);
    if (!source || source.type !== "blob" || !source.sha) {
      throw new GitFileCommitError(`copy source for ${change.path} was not found`, {
        code: "COPY_SOURCE_NOT_FOUND",
        path: change.sourcePath,
      });
    }
    return {
      path: change.path,
      mode: change.mode ?? blobMode(source) ?? "100644",
      type: "blob",
      sha: source.sha,
    };
  });
}

function blobMode(entry: GitHubTreeEntry | undefined): GitFileMode | undefined {
  if (!entry || entry.type !== "blob") return undefined;
  return entry.mode === "100644" || entry.mode === "100755" || entry.mode === "120000"
    ? entry.mode
    : undefined;
}

function isRefConflict(error: unknown): error is GitHubApiError & { status: 409 | 422 } {
  return error instanceof GitHubApiError
    && error.code === "HTTP_ERROR"
    && (error.status === 409 || error.status === 422);
}
