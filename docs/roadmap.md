# ロードマップ

## 現在の実装状況

- Deployment Foundation: Cloudflare Pages向けGitHub Actions / Wrangler雛形を2026-07-25に実装済み

## v0.1 Foundation

ASCの責務と設計原則を確定する。

- 公開リポジトリ
- MIT License
- README日本語化
- 思想、アーキテクチャ、設計規約
- ADR運用開始
- Astro静的ビルド
- CI
- 最小サンプルサイト

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

## v0.4 Content Foundation

Git管理されたコンテンツを静的ページへ変換する基盤を整備する。

- Content Collections共通規約
- Markdown描画
- draft制御
- コンテンツ検証
- アセット参照規約
- 共通セクションレンダラーの検討

## v0.5 GitOps Foundation

GitHubを正本とする編集・保存基盤を抽出する。

- GitHubファイル取得
- Commit保存
- 複数ファイル同時更新
- 競合検知
- 差分生成
- Actions状態取得
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
