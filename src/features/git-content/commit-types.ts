import type {
  GitHubClient,
  GitHubSignature,
  GitHubTreeEntryMode,
} from "./types";

export type GitFileMode = Extract<GitHubTreeEntryMode, "100644" | "100755" | "120000">;

export interface GitFileWriteChange {
  type: "write";
  path: string;
  content: string;
  encoding?: "utf-8" | "base64";
  mode?: GitFileMode;
}

export interface GitFileDeleteChange {
  type: "delete";
  path: string;
}

export interface GitFileCopyChange {
  type: "copy";
  sourcePath: string;
  path: string;
  mode?: GitFileMode;
}

export type GitFileChange =
  | GitFileWriteChange
  | GitFileDeleteChange
  | GitFileCopyChange;

export interface CommitGitFileChangesInput {
  client: GitHubClient;
  expectedHeadSha: string;
  message: string;
  author: GitHubSignature;
  changes: readonly GitFileChange[];
}

export interface CommittedGitFileChangesResult {
  readonly status: "committed";
  readonly baseHeadSha: string;
  readonly commitSha: string;
  readonly treeSha: string;
  readonly changedPaths: readonly string[];
}

export interface GitHeadConflictResult {
  readonly status: "conflict";
  readonly stage: "head-check";
  readonly expectedHeadSha: string;
  readonly actualHeadSha: string;
}

export interface GitRefUpdateConflictResult {
  readonly status: "conflict";
  readonly stage: "ref-update";
  readonly expectedHeadSha: string;
  readonly baseHeadSha: string;
  readonly commitSha: string;
  readonly treeSha: string;
  readonly changedPaths: readonly string[];
  readonly githubStatus: 409 | 422;
  readonly requestId?: string;
}

export type GitFileCommitConflict =
  | GitHeadConflictResult
  | GitRefUpdateConflictResult;

export type CommitGitFileChangesResult =
  | CommittedGitFileChangesResult
  | GitFileCommitConflict;

export type GitFileCommitErrorCode =
  | "EMPTY_CHANGES"
  | "DUPLICATE_PATH"
  | "INVALID_PATH"
  | "INVALID_INPUT"
  | "BASE_TREE_TRUNCATED"
  | "COPY_SOURCE_NOT_FOUND";

export interface GitFileCommitErrorOptions {
  code: GitFileCommitErrorCode;
  path?: string;
  details?: readonly string[];
}
