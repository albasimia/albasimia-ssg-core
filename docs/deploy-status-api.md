# Deployment Status 公開API

- 状態: 実装済み（`albasimia-ssg-core/deploy-status`）
- 対象: `docs/extraction-plan.md`のA-09
- 実装日: 2026-07-25

## 目的

GitHub Actions workflow runsを、特定のworkflow、branch、commit SHAに基づいて取得し、GitHub raw responseに依存しない共通`DeploymentRun`へ変換する。polling、retry、UI、HTTP response変換、hosting provider固有処理は扱わない。

## 公開API

source上の公開境界は`src/features/deploy-status/index.ts`、package公開subpathは`albasimia-ssg-core/deploy-status`とする。

```ts
export function createDeploymentStatusClient(
  config: DeploymentStatusClientConfig,
): DeploymentStatusClient;

interface DeploymentStatusClient {
  listDeploymentRuns(
    options?: ListDeploymentRunsOptions,
  ): Promise<DeploymentRun[]>;

  getDeploymentRunForCommit(
    commitSha: string,
    options?: GetDeploymentRunForCommitOptions,
  ): Promise<DeploymentRun | null>;
}
```

`deploy-status`は`git-content`と別featureとし、Actions APIをrepository content操作へ混在させない。

## 設定

```ts
interface DeploymentStatusClientConfig {
  owner: string;
  repo: string;
  token: string;
  userAgent: string;
  fetch: DeploymentStatusFetch;
  workflow: string | number;
}
```

- workflow file名または正のworkflow IDを受け付ける
- global fetchを参照せず、Web Fetch互換実装を必須注入する
- tokenをclientの公開`repository`、error、logへ露出しない
- workflow名、branch、取得件数の既定値へ特定projectの値を組み込まない

## 取得条件

`listDeploymentRuns`は次をGitHub Actions APIのqueryへ変換する。

- `branch` → `branch`
- `commitSha` → `head_sha`
- `limit` → `per_page`

`limit`の既定値は20、範囲は1からGitHub API上限の100とする。clientは1ページを取得し、自動paginationは行わない。

`getDeploymentRunForCommit`は`head_sha` filterを使い、応答内でSHAが一致する最初のrunを返す。該当runがなければ`null`を返す。

endpointとqueryはGitHub公式の[Workflow Runs REST API](https://docs.github.com/en/rest/actions/workflow-runs)に従う。

## DeploymentRun

```ts
interface DeploymentRun {
  id: number;
  status: "queued" | "in_progress" | "completed" | "unknown";
  conclusion: DeploymentRunConclusion;
  unknownStatus?: string;
  unknownConclusion?: string;
  workflowUrl: string;
  runUrl: string;
  commitSha: string;
  branch: string | null;
  createdAt: string;
  updatedAt: string;
  runNumber: number;
}
```

### Status正規化

- `queued`、`requested`、`waiting`、`pending` → `queued`
- `in_progress` → `in_progress`
- `completed` → `completed`
- その他 → `unknown`。文字列値は`unknownStatus`へ保持する

### Conclusion正規化

次を安定した共通値として保持する。

- `success`
- `failure`
- `cancelled`
- `skipped`
- `timed_out`
- `action_required`
- `neutral`
- `stale`
- `startup_failure`
- 未確定時の`null`

その他は`unknown`とし、文字列値を`unknownConclusion`へ保持する。既知のGitHub raw status/conclusionは公開結果へそのまま流さない。

## 共通GitHub request

GitHub request、API version header、JSON/non-JSON/empty body処理、request ID、rate limit、secret除去は`src/internal/github-api`の非公開実装を`git-content`と共有する。

- shared internalは各featureの`index.ts`からexportしない
- `git-content`の公開APIと低レベルGit操作は変更しない
- `GitHubApiError`は両featureで同じclassを再exportする
- retry、polling、HTTP `Response`への変換を行わない

## 対象外

- workflow実行、再実行、cancel
- retryとpolling
- deployment UI
- hosting provider固有の状態
- 管理API route
- workflow file名の固定

## テスト

- `tests/deploy-status/client.test.ts`: workflow指定、branch、commit SHA、per-page件数、status/conclusion、未知値、該当なし
- `tests/deploy-status/errors.test.ts`: API error、JSON以外、空body、rate limit、request ID、secret除去
- `tests/deploy-status/public-api.test.ts`: 公開関数・型とshared internalの非公開
- 既存`tests/git-content/`を継続実行し、shared internal抽出後の互換性を確認する

完了確認は`npm run check`、`npm run test`、`npm run build`で行う。
