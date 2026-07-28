# albasimia-ssg-core

**albasimia-ssg-core（ASC）は、GitOpsを前提としたAstroベースの静的サイト生成基盤です。**

ポートフォリオサイト、イベントサイト、サービスLPなど、複数の静的サイトで再利用できる共通基盤を提供します。

プロジェクト固有のコンテンツ、ブランド、業務ロジックを共通基盤から分離し、静的サイト制作における保守性、再利用性、移植性を高めることを目的としています。

> 一度設計し、何度でも育てる。

## 目的

ASCは、次の方針に基づいて設計します。

- Astroによる静的HTML生成
- Gitを正本とするコンテンツ管理
- GitOpsを前提とした公開・更新フロー
- 静的ホスティングサービスへの接続容易性
- プロジェクト固有実装と共通基盤の分離
- 小さく、読みやすく、拡張可能な構造

## 対象

ASCは、主に次のようなサイトを対象とします。

- ポートフォリオサイト
- イベント告知・開催記録サイト
- サービスLP
- 小規模なコーポレートサイト
- Git管理と静的配信で成立するコンテンツサイト

## 対象外

ASCは、次の機能を提供しません。

- SSR
- データベース
- アプリケーション機能としての認証
- 常時稼働するバックエンドAPI
- サーバー上の状態管理
- プロジェクト固有の業務ロジック
- 汎用CMSとしての完成形

これらが必要な場合は、ASCを無理に拡張せず、別の基盤または別プロジェクトとして設計します。

## 構成

```text
.
├── docs/
│   ├── adr/
│   ├── architecture.md
│   ├── conventions.md
│   ├── philosophy.md
│   └── roadmap.md
├── public/
├── src/
│   ├── components/
│   ├── config/
│   ├── content/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── tests/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## セットアップ

### 最小サイトを作成する

空のdirectoryへASCをinstallし、packageに含まれるCLIで最小構成を生成できます。

```sh
mkdir my-site
cd my-site
npm install astro@^7.1.1 albasimia-ssg-core@^0.1.5
npx asc init .
npm run build
```

GitHub tagを利用する場合は、修正版tagをdependencyに指定します。

```sh
npm install astro@^7.1.1 github:albasimia/albasimia-ssg-core#v0.1.5
npx asc init .
npm run build
```

`asc init [directory]`は`package.json`、`.gitignore`、Astro設定、TypeScript設定、SiteConfig、BaseLayoutを使うindex page、sitemap endpointを生成します。既存のscaffold fileは上書きせず停止し、追加installや外部通信は行いません。

### npm packageを手動構成で利用する

```sh
npm install astro@^7.1.1 albasimia-ssg-core@^0.1.5
```

Node.js 22.12.0以上とAstro 7が必要です。Astroは公開`BaseLayout.astro`のpeer dependencyです。SassはASCのbuild時にだけ使用し、consumerには不要です。

GitHub tagから直接利用する場合は、`package-dist/`を生成する`prepare`を含む`v0.1.1`以降を指定します。`v0.1.0`は生成物を含まないため使用しません。

```sh
npm install astro@^7.1.1 github:albasimia/albasimia-ssg-core#v0.1.5
```

npm registry版とGitHub版のどちらも、install後は同じ公開subpathを利用できます。GitHub版のinstall中はASC自身のbuild dependencyが一時的に使われますが、consumerがSassやTypeScriptを直接追加する必要はありません。

ASCはroot exportを設けず、機能境界ごとのsubpathを公開します。

```ts
import {
  defineSiteConfig,
  type PageMeta,
} from "albasimia-ssg-core/site-meta";
import { createSitemapXml } from "albasimia-ssg-core/sitemap";
import { parseYamlSource } from "albasimia-ssg-core/content-source";
import { syncContentAssets } from "albasimia-ssg-core/content-assets";
import { createGitHubClient } from "albasimia-ssg-core/git-content";
import { createDeploymentStatusClient } from "albasimia-ssg-core/deploy-status";
```

Astroページでは、packageのLayoutへ必須の`site`を渡します。Layoutはcompile済み`global.css`を自動で読み込むため、consumerへSassは不要です。

```astro
---
import BaseLayout from "albasimia-ssg-core/layouts/BaseLayout.astro";
import { defineSiteConfig } from "albasimia-ssg-core/site-meta";

const site = defineSiteConfig({
  name: "Example",
  siteUrl: "https://example.com/",
  description: "Example site",
  locale: "ja",
});
---

<BaseLayout site={site} meta={{ title: "Home" }}>
  <main>...</main>
</BaseLayout>
```

CSS単体のsubpathは`albasimia-ssg-core/styles/theme.css`と`albasimia-ssg-core/styles/global.css`です。raw SCSSは公開しません。詳細は[package公開方法](docs/package-exports.md)を参照してください。

Contentと画像を同じdirectoryで管理する場合は、`content-assets`でContentごとの`assets/`を静的配信directoryへ同期できます。Content Bundleの本文は`{entryName}/index.md`に統一し、直下に別のMarkdownがある場合は同期時に拒否します。詳細は[Content Assets](docs/content-assets.md)を参照してください。

### UI Foundationを利用する

共通UIは個別subpathから必要なものだけimportします。テーマ切替を使う場合は、同じ`storageKey`を`ThemeBoot`と`ThemeSwitcher`へ渡します。`ThemeBoot`はFOUCを抑えるため`BaseLayout`の`head` slotへ配置します。

```astro
---
import BaseLayout from "albasimia-ssg-core/layouts/BaseLayout.astro";
import Container from "albasimia-ssg-core/components/Container.astro";
import SkipLink from "albasimia-ssg-core/components/SkipLink.astro";
import ThemeBoot from "albasimia-ssg-core/components/ThemeBoot.astro";
import ThemeSwitcher from "albasimia-ssg-core/components/ThemeSwitcher.astro";
---

<BaseLayout site={site} meta={{ title: "Home" }}>
  <ThemeBoot slot="head" storageKey="example-theme" />
  <SkipLink href="#main-content" label="本文へ移動" />
  <header>
    <Container>
      <ThemeSwitcher storageKey="example-theme" />
    </Container>
  </header>
  <main id="main-content">
    <Container><slot /></Container>
  </main>
</BaseLayout>
```

サイト名、Navigation、Footer、Project Cardなどの固有情報を持つUIは派生プロジェクト側で実装します。公開コンポーネント、テーマ属性、イベントの契約は[UI Foundation](docs/ui-foundation.md)を参照してください。

### Repositoryを開発する

```sh
npm install
npm run dev
```

公開前には、次のコマンドを実行します。

```sh
npm run check
npm run test
npm run build
npm pack --dry-run
```

repository内のpages、components、content、public assetsはASC自体を検証するsample siteです。npm packageには、公開subpathの生成物、BaseLayout、compile済みCSS、deployment templateだけを収録し、sample siteは含めません。

## 派生プロジェクト

ASCは、次のプロジェクトに共通基盤を提供する予定です。

- `catharsiswatari-events`
- `amano-pj`

各派生プロジェクトは、固有のコンテンツモデル、コピー、ビジュアル、ドメイン機能を自身のリポジトリ内に保持します。

ASCへ追加する機能は、少なくとも複数の派生プロジェクトで再利用できる見込みがあるものに限定します。

## 設計文書

- [思想](docs/philosophy.md)
- [アーキテクチャ](docs/architecture.md)
- [設計規約](docs/conventions.md)
- [ロードマップ](docs/roadmap.md)
- [TypeScript featureのpackage公開](docs/package-exports.md)
- [Cloudflare Pagesデプロイ雛形](docs/deployment/cloudflare-pages.md)
- [Release checklist](docs/release-checklist.md)
- [Changelog](CHANGELOG.md)
- [ADR](docs/adr/)

## ライセンス

MIT
