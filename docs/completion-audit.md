# A-01〜A-10 完成度監査

- 監査日: 2026-07-25
- 対象version: `0.1.0`
- 対象範囲: README、設計文書、ADR、A-01〜A-10、source、layout、style、template、test、package設定、Astro設定、CI、公開予定API
- 監査方針: この文書では現状を評価するだけとし、新featureの実装や既存実装の変更は行わない

## 総合判定

A-01〜A-10は、ASC repository内の機能実装、単体・統合テスト、個別設計文書という範囲では概ね完了している。A-01〜A-04a、A-07〜A-10は要求された責務を確認でき、A-05とA-06もASC内の実装とテストは完了している。

ただし、現状は「source repositoryとして実装済み」であり、「派生プロジェクトがnpm packageとして導入できるv0.1」には達していない。`package.json`にentrypoint、`exports`、型定義、配布対象がなく、公開APIテストもpackage経由ではなく`src/features/*`を直接importしている。`npm pack --dry-run`ではsource、internal、sample site、tests、CI、全設計文書を含む102 entryが配布候補になった。

したがって総合判定は次のとおりとする。

- A-01〜A-10の機能完成度: **完了。ただしA-05/A-06の派生project consumer確認は未確認**
- 設計と実装の一致: **概ね一致。一部の古い記述と責務表現を修正する必要あり**
- npm packageとしてのv0.1: **未完成**
- v0.1 release可否: **必須修正完了まで不可**

## A-01〜A-10 完了確認

| ID | 実装 | テスト | 文書 | 判定 | 監査所見 |
| --- | --- | --- | --- | --- | --- |
| A-01 | `features/site-meta`、`BaseLayout.astro`、`config/site.ts` | 純粋関数、公開runtime API、static build | `site-foundation-api-plan.md` | 完了 | `SiteConfig`、title、favicon、theme-color、verificationを確認。packageからのLayout公開方法は未確定 |
| A-02 | canonical、robots、OGP、Twitter、JSON-LD resolverとhead出力 | 各純粋関数、resolver、build HTML | `site-foundation-api-plan.md` | 完了 | `ResolvedPageMeta`とresolverはfeature indexから非公開。package exportsでの強制は未実装 |
| A-03 | `createSitemapXml`とAstro endpoint adapter | XML、escape、URL検証、重複、build | `sitemap-api.md` | 完了 | URL収集はsample adapter側に分離され、trailing slashも維持 |
| A-04a | `_theme.scss`、`global.scss` | Sass compile、token、dark media、JS非依存 | `theme-contract.md` | 完了 | CSS契約は明記済み。配布するCSS artifactは未定義 |
| A-05 | YAML parse / serialize | YAML 1.2、重複key、alias、canonical出力、error | `content-source-api-plan.md`、ADR-0006 | 条件付き完了 | ASC内は完了。文書が完了条件にする派生project consumer testはこのrepositoryから確認できない |
| A-06 | Markdown frontmatter parse / serialize | LF / CRLF、本文保持、異常系、公開型 | `content-source-api-plan.md` | 条件付き完了 | ASC内は完了。A-05と同じく派生project consumer testは未確認 |
| A-07 | GitHub Contents / Git Database client、共通request/error | mock fetch、全低レベル操作、非JSON、空body、rate limit、secret除去 | `git-content-api.md` | 完了 | fetch注入とruntime非依存境界を確認。実runtime consumer testは未実施 |
| A-08 | `commitGitFileChanges` | 複数write、write/delete/copy、head/ref競合、不正入力、途中失敗 | `git-content-api.md` | 完了 | low-level clientを再利用し、branch更新は最後のnon-force ref更新だけ |
| A-09 | 独立`deploy-status` feature | workflow指定、filter、正規化、未知値、該当なし、error | `deploy-status-api.md` | 完了 | GitHub共通internalを共有し、Actions APIを`git-content`へ混在させていない |
| A-10 | GitHub Actions / Wrangler雛形 | YAML/JSON parse、command、placeholder、secret参照 | `deployment/cloudflare-pages.md` | 完了 | 公開TS APIではない。実deployをしない方針とpreview/productionを確認 |

## 完了済み

### 設計原則と責務

- `philosophy.md`、ADR-0001〜0005、`architecture.md`は、Git正本、静的配信、Domain非依存、派生projectからASCへの一方向依存で整合している。
- Event、slug、特定Collection、Cloudflare Env、管理API routeなどの固有語彙はA-01〜A-09の公開型へ混入していない。
- Cloudflare Pages固有設定はA-10のtemplateと導入文書に分離され、Site、Content、UI、GitOps featureから参照されていない。
- `ResolvedPageMeta`と`resolvePageMeta`は`src/features/site-meta/index.ts`からexportされていない。
- GitHub共通request helperは`src/internal/github-api`にあり、`git-content`と`deploy-status`のruntime APIから公開されていない。

### feature公開境界

source上の公開境界は次の5つの`index.ts`に整理されている。

- `src/features/site-meta/index.ts`
- `src/features/sitemap/index.ts`
- `src/features/content-source/index.ts`
- `src/features/git-content/index.ts`
- `src/features/deploy-status/index.ts`

各featureの`public-api.test.ts`はruntime exportと主要な公開型を確認している。特にSite Metaはresolverを、GitHub系featureはrequest helperをruntime exportしていないことをテストしている。

ただし、これはsource directory上の規約であり、npm packageのdeep importを禁止する境界にはまだなっていない。package levelの判定は「必須修正」に記載する。

### testとbuild

- 純粋関数、error、公開runtime API、Astro build、SCSS contract、deployment templateを含むtestがある。
- A-08はref更新前の失敗で`updateRef`を呼ばないことをblob、tree、commitの各段階で確認している。
- A-10はcredential実値を使わず、YAMLとWrangler JSONの構文を確認している。
- `.github/workflows/ci.yml`は`npm ci`、`npm run check`、`npm run test`、`npm run build`をpushとpull requestで実行する。
- `astro.config.mjs`は`output: "static"`を明示しており、ADR-0003と一致する。

### package metadataで完了している項目

- versionは`0.1.0`である。
- `license: "MIT"`とrootの`LICENSE`が一致する。
- `private: false`、ESMを示す`type: "module"`、Node engine `>=22.12.0`が設定されている。
- runtime依存である`yaml`は`dependencies`にあり、採用理由はADR-0006に記録されている。

## 必須修正

### P0-1: package entrypoint、exports、型定義、配布buildがない

`package.json`に`main`、`module`、`types`、`exports`のいずれもなく、TypeScript libraryのbuild scriptとdeclaration生成設定もない。現在の`npm run build`はsample Astro siteのHTMLを生成するだけで、公開API用JavaScriptまたは`.d.ts`を生成しない。

この状態では文書にある`@asc/site-meta`などのimportは成立せず、package名`albasimia-ssg-core`から利用できる公開subpathも存在しない。v0.1前に少なくとも次を確定する必要がある。

- 実package名に基づく`site-meta`、`sitemap`、`content-source`、`git-content`、`deploy-status`の明示的subpath
- ESM artifactと対応する`.d.ts`の生成方法
- root exportを設けるか、明示的subpathだけを提供するか
- extensionlessな内部importを配布artifactでどう解決するか
- `src/internal`と各feature内部fileへのdeep importを`exports`で拒否すること
- source直接importではなく、build済みpackage subpathを使う公開API test

明示的subpathだけを提供し、rootに全featureを集約しない方式が現在の小さい境界と最も整合する。

### P0-2: 配布物が未制御でinternalとsample siteまで含まれる

`files`も`.npmignore`もない。`npm pack --dry-run`では、`src/internal/github-api`、各featureの内部実装、sample pages/components/content、tests、CI、設計文書を含む102 entryがtarball対象になった。これにより、非公開internalを物理的にdeep importでき、配布物も不必要に大きくなる。

v0.1前に`files`をallowlistとして定義し、build済みfeature、必要なAstro layout、公開CSS、deployment template、README、LICENSEだけを含める。`exports`と`files`の両方で内部境界を固定し、pack結果をCIで検証する必要がある。

### P0-3: BaseLayoutとCSSのpackage公開方法が未完成

公開予定の`BaseLayout.astro`は現在、次のrepository内部事情へ依存する。

- `@/config/site`からsample用`siteConfig`を読み、`site` prop省略時に`ASC Example Site`を既定値にする
- consumer側で解決できる保証のない`@/` path aliasを使う
- `global.scss`を直接importする
- `title`と`description`のlegacy shorthandを公開Propsとして残す

Site Meta設計は固有値を派生側から注入し、利用例でも`site={siteConfig}`を渡すとしている。package公開Layoutがsample設定へfallbackする現状はその方針と矛盾する。v0.1では、package用Layoutの`site`入力、internal resolverへのrelative参照、style読込、legacy Propsの継続期間を確定する必要がある。

CSSについても、契約はCustom PropertiesでありSass partial構造は非公開とされているため、配布時はcompile済みCSSを公開subpathにするのが自然である。theme tokenだけとglobal reset/layout styleを別exportにするか、BaseLayoutがどこまで自動読込するかを決め、consumer buildで検証する必要がある。raw SCSSを公開する場合はconsumer側の`sass`要件を明示しなければならない。

### P0-4: 派生projectが導入できる最小consumer例とpackage testがない

READMEはASC repository自身の`npm install`と`npm run dev`だけを説明しており、packageのinstall、subpath import、Astro Layout、CSS、SiteConfig、sitemapの最小導入手順がない。個別設計文書には仮の利用例があるが、実package名と実exportsを使った一貫した例ではない。

v0.1前に、少なくとも次を行う最小Astro consumer fixtureまたは`examples/minimal`が必要である。

1. packed packageをinstallする
2. `defineSiteConfig`と`BaseLayout.astro`を公開subpathからimportする
3. 公開CSSを読み込む、またはLayoutによる読込を確認する
4. `createSitemapXml`など少なくとも1つの純粋APIを利用する
5. TypeScript checkとAstro static buildを通す
6. 非公開internalのdeep importが失敗することを確認する

A-05/A-06の文書が完了条件とする`catharsiswatari-events`側consumer testも、実施済みかをrelease checklistで確認する。

### P0-5: release文書とADRに現在状態との不整合がある

次の記述はv0.1前に修正または意思決定が必要である。

- `conventions.md`の公開API例は存在しない`createSiteConfig`と`@asc/config`を使用している。実装は`defineSiteConfig`である。
- `content-source-api-plan.md`には重複した「完了条件」見出しと、既に完了した`yaml`追加を「実装前」とする記述が残る。
- `roadmap.md`の現在状態はA-10だけを実装済みとしており、A-01〜A-09の進捗を表現していない。
- `architecture.md`とroadmapはActions状態取得をGitOps Foundationにも置く一方、実装と`deploy-status-api.md`はDeployment Foundationの独立featureとしている。共通GitHub transportだけを共有する現在の責務に合わせる必要がある。
- roadmap上の「v0.1 Foundation」とpackage version `0.1.0`が同じ範囲を指すのか、A-01〜A-10までを含むreleaseなのかが明記されていない。
- 外部依存追加はADR対象という規約に対し、A-04aでの`sass`追加と、A-10でCloudflare Pagesを最初の標準templateにする判断を扱うADRがない。既存ADRで十分と判断する場合も、その根拠を記録する必要がある。

## 推奨修正

### package metadata

- `sideEffects`を設定する。CSS、SCSS、Astro componentを配布する場合に一律`false`とせず、styleを副作用ありとして保持する。
- `repository`、`homepage`、`bugs`、`keywords`、必要なら`author`または`funding`を追加する。
- 使用するnpm versionを固定するため`packageManager`を追加する。
- 公開scopeを採用する場合は`publishConfig.access`を明示する。
- `.nvmrc`の`22`と`engines.node`の`>=22.12.0`を同じrelease方針へ揃える。
- CI jobへ`permissions: contents: read`を明示する。

### dependency整理

- `zod`は現在のsourceからimportされておらず、runtime dependencyとして未使用である。sampleの`content.config.ts`も`astro:content`の`z`を使っている。公開APIまたはsampleで必要な理由がなければ削除候補とする。
- `npm run check`は成功するが、`src/content.config.ts`の`astro:content`由来`z`に非推奨hintが5件ある。release blockerではないものの、Astroの現行schema importへ移行してcleanなcheck結果にすることを推奨する。
- package化後の`astro`はconsumerとの単一version整合が重要であるため、通常dependencyのままにするかpeer dependencyへ移すかを決める。
- compile済みCSSを配布するなら`sass`はbuild用dev dependencyでよい。raw SCSSを公開するならconsumer要件またはpeer dependencyを明記する。

### 重複と旧実装

- 旧`src/lib/seo.ts`は残っておらず、canonicalの並行実装も確認されなかった。
- `BaseLayout`のlegacy `title` / `description` Propsは意図的な移行互換としてtestされているため、直ちに未使用コードとは判定しない。ただしv0.1で正式APIに含めるか、deprecatedとして削除時期を定める。
- `git-content/types.ts`と`src/internal/github-api/types.ts`にはGitHub error code、rate-limit diagnostics、error optionsの同等定義がある。公開型とinternal型のdriftを防ぐため、公開名を維持したまま単一の型定義元へ寄せることを推奨する。
- `SiteHeader`、`SiteFooter`、sample pages、`src/config/site.ts`、`src/content.config.ts`はsample siteから参照されており未使用ではない。ただしlibrary配布物には含めず、exampleとしての位置づけを明記する。
- `src/features/*`の内部moduleにはcross-file利用のためexportされたhelperがある。TypeScript上の不要exportとは断定しないが、package `exports`で到達不能にする。

### test強化

- package artifactに対するruntime import、type resolution、Astro consumer buildをCIへ追加する。
- actual CI workflow自体のYAML parseと必須commandをA-10 template testと同様に検証する。
- Nodeだけでなく、Cloudflare Workers互換fetchまたはbrowser bundlerでGitHub clientがbundleできることをconsumer testで確認する。特にbrowserでは`User-Agent` headerの制約があるため、対応runtimeの表現を文書化する。
- `npm pack --dry-run`またはpackしたtarballのfile allowlistをtestし、internal、tests、sample siteが再混入しないようにする。

### READMEと文書導線

- READMEの構成図を現在の`features`、`internal`、`templates`、deployment docsを含む形へ更新する。
- 各A項目のAPI文書への一覧リンクをREADMEへ追加する。
- package利用者向けQuick Startとrepository開発者向けSetupを分ける。
- `extraction-plan.md`のA一覧を「実装済み」と判別できるstatus列または完了一覧へ更新する。

## 保留

### B候補のうちv0.1完成に必須なもの

**該当なし。**

A-01〜A-10とpackage配布境界だけで、Site Meta、Sitemap、Theme、Content Source、GitHub保存、Deployment状態、Deployment雛形というv0.1の核を成立させられる。B候補を追加しても、現在のrelease blockerであるexports、型定義、配布物、consumer testは解消しない。v0.1完成のために新featureを増やすべきではない。

### 実利用確認まで保留すべきB候補

- B-01: Content Bundle検証は、2つの派生projectでschema注入と関係検証の共通形が確認できるまで保留する。
- B-02〜B-05: asset処理、画像変換、upload UIは形式、preset、runtime依存が大きいため実利用まで保留する。
- B-04b、B-10〜B-13: ThemeSwitcherとUI部品は、`extraction-plan.md`記載の2 project利用条件を満たすまで保留する。
- B-06〜B-09: Admin HTTP、draft、diff、polling UIはAdmin Foundation着手時まで保留する。

QR code、管理画面Shell全体も、現在のv0.1 package完成とは切り離す。

## v0.1完成条件

次をすべて満たした時点で、npm packageとしてv0.1完成と判定する。

1. 公開する5 featureのsubpathとAstro Layout / CSSの公開pathが確定している。
2. `exports`が公開subpathだけを許可し、`src/internal`とfeature内部fileのdeep importを拒否する。
3. ESM artifactと`.d.ts`を再現可能に生成できるlibrary buildがある。
4. `files` allowlistによりtarballが必要なartifact、template、README、LICENSEだけを含む。
5. `BaseLayout`がsample configやconsumer非保証のpath aliasに依存せず、SiteConfig注入契約とstyle責務が確定している。
6. Custom Propertiesを含む公開CSS artifactと`sideEffects`方針が定義されている。
7. 実package名を使う最小Astro consumer例があり、packed packageでcheckとstatic buildが成功する。
8. source直接importではなくpackage subpathを対象にしたruntime API、型、非公開境界testがある。
9. 未使用`zod`、`astro` / `sass`のdependency区分、version、license、repository情報などpackage metadataをrelease方針に合わせて整理している。
10. README、conventions、architecture、roadmap、API文書、ADRが確定したpackage境界と実装状態に一致する。
11. CIで既存のcheck / test / buildに加え、library build、pack、consumer testを実行する。
12. A-05/A-06の派生project consumer test実施状況を確認し、未実施ならrelease checklistへ残す。
13. `npm run check`、`npm run test`、`npm run build`が成功する。

## 次に実装すべき作業

優先順は次の最大5件とする。新しいB featureよりpackage完成を優先する。

1. **package公開契約を決定する**: package名、feature subpath、root exportの有無、Astro Layout、CSS、templateの公開pathを確定し、必要なADRを追加する。
2. **library buildとpackage metadataを実装する**: ESM、`.d.ts`、`exports`、`files`、`sideEffects`、dependency区分を整備する。
3. **BaseLayoutとstyleを配布可能にする**: sample config依存とpath aliasを除き、SiteConfig注入、legacy Props、compile済みCSSの責務を確定する。
4. **最小consumer fixtureとpackage testを追加する**: packed packageから公開API、型、Astro Layout、CSSを利用し、deep import拒否も検証する。
5. **release文書とCIを同期する**: README、conventions、architecture、roadmap、extraction-plan、API文書、ADRを更新し、library build / pack / consumer testをCIへ加える。

## 監査時の検証記録

監査では次を確認した。

- repository全fileと`src/features`、`src/internal`、`src/layouts`、`templates`、`tests`の参照関係
- 全featureの`index.ts`と公開API test
- `package.json`、`package-lock.json`、`tsconfig.json`、`astro.config.mjs`、`.nvmrc`
- `.github/workflows/ci.yml`のYAML parseと実行command
- `npm pack --dry-run --json`による現行tarball候補
- `npm run check`、`npm run test`、`npm run build`の結果

最終3 commandの実行結果は、この監査文書作成後のrepository状態に対して確認する。
