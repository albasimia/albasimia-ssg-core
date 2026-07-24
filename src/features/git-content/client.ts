import { requiredInputText, resolveGitHubClientConfig } from "./config.js";
import { GitHubApiError } from "./errors.js";
import { createGitHubRequester } from "./request.js";
import type {
  CreateGitHubBlobInput,
  CreateGitHubCommitInput,
  CreateGitHubTreeInput,
  GetGitHubContentOptions,
  GetGitHubTreeOptions,
  GitHubBlob,
  GitHubClient,
  GitHubClientConfig,
  GitHubCommit,
  GitHubContent,
  GitHubRef,
  GitHubRepositoryInfo,
  GitHubTree,
  UpdateGitHubRefInput,
} from "./types.js";

export function createGitHubClient(input: GitHubClientConfig): GitHubClient {
  const config = resolveGitHubClientConfig(input);
  const requester = createGitHubRequester(config);

  return {
    repository: config.repository,

    getRepository(): Promise<GitHubRepositoryInfo> {
      return requester.request("");
    },

    getBranchHead(): Promise<GitHubRef> {
      return requester.request(`/git/ref/${encodePath(`heads/${config.repository.branch}`)}`);
    },

    getContent(
      path: string,
      options: GetGitHubContentOptions = {},
    ): Promise<GitHubContent | GitHubContent[]> {
      const contentPath = encodeContentPath(path);
      const ref = requiredInputText(options.ref ?? config.repository.branch, "ref");
      return requester.request(`/contents${contentPath ? `/${contentPath}` : ""}?ref=${encodeURIComponent(ref)}`);
    },

    createBlob(blob: CreateGitHubBlobInput): Promise<GitHubBlob> {
      if (typeof blob.content !== "string" || (blob.encoding !== "utf-8" && blob.encoding !== "base64")) {
        throw invalidInput("blob");
      }
      return requester.request("/git/blobs", post(blob));
    },

    getTree(sha: string, options: GetGitHubTreeOptions = {}): Promise<GitHubTree> {
      const suffix = options.recursive ? "?recursive=1" : "";
      return requester.request(`/git/trees/${encodeURIComponent(requiredInputText(sha, "sha"))}${suffix}`);
    },

    createTree(tree: CreateGitHubTreeInput): Promise<GitHubTree> {
      return requester.request("/git/trees", post({
        ...(tree.baseTree === undefined ? {} : { base_tree: requiredInputText(tree.baseTree, "baseTree") }),
        tree: tree.tree,
      }));
    },

    getCommit(sha: string): Promise<GitHubCommit> {
      return requester.request(`/git/commits/${encodeURIComponent(requiredInputText(sha, "sha"))}`);
    },

    createCommit(commit: CreateGitHubCommitInput): Promise<GitHubCommit> {
      return requester.request("/git/commits", post({
        ...commit,
        message: requiredInputText(commit.message, "message"),
        tree: requiredInputText(commit.tree, "tree"),
        parents: requireStringArray(commit.parents, "parents"),
      }));
    },

    getRef(ref: string): Promise<GitHubRef> {
      return requester.request(`/git/ref/${encodePath(requiredInputText(ref, "ref"))}`);
    },

    updateRef(ref: string, update: UpdateGitHubRefInput): Promise<GitHubRef> {
      return requester.request(`/git/refs/${encodePath(requiredInputText(ref, "ref"))}`, {
        method: "PATCH",
        body: JSON.stringify({
          sha: requiredInputText(update.sha, "sha"),
          force: update.force ?? false,
        }),
      });
    },
  };
}

function post(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

function encodeContentPath(path: string): string {
  if (path === "") return "";
  const value = requiredInputText(path, "path");
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw invalidInput("path");
  }
  return segments.map(encodeURIComponent).join("/");
}

function encodePath(path: string): string {
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw invalidInput("ref");
  }
  return segments.map(encodeURIComponent).join("/");
}

function requireStringArray(value: readonly string[], path: string): string[] {
  if (!Array.isArray(value)) throw invalidInput(path);
  return value.map((item, index) => requiredInputText(item, `${path}.${index}`));
}

function invalidInput(path: string): GitHubApiError {
  return new GitHubApiError(`${path} is invalid`, {
    code: "INPUT_INVALID",
    path,
  });
}
