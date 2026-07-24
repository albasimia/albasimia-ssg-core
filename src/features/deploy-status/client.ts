import { GitHubApiError } from "../../internal/github-api/errors";
import { createGitHubApiRequester } from "../../internal/github-api/request";
import type {
  DeploymentRun,
  DeploymentRunConclusion,
  DeploymentRunStatus,
  DeploymentStatusClient,
  DeploymentStatusClientConfig,
  GetDeploymentRunForCommitOptions,
  ListDeploymentRunsOptions,
} from "./types";

const API_ROOT = "https://api.github.com";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface GitHubWorkflowRunsResponse {
  workflow_runs?: unknown;
}

interface GitHubWorkflowRun {
  id?: unknown;
  status?: unknown;
  conclusion?: unknown;
  workflow_url?: unknown;
  html_url?: unknown;
  head_sha?: unknown;
  head_branch?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  run_number?: unknown;
}

export function createDeploymentStatusClient(
  input: DeploymentStatusClientConfig,
): DeploymentStatusClient {
  const owner = requiredText(input.owner, "owner", "CONFIG_INVALID");
  const repo = requiredText(input.repo, "repo", "CONFIG_INVALID");
  const token = requiredText(input.token, "token", "CONFIG_INVALID");
  const userAgent = requiredText(input.userAgent, "userAgent", "CONFIG_INVALID");
  if (owner.includes("/") || repo.includes("/")) throw invalid("CONFIG_INVALID", owner.includes("/") ? "owner" : "repo");
  if (typeof input.fetch !== "function") throw invalid("CONFIG_INVALID", "fetch");
  const workflow = validateWorkflow(input.workflow);
  const requester = createGitHubApiRequester({
    baseUrl: `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
    userAgent,
    fetch: input.fetch,
  });

  async function listDeploymentRuns(
    options: ListDeploymentRunsOptions = {},
  ): Promise<DeploymentRun[]> {
    const query = new URLSearchParams();
    if (options.branch !== undefined) query.set("branch", requiredText(options.branch, "branch", "INPUT_INVALID"));
    if (options.commitSha !== undefined) query.set("head_sha", requiredText(options.commitSha, "commitSha", "INPUT_INVALID"));
    query.set("per_page", String(validateLimit(options.limit)));

    const response = await requester.request<GitHubWorkflowRunsResponse>(
      `/actions/workflows/${encodeURIComponent(String(workflow))}/runs?${query.toString()}`,
    );
    if (!Array.isArray(response.workflow_runs)) throw invalidResponse("workflow_runs");
    return response.workflow_runs.map((run, index) => normalizeRun(run, index));
  }

  return {
    repository: { owner, repo, workflow },
    listDeploymentRuns,
    async getDeploymentRunForCommit(
      commitSha: string,
      options: GetDeploymentRunForCommitOptions = {},
    ): Promise<DeploymentRun | null> {
      const sha = requiredText(commitSha, "commitSha", "INPUT_INVALID");
      const runs = await listDeploymentRuns({
        ...options,
        commitSha: sha,
      });
      return runs.find((run) => run.commitSha === sha) ?? null;
    },
  };
}

function normalizeRun(value: unknown, index: number): DeploymentRun {
  if (!isRecord(value)) throw invalidResponse(`workflow_runs.${index}`);
  const run = value as GitHubWorkflowRun;
  const normalizedStatus = normalizeStatus(run.status);
  const normalizedConclusion = normalizeConclusion(run.conclusion);
  return {
    id: requiredNumber(run.id, `workflow_runs.${index}.id`),
    status: normalizedStatus.value,
    conclusion: normalizedConclusion.value,
    ...(normalizedStatus.unknown ? { unknownStatus: normalizedStatus.unknown } : {}),
    ...(normalizedConclusion.unknown ? { unknownConclusion: normalizedConclusion.unknown } : {}),
    workflowUrl: requiredText(run.workflow_url, `workflow_runs.${index}.workflow_url`, "RESPONSE_INVALID"),
    runUrl: requiredText(run.html_url, `workflow_runs.${index}.html_url`, "RESPONSE_INVALID"),
    commitSha: requiredText(run.head_sha, `workflow_runs.${index}.head_sha`, "RESPONSE_INVALID"),
    branch: run.head_branch === null ? null : requiredText(run.head_branch, `workflow_runs.${index}.head_branch`, "RESPONSE_INVALID"),
    createdAt: requiredText(run.created_at, `workflow_runs.${index}.created_at`, "RESPONSE_INVALID"),
    updatedAt: requiredText(run.updated_at, `workflow_runs.${index}.updated_at`, "RESPONSE_INVALID"),
    runNumber: requiredNumber(run.run_number, `workflow_runs.${index}.run_number`),
  };
}

function normalizeStatus(value: unknown): { value: DeploymentRunStatus; unknown?: string } {
  if (value === "queued" || value === "requested" || value === "waiting" || value === "pending") {
    return { value: "queued" };
  }
  if (value === "in_progress") return { value: "in_progress" };
  if (value === "completed") return { value: "completed" };
  return {
    value: "unknown",
    ...(typeof value === "string" ? { unknown: value } : {}),
  };
}

function normalizeConclusion(value: unknown): { value: DeploymentRunConclusion; unknown?: string } {
  if (value === null || value === undefined) return { value: null };
  if (
    value === "success"
    || value === "failure"
    || value === "cancelled"
    || value === "skipped"
    || value === "timed_out"
    || value === "action_required"
    || value === "neutral"
    || value === "stale"
    || value === "startup_failure"
  ) {
    return { value };
  }
  return {
    value: "unknown",
    ...(typeof value === "string" ? { unknown: value } : {}),
  };
}

function validateWorkflow(value: unknown): string | number {
  if (typeof value === "number") {
    if (Number.isSafeInteger(value) && value > 0) return value;
    throw invalid("CONFIG_INVALID", "workflow");
  }
  return requiredText(value, "workflow", "CONFIG_INVALID");
}

function validateLimit(value: number | undefined): number {
  const limit = value ?? DEFAULT_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw invalid("INPUT_INVALID", "limit");
  }
  return limit;
}

function requiredText(
  value: unknown,
  path: string,
  code: "CONFIG_INVALID" | "INPUT_INVALID" | "RESPONSE_INVALID",
): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalid(code, path);
  }
  return value.trim();
}

function requiredNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw invalidResponse(path);
  return value;
}

function invalid(
  code: "CONFIG_INVALID" | "INPUT_INVALID" | "RESPONSE_INVALID",
  path: string,
): GitHubApiError {
  return new GitHubApiError(`${path} is invalid`, { code, path });
}

function invalidResponse(path: string): GitHubApiError {
  return new GitHubApiError("GitHub Actions API returned an invalid response", {
    code: "RESPONSE_INVALID",
    path,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
