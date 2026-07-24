# GitHub Content Client 公開API

- 状態: 実装済み（package公開subpathは未確定）
- 対象: `docs/extraction-plan.md`のA-07、A-08
- 実装日: 2026-07-25

## 目的

GitHub REST APIのRepository、Contents、Git Database操作を、特定runtimeや派生プロジェクトのDomainに依存しないclientとして提供する。低レベルclientに加え、汎用的なfile変更集合を同一CommitへまとめるA-08の高レベルoperationを提供する。

## 公開境界

現時点の公開境界は`src/features/git-content/index.ts`とする。

```ts
export function createGitHubClient(
  config: GitHubClientConfig,
): GitHubClient;

export function commitGitFileChanges(
  input: CommitGitFileChangesInput,
): Promise<CommitGitFileChangesResult>;

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

HTTP request、response bodyのparse、header診断、secret除去を行うhelperは`src/internal/github-api`の共有内部実装とし、`index.ts`から公開しない。派生側はraw pathを組み立てず、`GitHubClient`の各methodを使う。この内部実装はA-09の`deploy-status`でも利用するが、Actions API自体は`git-content`へ追加しない。

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

## A-08: 同一Commit保存

`commitGitFileChanges`は既存`GitHubClient`だけを利用し、raw HTTP requestや低レベルGitHub API処理を重複実装しない。

```ts
interface CommitGitFileChangesInput {
  client: GitHubClient;
  expectedHeadSha: string;
  message: string;
  author: GitHubSignature;
  changes: readonly GitFileChange[];
}

type GitFileChange =
  | { type: "write"; path: string; content: string; encoding?: "utf-8" | "base64"; mode?: GitFileMode }
  | { type: "delete"; path: string }
  | { type: "copy"; sourcePath: string; path: string; mode?: GitFileMode };
```

commit messageとauthorは呼び出し側が決定する。operationはfile内容、path、変更理由からmessageやauthorを推測しない。

### 実行順序

1. branch headを取得する
2. head SHAと`expectedHeadSha`を比較する
3. base commitとrecursive base treeを取得する
4. writeごとにblobを作成する
5. copy元をbase treeから解決する
6. write、delete、copyを1つのtreeへまとめる
7. base headをparentとするcommitを1つ作成する
8. `force: false`でbranch refを更新する

expected SHA不一致では手順2で`head-check` conflictを返し、commit、tree、blob、refの書込methodを呼ばない。

### 変更規則

- writeは新しいblobを作成する
- deleteはtree entryの`sha: null`として表現する
- copyは基準commitのrecursive treeからsource blob SHAを解決し、新しいblobを作らず再利用する
- copy元は同じ変更集合によるwrite後ではなく、常に基準commitから解決する
- 変更先pathの入力順をtree entryと結果の`changedPaths`へ維持する
- 空変更、同一変更先pathの重複、absolute path、空segment、`.`、`..`、backslash、制御文字を含むpathを拒否する
- recursive treeがtruncatedの場合は安全にcopy元を解決できないため失敗する

### 結果と競合

成功時は次を返す。

```ts
interface CommittedGitFileChangesResult {
  status: "committed";
  baseHeadSha: string;
  commitSha: string;
  treeSha: string;
  changedPaths: readonly string[];
}
```

競合はthrowせず、`status: "conflict"`のunionとして返す。

- `stage: "head-check"`: 書込開始前のexpected SHA不一致。expectedとactual SHAを保持する
- `stage: "ref-update"`: non-force ref更新がGitHubの409または422で拒否された状態。base、作成済みcommit/tree、変更path、GitHub status、任意のrequest IDを保持する

blob、tree、commitなどの通常のGitHub API失敗は既存`GitHubApiError`をそのまま伝播する。入力とbase tree条件の失敗は`GitFileCommitError`で表す。error messageへtokenまたはfile contentを含めない。

### Branch状態の境界

branchを変更する操作は最後の`updateRef`だけである。blob、tree、commitの作成途中で失敗してもrefは更新されず、branch headは変わらない。ref更新競合時には到達不能なGit objectが作成済みの場合があるが、branchから参照されない。ref更新のtransport失敗は更新成否を断定できないため、競合へ変換せず元の`GitHubApiError`を伝播する。

HTTP responseへの変換、競合時のUI文言、retry、commit message policyは派生側adapterの責務とする。

## テスト

- `tests/git-content/client.test.ts`: 設定、header、URL、request body、全低レベル操作、入力検証
- `tests/git-content/errors.test.ts`: JSON、非JSON、空body、network失敗、request ID、rate limit、secret除去
- `tests/git-content/public-api.test.ts`: runtime export、公開型、内部request helperの非公開
- `tests/git-content/commit-changes.test.ts`: write/delete/copy、head/ref競合、入力検証、途中失敗、non-force ref更新、成功結果

mock fetchだけを使用し、GitHubへの実通信は行わない。完了確認は`npm run check`、`npm run test`、`npm run build`で行う。
