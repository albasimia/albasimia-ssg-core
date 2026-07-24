# TypeScript featureのpackage公開

- 状態: 実装済み
- package名: `albasimia-ssg-core`
- module形式: ESMのみ
- 対象: `docs/completion-audit.md`のP0-1、P0-2
- Astro公開物: `BaseLayout.astro`、compile済みCSS
- 対象外: raw SCSS、ThemeSwitcher、手動theme

## 公開subpath

TypeScript featureは次の5 subpathだけを公開する。

| subpath | source境界 | 主なruntime API |
| --- | --- | --- |
| `albasimia-ssg-core/site-meta` | `src/features/site-meta/index.ts` | `defineSiteConfig`、meta純粋関数、`SiteMetaError` |
| `albasimia-ssg-core/sitemap` | `src/features/sitemap/index.ts` | `createSitemapXml`、`SitemapError` |
| `albasimia-ssg-core/content-source` | `src/features/content-source/index.ts` | YAML / Markdown codec、`ContentSourceError` |
| `albasimia-ssg-core/git-content` | `src/features/git-content/index.ts` | GitHub client、同一Commit保存、error class |
| `albasimia-ssg-core/deploy-status` | `src/features/deploy-status/index.ts` | GitHub Actions実行状態client、`GitHubApiError` |

Astro向けに次も公開する。

- `albasimia-ssg-core/layouts/BaseLayout.astro`
- `albasimia-ssg-core/styles/theme.css`
- `albasimia-ssg-core/styles/global.css`

利用側はpackageをinstallし、必要なfeatureだけを明示的にimportする。

```ts
import {
  defineSiteConfig,
  type PageMeta,
} from "albasimia-ssg-core/site-meta";
import { createSitemapXml } from "albasimia-ssg-core/sitemap";
```

## root exportを設けない理由

package rootの`albasimia-ssg-core`にはexportを設けない。

- Site、Content、GitOps、Deploymentの境界をimport pathへ反映する
- 利用していないfeatureを暗黙に公開面へ混ぜない
- root barrelの追加による名前衝突と公開APIの肥大化を避ける
- 各featureの変更範囲を明示する

したがってroot importは`ERR_PACKAGE_PATH_NOT_EXPORTED`となる。`main`、`module`、root用`types`も設定しない。JavaScriptと型定義の解決は、各subpathの`exports.import`と`exports.types`だけで行う。

## build

`npm run build:package`は`tsconfig.lib.json`を使用し、5つの`index.ts`をentryとして`package-dist/`へJavaScriptと`.d.ts`を生成する。

- `module`と`moduleResolution`は`NodeNext`
- 出力はESMのみ
- source内の相対importは`.js`拡張子を明示し、Node ESMで解決可能なartifactを生成する
- package buildはAstro site buildから独立している
- `npm run build`と`npm pack`の前にもpackage buildを実行する
- Sassから`theme.css`と`global.css`をcompileし、package用BaseLayoutのstyle importを`global.css`へ置き換える

公開型は各subpathの`types` conditionから解決する。consumerが`src`またはTypeScript sourceを直接参照する必要はない。

## private境界

`package.json`の`exports`は公開5 subpathだけを列挙する。次は公開しない。

- package root
- `src/internal`
- `package-dist/internal`
- `site-meta/resolve`など各feature内部file
- wildcard subpath

GitHub request/errorの共有実装は、`git-content`と`deploy-status`の生成JavaScriptから必要になるため、compile済みの`package-dist/internal/github-api`だけをtarballへ含める。これはruntime implementationであり、`exports`に経路を持たない。sourceの`src/internal`はtarballへ含めない。pack後のconsumer testで共有internalとfeature内部へのdeep importが拒否されることを確認する。

## 配布物

`files`はallowlistとし、次だけを配布する。

- 5 featureのcompile済みJavaScriptと`.d.ts`
- GitHub APIのcompile済み共有internal
- package用`BaseLayout.astro`
- compile済み`theme.css`と`global.css`
- `templates/deployment/cloudflare-pages/`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- npmが必ず含める`package.json`

次は配布しない。

- `src/`
- `tests/`
- sample pages、components、content、public assets
- `.github/`とCI
- repository向け設計文書
- raw SCSS
- Astro configとTypeScript build config

## sideEffects

TypeScript feature自体はimport時にglobal stateやI/Oを変更しない。BaseLayoutがCSSをimportするため、`sideEffects`は`**/*.css`だけを副作用ありとして保持する。

## dependency境界

公開5 featureのruntime dependencyは`yaml`だけである。公開`BaseLayout.astro`をcompileするconsumerにはAstroが必要なため、Astro 7を`peerDependencies`に置き、ASC自身のbuild/test用として`devDependencies`にも保持する。Sassはcompile済みCSSを生成するbuild用`devDependency`に限定し、consumer dependencyにはしない。直接利用されていなかった`zod` dependencyは削除した。

package root exportはないため、`main`、`module`、root用`types`は設定しない。公開packageであることを`publishConfig.access: public`に明示し、version、license、repository、homepage、bugs、author、keywords、Node engineは`package.json`を正本とする。

## 検証

`tests/package/package-distribution.test.ts`は実際のtarballを一時directoryへ作り、local dependencyだけを使って一時consumerへ`npm install`する。そのconsumerから次を確認する。

- 5 subpathのruntime import
- 5 subpathのTypeScript型解決
- Node ESMでの実行
- root、feature内部、共有internalのimport拒否
- tarball fileのallowlist
- source、test、sample、CI、raw SCSSが含まれないこと
- installed packageを使う最小Astro fixtureのcheckとstatic build
- 生成HTMLのtitle、canonical、descriptionと公開CSS contract

通常CIの`npm run test`がこのpacked distribution testを含み、`npm run build`のlifecycleがpackage buildとsample site buildを実行する。CIからnpm publishや実deployは行わない。

公開前には次を実行する。

```sh
npm run check
npm run test
npm run build
npm pack --dry-run
```
