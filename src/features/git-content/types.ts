export type GitHubFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface GitHubClientConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  userAgent: string;
  fetch: GitHubFetch;
}

export interface GitHubRepositoryConfig {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

export interface GitHubRepositoryInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export interface GitHubContent {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string | null;
  git_url: string | null;
  download_url: string | null;
  content?: string;
  encoding?: string;
}

export interface GitHubBlob {
  sha: string;
  url: string;
}

export interface CreateGitHubBlobInput {
  content: string;
  encoding: "utf-8" | "base64";
}

export type GitHubTreeEntryType = "blob" | "tree" | "commit";
export type GitHubTreeEntryMode = "100644" | "100755" | "040000" | "160000" | "120000";

export interface GitHubTreeEntry {
  path: string;
  mode: GitHubTreeEntryMode;
  type: GitHubTreeEntryType;
  sha: string;
  size?: number;
  url?: string;
}

export interface GitHubTreeEntryInput {
  path: string;
  mode: GitHubTreeEntryMode;
  type: GitHubTreeEntryType;
  sha?: string | null;
  content?: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface CreateGitHubTreeInput {
  baseTree?: string;
  tree: readonly GitHubTreeEntryInput[];
}

export interface GitHubGitObject {
  type: "commit" | "tree" | "blob" | "tag";
  sha: string;
  url: string;
}

export interface GitHubGitPointer {
  sha: string;
  url: string;
}

export interface GitHubSignature {
  name: string;
  email: string;
  date?: string;
}

export interface GitHubCommit {
  sha: string;
  url: string;
  message: string;
  tree: GitHubGitPointer;
  parents: GitHubGitPointer[];
  author?: GitHubSignature;
  committer?: GitHubSignature;
}

export interface CreateGitHubCommitInput {
  message: string;
  tree: string;
  parents: readonly string[];
  author?: GitHubSignature;
  committer?: GitHubSignature;
}

export interface GitHubRef {
  ref: string;
  node_id: string;
  url: string;
  object: GitHubGitObject;
}

export interface UpdateGitHubRefInput {
  sha: string;
  force?: boolean;
}

export interface GetGitHubContentOptions {
  ref?: string;
}

export interface GetGitHubTreeOptions {
  recursive?: boolean;
}

export interface GitHubClient {
  readonly repository: GitHubRepositoryConfig;
  getRepository(): Promise<GitHubRepositoryInfo>;
  getBranchHead(): Promise<GitHubRef>;
  getContent(path: string, options?: GetGitHubContentOptions): Promise<GitHubContent | GitHubContent[]>;
  createBlob(input: CreateGitHubBlobInput): Promise<GitHubBlob>;
  getTree(sha: string, options?: GetGitHubTreeOptions): Promise<GitHubTree>;
  createTree(input: CreateGitHubTreeInput): Promise<GitHubTree>;
  getCommit(sha: string): Promise<GitHubCommit>;
  createCommit(input: CreateGitHubCommitInput): Promise<GitHubCommit>;
  getRef(ref: string): Promise<GitHubRef>;
  updateRef(ref: string, input: UpdateGitHubRefInput): Promise<GitHubRef>;
}

export type GitHubApiErrorCode =
  | "CONFIG_INVALID"
  | "INPUT_INVALID"
  | "REQUEST_FAILED"
  | "HTTP_ERROR"
  | "RESPONSE_INVALID";

export interface GitHubRateLimitDiagnostics {
  readonly limit?: number;
  readonly remaining?: number;
  readonly used?: number;
  readonly reset?: number;
  readonly resource?: string;
  readonly retryAfter?: number;
}

export interface GitHubApiErrorOptions {
  code: GitHubApiErrorCode;
  status?: number;
  githubMessage?: string;
  documentationUrl?: string;
  requestId?: string;
  rateLimit?: GitHubRateLimitDiagnostics;
  method?: string;
  url?: string;
  path?: string;
  details?: readonly string[];
}
