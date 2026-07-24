# ASC v0.1.0 completion audit

- 最終監査日: 2026-07-25
- 対象version: `0.1.0`
- 対象: README、philosophy、architecture、conventions、roadmap、ADR、extraction plan、source、layout、style、template、test、package設定、Astro設定、CI、公開API
- 判定: **v0.1 release ready**

## 総合判定

A-01〜A-10とP0-1〜P0-5は、repository内の実装、テスト、文書、npm配布境界として完了した。5つのTypeScript feature、BaseLayout、compile済みCSS、deployment templateは実package名の明示的subpathから利用できる。packed packageを一時consumerへinstallし、runtime、型、private import拒否、配布allowlist、Astro check / static build、生成HTMLとCSS contractを確認する。

repository内に`0.1.0` releaseを阻害するblockerはない。registryへのpublishは自動化せず、`docs/release-checklist.md`に従う手動判断とする。`catharsiswatari-events`でのA-05/A-06実利用確認は公開前checklistに残すが、本repositoryの実装blockerや移行作業には含めない。

## A-01〜A-10

| ID | 実装・テスト・文書 | 判定 |
| --- | --- | --- |
| A-01 / A-02 | `site-meta`、公開BaseLayout、head metadata、純粋関数・build test、`site-foundation-api-plan.md` | 完了 |
| A-03 | sitemap純粋関数、XML escape、URL検証、Astro adapter、単体・公開・build test、`sitemap-api.md` | 完了 |
| A-04a | `--asc-` token、light/dark、OS連動、compile済みCSS、contract test、`theme-contract.md` | 完了 |
| A-05 / A-06 | YAML / Markdown codec、error・改行・決定的serialize test、`content-source-api-plan.md` | 完了。派生project実利用はrelease checklist |
| A-07 / A-08 | GitHub client、error正規化、atomic multi-file commit、競合・失敗test、`git-content-api.md` | 完了 |
| A-09 | 独立`deploy-status`、status正規化、mock fetch test、`deploy-status-api.md` | 完了 |
| A-10 | Cloudflare Pages workflow / Wrangler template、構文・placeholder test、deployment文書 | 完了 |

## 完了済み

### 公開境界と配布物

- `site-meta`、`sitemap`、`content-source`、`git-content`、`deploy-status`は各`src/features/*/index.ts`だけをsource公開境界とする。
- packageは同名の5 subpath、`layouts/BaseLayout.astro`、`styles/theme.css`、`styles/global.css`だけを明示的にexportする。root exportとwildcard exportはない。
- `ResolvedPageMeta`、resolver、feature内部file、`src/internal`、compile済み共有internalはexports経由で到達できない。
- ESM JavaScriptと`.d.ts`を`package-dist`へ生成し、Node ESMで解決できる`.js`付きrelative importを使用する。
- `files` allowlistは生成物、deployment template、README、CHANGELOG、LICENSEだけを収録する。source、tests、sample site、CI、docs、raw SCSSは含めない。
- `sideEffects`はCSSだけを保持する。root exportがないため`main`、`module`、root用`types`は意図的に設定しない。

### Layout、CSS、consumer

- 公開BaseLayoutは`site: SiteConfig`を必須、`meta?: PageMeta`を任意とし、sample config、legacy shorthand、`@/` aliasへ依存しない。
- canonical、robots、OGP、Twitter、JSON-LD、favicon、theme-color、verificationとnamed head slotをSite Meta契約で出力する。
- BaseLayoutはcompile済み`global.css`を自動importする。consumerはSassを必要としない。
- packed package consumer testは`defineSiteConfig`、BaseLayout、CSS、`createSitemapXml`を実際に利用し、Astro check、static build、生成HTMLを確認する。

### metadata、dependency、CI

- package名、version `0.1.0`、description、MIT license、author、repository、homepage、bugs、keywords、Node engine、public publish設定を定義した。
- `yaml`はruntime dependencyである。公開Layoutを使うconsumer向けにAstro 7をpeer dependencyとし、ASCの検証用dev dependencyにも保持する。Sassはbuild専用dev dependencyである。
- `.nvmrc`とenginesの最小versionを22.12.0へ揃えた。
- 通常CIは最小権限で`npm ci`、check、test、buildを実行する。testはpackage buildと実tarball distribution testを含み、buildはpackage buildとsample static buildを含む。publishと実deployは行わない。
- package方針はADR-0007、Cloudflare Pages template方針はADR-0008へ記録した。

### sample siteとpackage

repositoryのpages、components、content、config、public assetsはASC自身のstatic buildを検証するsample siteであり、package配布物ではない。派生projectは公開package subpathだけに依存し、固有のCollection、ページ、visual、domain logicを自身に保持する。

## 必須修正

### P0-1: package entrypoint、exports、型定義、配布build（解消済み）

5 featureのESM JavaScriptとdeclaration build、明示的subpath exports、Node ESM検証を実装した。

### P0-2: 配布allowlistとprivate境界（解消済み）

allowlistとpacked package testにより、必要な生成物だけを配布し、root / feature internal / shared internalのdeep importを拒否する。

### P0-3: BaseLayoutとCSSのpackage公開（解消済み）

sample非依存BaseLayoutとcompile済みCSSを確定subpathから公開し、raw SCSSを公開しない。

### P0-4: 最小Astro consumer（解消済み）

実tarballをinstallするfixtureでAstro check / build、HTML metadata、CSS、sitemapを検証する。

### P0-5: release metadata、文書、ADR、CI（解消済み）

package metadataとdependency区分を完成し、architecture、conventions、roadmap、extraction plan、API文書を現在の実装へ同期した。ADR-0007/0008、CHANGELOG、release checklistを追加し、CIのpackage / distribution検証契約を明記した。

## 推奨修正

- `astro:content`由来のschema importに関するcheck hintは将来のAstro追従時に解消する。現時点ではerrorではなくrelease blockerではない。
- GitHub公開型と共有internal型のdrift防止、実browser / Workers bundle検証、actual CI YAMLの自動構文testは互換性を維持した小規模改善として将来検討する。
- npm version固定は運用環境が確定した時点で`packageManager`またはCorepack方針として追加を判断する。

## 保留・将来課題

B-01〜B-13、ThemeSwitcher、Admin UI、画像処理、polling UI、QR code、管理画面Shellはすべてv0.1対象外である。少なくとも2つの派生projectで同じ責務・公開APIが成立したものだけを再評価する。

`catharsiswatari-events`の本移行、A-05/A-06の実データ利用確認、実Cloudflare deploy、npm publish、GitHub Releaseはrepository実装とは分離した運用作業である。

## v0.1 blocker

**なし。**

## v0.1完成条件

1. **完了:** A-01〜A-10の実装、テスト、文書。
2. **完了:** 公開5 feature、BaseLayout、CSSのexportsとESM/declaration build。
3. **完了:** private境界、配布allowlist、sideEffects、dependencyとmetadata方針。
4. **完了:** packed packageのruntime / type / Node ESM / minimal Astro consumer検証。
5. **完了:** README、architecture、conventions、roadmap、extraction plan、API文書、ADRの同期。
6. **完了:** 通常CIのcheck / test / package build / distribution test / static build。
7. **完了:** CHANGELOGと手動release checklist。
8. **公開時確認:** release担当者がchecklistを実行し、version、tarball、license、secret非混入、派生project A-05/A-06利用状況を確認してnpm publishを手動判断する。

## 次に行う作業

release readiness後の優先順は次のとおりとする。新feature実装ではなく、公開運用と実利用による検証を優先する。

1. release checklistを実行し、tarballとrelease notesを最終確認する。
2. `catharsiswatari-events`でA-05/A-06を実データに対して確認する。
3. npm publishをrelease担当者が手動判断する。
4. 派生projectから得た互換性feedbackを記録する。
5. B候補は2 projectでの共通需要が確認されたものだけを次期計画へ移す。

## 最終検証

この監査更新後のrepository状態に対して、次を成功させる。

```sh
npm run check
npm run test
npm run build
npm pack --dry-run
```
