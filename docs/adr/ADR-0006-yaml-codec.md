# ADR-0006: Content Source CodecのYAML実装

- 状態: Accepted
- 決定日: 2026-07-24

## 背景

ASCは、Git管理された構造化コンテンツを静的ページへ変換するContent Foundationを提供する。

最初の共通機能として、YAML sourceとYAML frontmatter付きMarkdownをDomain非依存でparse、serializeする必要がある。標準APIだけでYAML 1.2、重複key検出、alias制限、決定的なserializeを実装すると、Codec自体の保守範囲が大きくなる。

既存の派生プロジェクト`catharsiswatari-events`は、これらの処理に`yaml` packageを利用している。

## 決定

Content Source Codecの実行時依存として`yaml` packageを採用する。

CodecはNode.jsとブラウザの両方で利用できる純粋関数として実装し、次を標準契約とする。

- YAML 1.2 Core Schema
- 単一Document
- 重複keyの禁止
- alias展開の禁止
- 2スペースindent、行折り返しなし、key sortなしのcanonical出力
- aliasとanchorを生成しないserialize

parse結果は`unknown`とし、Domain schemaによる検証は派生プロジェクトへ委ねる。

## 理由

- YAML parserを独自実装せず、Content Foundationの責務を小さく保てる
- Node.jsとブラウザで同じCodecを利用できる
- 既存の派生プロジェクトと同じYAML 1.2の解釈を維持できる
- parser optionと公開テストによって安全性と出力の安定性を契約化できる

## 影響

- `yaml`をASCのruntime dependencyへ追加する
- `yaml`の更新時はparse結果とcanonical出力の差分をテストで確認する
- `yaml`固有のDocument型やError型は公開APIへ露出しない
- 利用側はparse結果を自身のschemaで検証する必要がある
- 元sourceのコメントやquote styleはserialize後に保持されない

## 代替案

### YAMLを独自実装する

仕様とsecurity上の考慮範囲が大きく、ASCの責務を超えるため不採用。

### JSONだけを扱う

既存コンテンツとの互換性を失い、手作業で編集するGitOpsコンテンツの可読性も下がるため不採用。

### Astroのfrontmatter処理へ依存する

Astro外やブラウザ上の管理機能から再利用できず、sourceの再構築規則も統一できないため不採用。
