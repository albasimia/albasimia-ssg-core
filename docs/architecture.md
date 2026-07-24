# アーキテクチャ

## 全体像

ASCは、静的サイトに共通する機能を複数の層へ分けて提供する。

```text
ASC
├── Site Foundation
├── Content Foundation
├── UI Foundation
├── GitOps Foundation
└── Deployment Foundation
```

派生プロジェクトはASCを利用しながら、固有のコンテンツモデル、ページ、デザイン、業務ロジックを保持する。

```text
albasimia-ssg-core
        ↓
├── catharsiswatari-events
└── amano-pj
```

## Site Foundation

サイト全体に関わる共通基盤。

対象例:

- Astroの静的出力設定
- サイトメタデータ
- canonical URL
- SEO
- OGP
- sitemap
- RSS
- favicon
- 共通エラーハンドリング

サイト名、URL、説明文、作者情報などの具体値は派生プロジェクトから注入する。

## Content Foundation

Git管理されたコンテンツを静的ページへ変換するための基盤。

対象例:

- Astro Content Collectionsの共通規約
- Markdownの描画
- 下書き状態の扱い
- コンテンツ検証
- 共通セクション表現
- アセット参照規約

イベント、出演者、経歴、制作実績などの固有スキーマは対象外とする。

## UI Foundation

複数サイトで再利用できる表示基盤。

対象例:

- BaseLayout
- Container
- Section
- Grid
- Stack
- Typography
- Button
- Card
- Navigation
- デザイントークン
- Light / Darkの基礎テーマ

個別サイトのHero、ArtistCard、ProjectCardなど、固有の意味を持つコンポーネントは派生プロジェクト側に置く。

## GitOps Foundation

Gitを正本としてコンテンツを読み書きするための基盤。

対象例:

- GitHub上のファイル取得
- ファイル更新
- 複数ファイルの同一Commit保存
- 競合検知
- 差分生成
- Commit履歴取得
- Actions状態取得
- 保存前検証

編集フォームの具体的な項目やドメイン検証は派生プロジェクト側に置く。

## Deployment Foundation

静的ホスティングへ接続するための基盤。

対象例:

- GitHub Actions
- 静的ビルド
- Cloudflare Pages向け設定
- 環境変数の規約
- Preview環境
- デプロイ状態の確認

Cloudflare Pagesを最初の標準対象とするが、ASCの中心設計をCloudflare固有APIへ依存させない。

## 依存方向

依存は、派生プロジェクトからASCへ向ける。

```text
派生プロジェクト → ASC
ASC             ↛ 派生プロジェクト
```

ASCは、派生プロジェクトのファイル名、Collection名、コンテンツスキーマ、ブランド情報を直接参照しない。

## コアへ移す判断基準

次の条件をすべて満たすものをASC候補とする。

1. 複数サイトで利用できる見込みがある
2. 固有ドメインを知らなくても説明できる
3. 設定または拡張ポイントによって派生側から制御できる
4. ASCへ移すことで依存関係が複雑化しない
5. テスト可能な責務として分離できる

条件を満たさないものは、派生プロジェクトへ残す。

## 対象外

- SSR
- データベース
- 常時稼働するAPIサーバー
- Webアプリケーションの状態管理
- プロジェクト固有の認証
- Event、Artist、Timetable、Portfolio Projectなどの固有モデル
