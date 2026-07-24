# GitHub Content Client 公開API

- 状態: 実装済み（package公開subpathは未確定）
- 対象: `docs/extraction-plan.md`のA-07のみ
- 実装日: 2026-07-25

## 目的

GitHub REST APIのRepository、Contents、Git Database操作を、特定runtimeや派生プロジェクトのDomainに依存しないclientとして提供する。A-08が利用する低レベルGit操作までを対象とし、複数変更を同一Commitへまとめる手順、競合判定、commit message生成は扱わない。

## 公開境界

現時点の公開境界は`src/features/git-content/index.ts`とする。

```ts
export function createGitHubClient(
  config: GitHubClientConfig,
): GitHubClient;

export class GitHubApiError extends Error {
  readonly code: GitHubApiErrorCode;
  readonly status?: number;
  readonly githubMessage?: string;
  readonly documentationUrl?: string;
  readonly requestId?: string;
  readonly rateLimit?: GitHubRateLimitDiagnostics;
  readonly method?: string;
  readonly url?: string;
  readonly path?: string;
  readonly details: readonly string[];
}
```

HTTP request、response bodyのparse、header診断、secret除去を行うhelperは内部実装とし、`index.ts`から公開しない。派生側はraw pathを組み立てず、`GitHubClient`の各methodを使う。

## 設定

```ts
interface GitHubClientConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  userAgent: string;
  fetch: GitHubFetch;
}
```

- owner、repo、branch、token、User-Agentを呼び出し側から受け取る
- global `fetch`を参照せず、Web Fetch互換実装を必須で注入する
- clientが公開する`repository`にはowner、repo、branchだけを保持し、tokenを露出しない
- Node.js、Cloudflare Pages Functions、browser固有の型、環境変数、storage APIを参照しない
- GitHub REST API versionは内部で`2022-11-28`を指定する

## 操作

| 公開method | GitHub REST API |
| --- | --- |
| `getRepository()` | repository情報取得 |
| `getBranchHead()` | 設定branchのref取得 |
| `getContent(path, options?)` | Contents APIによるfileまたはdirectory取得 |
| `createBlob(input)` | blob作成 |
| `getTree(sha, options?)` | tree取得、任意のrecursive指定 |
| `createTree(input)` | base treeとentry集合からtree作成 |
| `getCommit(sha)` | Git commit取得 |
| `createCommit(input)` | treeとparentからGit commit作成 |
| `getRef(ref)` | ref取得 |
| `updateRef(ref, input)` | ref更新、既定は`force: false` |

これらはGitHub公式の[Repository Contents API](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)と[Git Database API](https://docs.github.com/en/rest/git?apiVersion=2022-11-28)に対応する低レベル操作である。

## requestとerror

すべてのrequestへ次を付与する。

- `Accept: application/vnd.github+json`
- `Authorization: Bearer ...`
- 設定された`User-Agent`
- `X-GitHub-Api-Version: 2022-11-28`
- body付きrequestの`Content-Type: application/json`

非2xx response、network失敗、成功responseの不正JSONはすべて`GitHubApiError`へ正規化する。HTTP `Response`やfetch固有errorをthrowしない。

### Error code

- `CONFIG_INVALID`: client設定が不正
- `INPUT_INVALID`: 公開methodの入力が不正
- `REQUEST_FAILED`: response受信前の失敗
- `HTTP_ERROR`: GitHubから非2xx responseを受信
- `RESPONSE_INVALID`: 成功responseが空または不正JSON

JSON error bodyでは`message`、`documentation_url`、`errors`を診断情報へ保存する。JSON以外のbodyは短いGitHub messageとして保持し、空bodyでも安全にerrorを生成する。

`x-github-request-id`に加え、GitHubが案内するrate limit headerを保持する。

- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-used`
- `x-ratelimit-reset`
- `x-ratelimit-resource`
- `retry-after`

rate limitの判断と再試行は呼び出し側の責務とし、clientは暗黙にretryしない。GitHub公式もrate limit状態の確認にはresponse headerの利用を案内している。[GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

## Secret方針

- tokenとAuthorization headerをclientの公開プロパティ、error message、details、logへ出力しない
- clientはloggingを行わない
- transport errorのcauseやrequest objectを公開errorへ保持しない
- GitHub error bodyにtoken文字列が含まれた場合も`[REDACTED]`へ置換する
- 診断文字列は過大なbodyを保持しないよう長さを制限する

## A-08との境界

A-07はblob、tree、commit、refの個別操作だけを提供する。次はA-08で実装する。

- 複数file変更の集約
- branch headを基準にした競合検知
- blob群、tree、commit、ref更新の一連の手順
- non-force更新失敗の結果型
- commit authorとmessageのpolicy
- write、delete、copyなどの変更集合

## テスト

- `tests/git-content/client.test.ts`: 設定、header、URL、request body、全低レベル操作、入力検証
- `tests/git-content/errors.test.ts`: JSON、非JSON、空body、network失敗、request ID、rate limit、secret除去
- `tests/git-content/public-api.test.ts`: runtime export、公開型、内部request helperの非公開

mock fetchだけを使用し、GitHubへの実通信は行わない。完了確認は`npm run check`、`npm run test`、`npm run build`で行う。
