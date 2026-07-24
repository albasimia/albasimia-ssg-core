import { describe, expect, expectTypeOf, it } from "vitest";
import * as deployStatus from "../../src/features/deploy-status";
import type {
  DeploymentRun,
  DeploymentRunConclusion,
  DeploymentRunStatus,
  DeploymentStatusClient,
  DeploymentStatusClientConfig,
} from "../../src/features/deploy-status";

describe("deploy-status public API", () => {
  it("exports only the client factory and shared error at runtime", () => {
    expect(Object.keys(deployStatus).sort()).toEqual([
      "GitHubApiError",
      "createDeploymentStatusClient",
    ]);
    expect(deployStatus).not.toHaveProperty("createGitHubApiRequester");
  });

  it("exports stable deployment contracts", () => {
    expectTypeOf<DeploymentStatusClientConfig>().toHaveProperty("workflow");
    expectTypeOf<DeploymentStatusClient>().toHaveProperty("getDeploymentRunForCommit");
    expectTypeOf<DeploymentRun>().toHaveProperty("runUrl");
    expectTypeOf<DeploymentRunStatus>().toEqualTypeOf<"queued" | "in_progress" | "completed" | "unknown">();
    expectTypeOf<DeploymentRunConclusion>().toEqualTypeOf<
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
      | null
    >();
  });
});
