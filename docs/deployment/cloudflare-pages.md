# Cloudflare Pagesデプロイ雛形

## 位置づけ

`templates/deployment/cloudflare-pages/`は、派生プロジェクトがコピーして利用するGitHub ActionsとWrangler設定の雛形である。ASCの公開TypeScript APIではなく、ASC本体のSite、Content、UI、GitOps featureから参照しない。

Cloudflare PagesのDirect Uploadを最初の標準対象とし、実行には公式の[`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action)を使う。ASC自身から実際のデプロイは行わない。

## 導入

1. Cloudflare PagesでDirect Upload対象のprojectを作成し、production branchを決める。
2. `templates/deployment/cloudflare-pages/cloudflare-pages.yml`を派生プロジェクトの`.github/workflows/`へコピーする。workflowのファイル名は任意であり、`deploy.yml`へ固定しない。
3. workflow内の`<PRODUCTION_BRANCH>`を、Cloudflare Pages側に設定したproduction branch名へ置き換える。
4. `templates/deployment/cloudflare-pages/wrangler.jsonc`を派生プロジェクトのrootへコピーし、2つのplaceholderを置き換える。
5. GitHub repositoryのSecretsとVariablesを次節のとおり設定する。

`BUILD_OUTPUT_DIRECTORY`を変更する場合は、GitHub Variableと`wrangler.jsonc`の`pages_build_output_dir`を同じ値にする。Variableを省略したworkflowの既定値は`dist`である。

## GitHubの設定値

| 種別 | 名前 | 必須 | 内容 |
| --- | --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 必須 | 対象accountへ限定し、`Account / Cloudflare Pages / Edit`権限を付与したAPI token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 必須 | 対象Cloudflare accountのID |
| Secret | `GITHUB_TOKEN` | 自動 | GitHub Actionsがjobごとに発行するtoken。手動登録しない |
| Variable | `CLOUDFLARE_PAGES_PROJECT_NAME` | 必須 | 作成済みPages project名 |
| Variable | `BUILD_OUTPUT_DIRECTORY` | 任意 | `npm run build`の出力directory。未設定時は`dist` |

workflowの`GITHUB_TOKEN`権限は`contents: read`と`deployments: write`に限定する。Cloudflare API tokenにはaccount全体の追加権限を与えず、可能なら対象accountへresourceを限定する。Secretsをworkflow本文、Wrangler設定、repositoryへ実値でcommitしない。

## PreviewとProduction

雛形はbranchを基準に次のように扱う。

- `<PRODUCTION_BRANCH>`へのpushは、Cloudflare Pagesのproduction branchへのdeploymentとする。
- pull requestはsource branch名を`--branch`へ渡し、preview deploymentとする。
- forkからのpull requestはSecretsを渡さず、`npm ci`、check、test、buildだけを実行してdeploymentをskipする。
- production branch以外への通常pushもpreview対象にする場合は、`on.push.branches`の条件を派生プロジェクト側で追加する。
- 手動実行は選択したbranch名を渡す。そのbranchがCloudflare側のproduction branchと一致する場合だけproductionになる。

Cloudflare Pages側のproduction branch設定とworkflowの`<PRODUCTION_BRANCH>`は必ず一致させる。承認者やenvironment別Secretsが必要なprojectでは、GitHub Environmentsに`production`と`preview`を作り、派生側workflowでjobを分けてenvironmentを割り当てる。この雛形は小規模project向けにrepository Secretsを既定とする。

## 雛形の検証範囲

ASCではworkflow YAMLのparse、Wrangler JSONのparse、必須command、placeholder、Secret参照を自動テストする。Cloudflare credentialsを設定せず、実際のdeploymentは検証対象にしない。

Cloudflare PagesのDirect Uploadと必要権限の詳細は、Cloudflare公式の[Git integrationを使わないCI設定](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)および[API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)を参照する。
