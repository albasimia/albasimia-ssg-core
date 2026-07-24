# 設計規約

## 言語

- ファイル名、ディレクトリ名、コード上の識別子は英語とする
- READMEと設計文書の本文は日本語とする
- 公開API、型名、関数名は英語とする
- コメントは、実装意図を明確にする必要がある場合のみ記述する

## 命名

### Component

表示上の再利用単位。

例:

- `Button`
- `Card`
- `SiteHeader`

固有ドメインを名前に含む場合は、原則として派生プロジェクトへ置く。

### Layout

ページ全体または大きな領域の骨格を定義する。

例:

- `BaseLayout`
- `ArticleLayout`

### Section

ページ内の意味的な区切り。

例:

- `Section`
- `SectionHeader`

特定サイト固有の内容を持つSectionは派生側に置く。

### Feature

複数のファイルから構成される、独立した機能単位。

例:

```text
features/
└── git-content/
    ├── api.ts
    ├── schema.ts
    ├── types.ts
    └── index.ts
```

### Domain

イベント、ポートフォリオ、商品など、特定の業務領域を表す。

Domainは原則としてASCへ置かない。

## ディレクトリ

```text
src/
├── components/
├── config/
├── features/
├── layouts/
├── lib/
├── styles/
└── types/
```

### components

小さな表示部品を置く。

### layouts

ページまたは大きな表示領域の骨格を置く。

### config

サイトまたは機能の設定型、初期値、設定読み込み処理を置く。

### features

GitOps、SEO、アセット処理など、複数ファイルで構成される機能を置く。

### lib

特定Featureへ属さない小さな純粋関数を置く。

巨大な雑多ファイルを作らない。

### styles

デザイントークン、リセット、共通スタイルを置く。

### types

複数Featureから利用される型だけを置く。Feature固有型はFeature内に置く。

## 公開API

派生プロジェクトから参照してよい機能は、各ディレクトリの`index.ts`から明示的に公開する。

内部ファイルへの直接importを前提としない。

```ts
import { createSiteConfig } from "@asc/config";
```

次のような深いimportは避ける。

```ts
import { createSiteConfig } from "@asc/config/internal/create-site-config";
```

## 設定と固有値

サイト名、URL、作者、SNS、色、画像などの具体値をASC内部へハードコードしない。

設定値は派生プロジェクト側から渡す。

```ts
const site = defineSiteConfig({
  name: "Example",
  siteUrl: "https://example.com",
});
```

## コンポーネント

- アクセシビリティを初期実装から考慮する
- DOM構造を用途に対して過剰に抽象化しない
- class名を外部APIとして扱わない
- 見た目の差分は、可能な範囲でPropsまたはCSS Custom Propertiesから制御する
- 固有コピーを共通コンポーネントへ埋め込まない

## スタイル

- デザイントークンにはCSS Custom Propertiesを使用する
- 色、余白、文字サイズを無秩序に直書きしない
- ASCは最低限の基礎スタイルを提供し、完成済みテーマを強制しない
- 派生プロジェクトが上書きできる境界を保つ

## テスト

次を優先してテストする。

- 純粋関数
- 設定検証
- URL生成
- コンテンツ検証
- Git差分処理
- 競合検知
- 公開APIの振る舞い

見た目の微細な差異より、再利用基盤としての契約を優先する。

## ADR

次の変更はADRの対象とする。

- ASCの責務を変更する
- 新しい外部依存を基盤へ追加する
- GitOpsの保存方式を変更する
- 静的出力の前提を変更する
- 公開APIに破壊的変更を加える
- 特定ホスティングサービスへの依存を追加する
