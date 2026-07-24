import type { GitHubApiErrorCode, GitHubRateLimitDiagnostics } from "../../internal/github-api/types";

export type DeploymentStatusFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type DeploymentWorkflow = string | number;

export interface DeploymentStatusClientConfig {
  owner: string;
  repo: string;
  token: string;
  userAgent: string;
  fetch: DeploymentStatusFetch;
  workflow: DeploymentWorkflow;
}

export interface DeploymentStatusRepository {
  readonly owner: string;
  readonly repo: string;
  readonly workflow: DeploymentWorkflow;
}

export type DeploymentRunStatus = "queued" | "in_progress" | "completed" | "unknown";

export type DeploymentRunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "neutral"
  | "stale"
  | "startup_failure"
  | "unknown"
  | null;

export interface DeploymentRun {
  readonly id: number;
  readonly status: DeploymentRunStatus;
  readonly conclusion: DeploymentRunConclusion;
  readonly unknownStatus?: string;
  readonly unknownConclusion?: string;
  readonly workflowUrl: string;
  readonly runUrl: string;
  readonly commitSha: string;
  readonly branch: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly runNumber: number;
}

export interface ListDeploymentRunsOptions {
  branch?: string;
  commitSha?: string;
  limit?: number;
}

export interface GetDeploymentRunForCommitOptions {
  branch?: string;
  limit?: number;
}

export interface DeploymentStatusClient {
  readonly repository: DeploymentStatusRepository;
  listDeploymentRuns(options?: ListDeploymentRunsOptions): Promise<DeploymentRun[]>;
  getDeploymentRunForCommit(
    commitSha: string,
    options?: GetDeploymentRunForCommitOptions,
  ): Promise<DeploymentRun | null>;
}

export type DeploymentStatusErrorCode = GitHubApiErrorCode;
export type DeploymentRateLimitDiagnostics = GitHubRateLimitDiagnostics;
