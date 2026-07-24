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

### npm packageを利用する

```sh
npm install astro@^7.1.1 albasimia-ssg-core
```

Node.js 22.12.0以上とAstro 7が必要です。Astroは公開`BaseLayout.astro`のpeer dependencyです。SassはASCのbuild時にだけ使用し、consumerには不要です。

ASCはroot exportを設けず、機能境界ごとのsubpathを公開します。

```ts
import {
  defineSiteConfig,
  type PageMeta,
} from "albasimia-ssg-core/site-meta";
import { createSitemapXml } from "albasimia-ssg-core/sitemap";
import { parseYamlSource } from "albasimia-ssg-core/content-source";
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
