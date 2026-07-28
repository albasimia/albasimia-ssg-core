# ロードマップ

## 現在の実装状況

- Deployment Foundation: Cloudflare Pages向けGitHub Actions / Wrangler雛形を2026-07-25に実装済み
- Extraction A-01〜A-10: repository内の機能実装・単体テスト・個別文書を実装済み
- Package Foundation: 6つのTypeScript featureのESM / declaration build、subpath exports、配布allowlist、pack consumer testを実装済み
- Package Foundation: BaseLayout / compile済みCSS公開と、installed packageによる最小Astro consumer check / buildを2026-07-25に実装済み
- Release Foundation: metadata、ADR、release checklist、通常CIのpackage/pack consumer検証を2026-07-25に確定
- UI Foundation: `amano-pj`で確認したTheme / Container / Section / metadata等の最小Primitiveを実利用候補として抽出し、package consumer testを追加
- Content Foundation: Content entryごとの`assets/`を公開領域へ安全に同期する`content-assets` featureを実装
- 判定: repository内にv0.1 blockerはなく、`index.md`へ統一したContent Bundle規約を含む`0.1.5`はrelease ready

## v0.1 Foundation

ASCの責務と設計原則に加え、A-01〜A-10とnpm配布基盤を含む最初のreleaseを確定する。この節は2026-07-25時点で完了済みである。

- 公開リポジトリ
- MIT License
- README日本語化
- 思想、アーキテクチャ、設計規約
- ADR運用開始
- Astro静的ビルド
- CI
- 最小サンプルサイト
- 6つのTypeScript feature subpath
- BaseLayoutとcompile済みCSS
- Cloudflare Pages deployment template
- packed packageによる最小Astro consumer検証

以下のv0.2以降は将来候補であり、B候補とともにv0.1.0の対象外とする。既にv0.1へ先行実装された項目は、将来versionでAPI互換性と実利用結果を再評価する。

## v0.2 Site Foundation

サイト全体の共通機能を整備する。

- SiteConfig
- BaseLayout
- canonical URL
- SEO
- OGP
- favicon
- sitemap
- RSS
- 共通エラーページ

## v0.3 UI Foundation

複数サイトで利用できる表示基盤を整備する。

- デザイントークン
- Typography
- Container
- Stack
- Grid
- Section
- Button
- Card
- Header
- Footer
- Light / Dark基礎テーマ

2026-07-27時点では、`amano-pj`の初期実装から最小PrimitiveとThemeを先行抽出した。Stack / Grid / Button / Card / Header / Footerは責務の一致を実利用で確認してから追加する。

## v0.4 Content Foundation

Git管理されたコンテンツを静的ページへ変換する基盤を整備する。

- Content Collections共通規約
- Markdown描画
- draft制御
- コンテンツ検証
- アセット参照規約（`content-assets`として先行実装）
- 共通セクションレンダラーの検討

## v0.5 GitOps Foundation

GitHubを正本とする編集・保存基盤を抽出する。

- GitHubファイル取得
- Commit保存
- 複数ファイル同時更新
- 競合検知
- 差分生成
- GitHub Repository content操作の実利用再評価
- 保存前検証

## v0.6 Admin Foundation

派生プロジェクトが管理画面を構築するための基盤を整備する。

- 管理画面Shell
- フォーム基盤
- ソース編集
- 差分確認
- アセットアップロード
- Git保存
- デプロイ状態表示

イベント編集、ポートフォリオ編集などの具体的なフォームは派生プロジェクト側に置く。

## v0.7 Derived Project Integration

実利用を通して境界を検証する。

- `catharsiswatari-events`をASC利用構成へ移行
- `amano-pj`をASCから構築
- 2つの利用例から公開APIを再評価
- 不要な抽象化を削除
- 欠けている拡張ポイントを追加

## v1.0 Stable

- 公開APIの安定化
- セットアップ手順の確定
- 派生プロジェクト作成手順
- マイグレーション方針
- バージョニング方針
- 2つ以上の実運用サイト
