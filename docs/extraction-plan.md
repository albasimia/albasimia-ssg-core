# catharsiswatari-eventsからの抽出計画

- 状態: 調査済み・一部実装済み
- 対象: `../catharsiswatari-events`
- 調査日: 2026-07-24

## 目的

`catharsiswatari-events`にある実装を、ASCへ移す候補、汎用化してから移す候補、派生プロジェクトへ残すものに分類する。

この文書は候補の一覧と境界を定めるためのものであり、コード、設定、アセットの移動は行わない。記載した名前は責務を示す仮称であり、ASCの公開APIを確定するものではない。

## 判断の根拠

次の文書を基準とする。

- `docs/philosophy.md`: 固有性をコアへ持ち込まず、再利用性より境界の明確さを優先する
- `docs/architecture.md`: Site、Content、UI、GitOps、Deploymentの各Foundationへ分ける
- `docs/conventions.md`: 固有値は派生側から注入し、公開APIを明示し、固有DomainをASCへ置かない
- `docs/roadmap.md`: v0.2からv0.6までのFoundationを段階的に整備し、v0.7で派生プロジェクトへ統合する
- `docs/adr/ADR-0001-project-scope.md`: ASCをGitOps前提の汎用静的サイト生成基盤とする
- `docs/adr/ADR-0002-gitops-first.md`: Gitを正本とし、管理機能をGitHub上のファイルを扱うインターフェースとする
- `docs/adr/ADR-0003-static-hosting.md`: 静的生成を中心とし、Functionは限定的な補助機能として扱う
- `docs/adr/ADR-0004-derived-projects.md`: ASCから派生プロジェクトへの一方向依存を維持する
- `docs/adr/ADR-0005-content-driven.md`: 構造化コンテンツの基礎機構だけをASCへ置き、Collectionとスキーマは派生側で定義する

抽出候補は、`docs/architecture.md`の次の5条件をすべて満たせるかで判定する。

1. 複数サイトで利用できる見込みがある
2. 固有ドメインを知らなくても説明できる
3. 設定または拡張ポイントによって派生側から制御できる
4. ASCへ移すことで依存関係が複雑化しない
5. テスト可能な責務として分離できる

## 判定区分

- **A — 優先候補**: ASCの既定責務と直接一致する。固有値を設定化したうえで抽出する
- **B — 条件付き候補**: 再利用可能な核はあるが、現在はイベント型、パス、UI、Cloudflare実装などと密結合している。先に境界を作る
- **保留**: 技術的には汎用化できるが、複数サイトで使う見込みまたはASCの責務がまだ明確でない
- **派生側**: イベントまたはサイト固有の責務であり、ASCへ移さない

## 抽出候補一覧

### A — 優先候補

| ID | 候補となる責務 | 現在の主な実装 | ASCでの配置候補 | 抽出時に必要な境界 |
| --- | --- | --- | --- | --- |
| A-01 | サイトメタデータとhead生成 | `src/layouts/BaseLayout.astro` | Site Foundationの`config`、`layouts`、`features/site-meta` | サイト名、locale、既定説明、OGP、favicon、検証用meta、title書式、theme colorを`SiteConfig`またはPropsから注入する。`ｶﾀﾙｼｽﾜﾀﾘ`、画像パス、Google検証値を持ち込まない |
| A-02 | canonical、robots、OGP、Twitter Card、JSON-LDの出力 | `src/layouts/BaseLayout.astro`、`src/layouts/EventLayout.astro`のhead入力部分 | Site Foundationの`features/site-meta` | ASCはメタ情報を受け取って安全に出力するところまでを担う。EventのJSON-LD生成とdraft判定は派生側に残す。旧`src/lib/seo.ts`を統合し、重複実装を作らない |
| A-03 | sitemap XML生成 | `src/pages/sitemap.xml.ts` | Site Foundationの`features/sitemap` | XML escapeとURL集合からのXML生成を純粋関数にする。対象パス、Collection、公開可否の規則は派生側から渡す。重複URLは正規化後の先勝ちとし、Astro endpointは薄いadapterにする |
| A-04a | Light/Dark基礎テーマ | `src/styles/_theme.scss`、`src/styles/global.scss` | UI Foundationの`styles` | `--asc-` Custom Propertiesと`prefers-color-scheme`によるCSSのみの基礎テーマを提供する。色、font、spacingは派生側で上書きし、切替UI、JavaScript、永続化、theme-color metaの動的切替は含めない |
| A-05 | YAMLの安全なparse・決定的なserialize | `src/domain/events/source-codec.ts`の`parseYamlSource`、`stringifyYamlSource` | Content Foundationの`features/content-source` | ファイル表示名を引数化し、単一Document、重複key禁止、alias制限、改行・indent規約を契約にする。Eventスキーマ検証は受け取らない |
| A-06 | Markdown frontmatterの分離・再構築 | `src/domain/events/source-codec.ts`の`parseEventMarkdown`、`src/admin/editor-codec.ts`の`splitEventSource`相当 | Content Foundationの`features/content-source` | `event.md`という名前とイベント向けエラー文を外し、改行コード保持とfrontmatter更新を共通契約にする。schemaは派生側から渡す |
| A-07 | GitHub Contents/Git Database APIクライアント | `functions/_lib/github.ts` | GitOps Foundationの`features/git-content` | 必須注入のfetchとrepository設定を使い、Contentsおよびblob、tree、commit、ref操作を提供する。HTTP `Response`をthrowせず、request IDとrate limitを含む`GitHubApiError`へ正規化する |
| A-08 | head SHAを用いた競合検知と複数ファイルの同一Commit保存 | `functions/api/admin/events/index.ts`、`functions/api/admin/events/[slug]/index.ts`、`functions/api/admin/events/[slug]/commit.ts`に重複するGit tree/blob/commit/ref処理 | GitOps Foundationの`features/git-content` | 入力を汎用的な`write/delete/copy`のファイル変更集合にする。イベントパス、テンプレート、検証、Commit文言、HTTP処理は派生側アダプターに残す。非force更新と基準Commit不一致を型で表す |
| A-09 | GitHub Actions実行状態の取得 | `functions/api/admin/deployments/index.ts`、`functions/api/admin/deployments/[commitSha].ts` | GitOps FoundationまたはDeployment Foundationの`features/deploy-status` | workflow名、branch、取得件数を設定化し、GitHub APIの応答から共通の状態型へ変換する。`deploy.yml`固定と管理APIルートを含めない |
| A-10 | GitHub Actionsによる静的ビルド・Cloudflare Pagesデプロイの雛形 | `.github/workflows/deploy.yml`、`wrangler.jsonc` | Deployment Foundationの`templates/`、`examples/`または`docs/deployment/` | ASCの公開APIではなく、デプロイ戦略、推奨設定、CI雛形として提供する。Node version、検証コマンド、出力先、Cloudflare project名を派生側設定にする。Cloudflareは最初の標準対象とするが、Site/Content/UI Foundationからは参照しない |

A-01とA-02の公開API、型定義、責務分担、テスト計画、実装状況は`docs/site-foundation-api-plan.md`に記載する。Site Meta本体とBaseLayout接続、単体・統合テストは2026-07-24に実装済みである。

A-03の公開API、重複URL方針、Astro公式integrationとの比較、実装状況は`docs/sitemap-api.md`に記載する。Sitemap純粋関数、Astro endpoint adapter、単体・公開API・buildテストは2026-07-24に実装済みである。

A-04aの公開CSS契約、light/dark解決、styleとBaseLayoutの責務分担、実装状況は`docs/theme-contract.md`に記載する。基礎token、OS設定連動、SCSS契約テストは2026-07-24に実装済みである。

A-07の公開client、Repository設定、低レベルGit Database操作、error契約、A-08との境界は`docs/git-content-api.md`に記載する。注入fetchによるclient本体とmock単体テストは2026-07-25に実装済みである。

A-05とA-06の公開API、型定義、テスト計画、実装状況は`docs/content-source-api-plan.md`に記載する。Codec本体と単体テストは2026-07-24に実装済みである。

### B — 条件付き候補

| ID | 候補となる責務 | 現在の主な実装 | ASCでの配置候補 | 抽出前の条件 |
| --- | --- | --- | --- | --- |
| B-01 | Content Bundleの共通検証パイプライン | `src/domain/events/source-codec.ts`のサイズ検証、Zod issue変換、複数ファイルのissue集約 | Content Foundationの`features/content-validation` | `event.md`、`artists.yaml`、`timetable.yaml`を固定せず、ファイルごとのschema、サイズ上限、関係検証callbackを登録できる設計にする。イベント関係検証そのものは移さない |
| B-02 | コンテンツ同梱アセットの検証・公開先同期 | `scripts/sync-event-assets.mjs` | Content Foundationの`features/assets`またはビルド補助script | 入力glob、出力先、許可形式、容量・画素・寸法ルールを設定化する。`events/{slug}`、`artists/`、`flyer.webp`などの知識を持たせない。出力先全削除の安全条件も契約化する |
| B-03 | WebPヘッダー解析とアップロード検証 | `functions/_lib/webp.ts`、`functions/_lib/webp.test.ts` | Content/Admin Foundationの`features/assets` | `readWebpMetadata`はそのまま純粋責務になり得る。パス規則、用途別寸法、MIME、容量、総画素数は設定オブジェクトまたは派生側policyとして注入する |
| B-04 | ブラウザ内画像変換 | `src/admin/image.ts`、`src/admin/image.test.ts` | Admin Foundationの`features/image-upload` | `artist`、`flyer`、`hero`、`ogp`を任意のpresetへ置き換え、出力形式、品質、長辺、容量、警告validatorを設定化する。WebP fallback encoderを外部依存として採用するかADRで判断する |
| B-04b | ThemeSwitcher UI | `src/components/SiteHeader.astro`のtheme switcher部分、`src/layouts/BaseLayout.astro`の保存済み設定復元部分 | UI Foundationの`components/ThemeSwitcher` | 全派生プロジェクトの必須機能にはしない。localStorage保存、theme-color更新、Header上の切替UIをA-04aの基礎テーマから分離し、保存キー、選択肢、表示、配置を設定可能にする。アマノPJなど2つ目の利用例で必要性を確認してから昇格する |
| B-05 | 画像選択・変換・preview UI | `src/admin/ImageUpload.tsx` | Admin Foundationの`components` | 表示文言、accept、preview、変換関数をPropsで受け取る。イベント向け`ImagePurpose`と管理画面CSSに依存しない状態にする |
| B-06 | 管理APIの共通HTTP応答とクライアントエラー契約 | `functions/_lib/http.ts`の`json`、`apiError`、`safeError`、`src/admin/api.ts`の`AdminApiError`と`request` | Admin Foundationの`features/admin-api` | JSON envelope、no-store、エラー型だけを共通化する。Origin検証は実行環境adapterへ分離し、`Env`、イベントendpoint、Cloudflare PagesのContextをコアAPIにしない |
| B-07 | 管理画面の入力途中保存 | `src/admin/AdminApp.tsx`の`StoredEditorDraft`とlocalStorage処理 | Admin Foundationのhookまたは小さなutility | storage key、version、基準Commit、serialize/restore、破棄条件を引数化する。Event Editorのstate型は受け取らない。基準Commitが変わったdraftの扱いを公開契約にする |
| B-08 | ソース差分表示 | `src/admin/AdminApp.tsx`の`DiffBlock` | Admin Foundationの`components/SourceDiff` | before/after、表示名、diff providerを入力にする。イベントの3ファイル固定と`admin-*` class契約を外す。`diff`依存の追加はADR対象として確認する |
| B-09 | デプロイ状態のpolling表示 | `src/admin/AdminApp.tsx`の`DeploymentStatus`、`DeploymentBadge` | Admin Foundationの`components` | 状態取得関数、polling間隔、ラベル、リンクを注入する。React QueryをASCの必須依存にするか、headlessな状態モデルにするかを先に決める |
| B-10 | 汎用Section骨格 | `src/components/EventSection.astro` | UI Foundationの`components/Section` | `event-*` classと`data-reveal`を外部契約にせず、id、label、title、slot、style hookだけを提供する。ASC側に予定される`Section`と統合し、単純コピーしない |
| B-11 | 共有リンク生成とnative share | `src/components/ShareButtons.astro` | UI Foundationの`components/ShareActions`または`lib/share` | X、LINE、native shareを登録またはPropsで選択可能にし、iconとclassを注入する。表示デザインとサイト固有アセットは派生側に残す |
| B-12 | 画像lightboxの振る舞い | `src/components/ArtistGallery.astro` | UI Foundationの`components/ImageDialog` | `artist`という名前、trigger属性、caption構造、CSSを汎用APIへ置き換える。スクロール固定、close、focus復帰をアクセシビリティ込みで単独テストできるようにする |
| B-13 | reveal-on-scrollのprogressive enhancement | `src/layouts/EventLayout.astro`のIntersectionObserver処理 | UI Foundationの任意utility | selector、rootMargin、threshold、付与classを設定化する。派生側のeffectsスキーマと切り離し、複数サイトでの利用が確認できた時点で抽出する |

### UI Foundationへの昇格条件

B-04bおよびB-10からB-13をASCのUI Foundationへ追加するには、次の条件をすべて満たすこと。

1. 少なくとも2つの派生プロジェクトで利用されている
2. 同じ責務で利用されている
3. 同じ公開APIで利用できる
4. Props追加による肥大化が発生していない
5. ドメイン固有名称を含まない

見た目が似ているだけでは共通化しない。公開APIを維持できない場合は派生プロジェクト側へ残す。

## 現時点ではASCへ移さないもの

| 対象 | 主な実装 | 理由 |
| --- | --- | --- |
| Event、Artist、Timetableのschemaと型 | `src/domain/events/schema.ts`、`src/types/event.ts` | 固有Domainであり、`docs/architecture.md`とADR-0001の明示的な対象外 |
| Event Bundleの関係検証 | `src/domain/events/source-codec.ts`の`validateEventBundleSources`、`validateArtistsFileRelationships` | 出演者ID、グループ、出演枠、開催時間、event section間の規則はイベント業務ルール。B-01からcallbackとして呼ぶ派生側実装にする |
| イベントデータの読み込みと表示モデル変換 | `src/lib/event-data.ts` | Collection名、ファイル配置、出演者・タイムテーブル構造を直接知っている |
| Event向けCollection定義 | `src/content.config.ts` | ADR-0005により、具体的なCollectionとschemaは派生側で定義する |
| Event Layout、Event用Section、カード、Hero、出演者、タイムテーブル、会場表示 | `src/layouts/EventLayout.astro`、`src/components/Event*.astro`、`Artist*.astro`、`Timetable.astro`、`VenueAccess.astro`など | 固有の意味と表示規則を持つ。汎用部品候補はB-10からB-13の粒度でのみ分離する |
| イベント一覧、archive、詳細ページ | `src/pages/index.astro`、`src/pages/archive.astro`、`src/pages/events/[slug].astro` | URL、status分類、並び順、コピー、JSON-LD内容がイベントサイト固有 |
| イベント管理フォームとcodec | `src/admin/EventFieldsForm.tsx`、`ArtistsForm.tsx`、`TimetableForm.tsx`、`editor-codec.ts` | `docs/roadmap.md`が具体的なイベント編集フォームを派生側へ置くと明記している |
| イベント作成・複製・削除・保存endpoint | `functions/api/admin/events/**` | template、パス、validation、レスポンスがイベント固有。A-07からA-09のGit操作だけを利用する派生側adapterとして残す |
| Cloudflare Access認証 | `functions/api/admin/_middleware.ts`、`session.ts` | プロジェクト固有の認証はASCの対象外。Cloudflare Accessのissuer、AUD、許可メール、logout URLに依存する |
| ブランド、コピー、ナビゲーション、サイト固有スタイルとアセット | `src/components/SiteHeader.astro`、`src/pages/about.astro`、`src/styles/global.scss`のサイト部分、`public/**` | サイト名、作者、SNS、フォント、色、画像、ページ構成は派生側から注入または保持する |
| Event用theme、Hero pattern、日付・status表現 | `src/lib/event-utils.ts` | 入力型、語彙判定、Asia/Tokyo、Event schema.org statusなどイベント固有の方針を含む。必要なら小さな純粋関数を別途設計するが、現在のファイル単位では移さない |

## 保留するもの

### QRコード生成

`scripts/generate-qr-codes.mjs`はcanonical URLからSVG/PNGを生成する処理自体はDomain非依存だが、現状は`dist/events/*/index.html`と`artifacts/qr-codes`を固定し、ASCのロードマップにも含まれていない。2つ目の利用例または印刷物生成の共通要件が確認できるまでは派生側に残す。

将来抽出する場合は、入力HTMLのglob、URL取得方法、出力形式、サイズ、誤り訂正レベル、出力先を設定として受け取るビルド補助にする。

### 管理画面Shell全体

`src/admin/AdminApp.tsx`には一覧、作成、編集、削除、認証表示、差分、draft、デプロイ追跡が一体化している。管理画面Shellは`docs/roadmap.md`のv0.6対象だが、現状を丸ごと移すとイベント管理画面がASCへ入るため不可とする。

B-05からB-09を先にheadlessまたは小さな部品として分離し、派生側からフォーム、API、検証、画面遷移を登録できる設計が成立した後にShell化を再評価する。

## 推奨する抽出順序

1. **Contentの純粋関数で最小の公開APIを検証する**  
   最初の実装対象をA-05のYAML CodecとA-06のMarkdown Frontmatter Codecとする。イベント依存とAstro実行環境への依存を除去し、単体テスト付きの小さな公開APIとして分離する。その上にB-01のschema注入型検証を設計する。
2. **Site Foundationを既存実装へ統合する**  
   A-05、A-06で公開APIの設計方法を確認した後、A-01からA-04aをASCの`src/config/site.ts`、`src/layouts/BaseLayout.astro`、`src/features/site-meta`、`src/features/sitemap`、`src/styles/global.scss`へ統合する。対象サイトのファイルをそのままコピーしない。
3. **アセット処理をpolicyと実装へ分ける**  
   B-02、B-03、B-04、B-05について、形式解析・変換という共通実装と、用途別上限・パスという派生側policyを分離する。
4. **GitHub操作をHTTP routeから分離する**  
   A-07を作り、A-08のファイル変更集合と競合結果を公開APIにする。既存イベントendpointはそのAPIを利用するadapterとして残す。
5. **デプロイ状態とDeployment雛形を分離する**  
   A-09はworkflow名とprovider設定を注入する公開機能として分離する。A-10は公開APIにせず、Cloudflare Pages向けを含むテンプレート、導入例、文書として整備する。
6. **Admin Foundationを小さな単位から検証する**  
   B-06からB-09を先に抽出し、2つ目の派生プロジェクトでフォーム登録や画面遷移の共通要件が確認できてからShellを設計する。
7. **UI部品は実利用後に昇格させる**  
   B-04bおよびB-10からB-13はASCの既存UI Foundation計画と照合し、「UI Foundationへの昇格条件」をすべて満たしたものだけを公開APIにする。

## 抽出時の依存ルール

目標とする依存方向は次のとおりとする。

```text
catharsiswatari-events
  ├── event domain / pages / forms / Cloudflare route adapters
  └── site config / theme / asset policies
              ↓
ASC public API
  ├── Site / Content / UI Foundation
  ├── GitOps Foundation
  └── Deployment / Admin Foundation
```

ASCから次の対象をimport、参照、既定値化してはならない。

- `events`というCollection名
- `src/content/events`、`event.md`、`artists.yaml`、`timetable.yaml`という配置
- Event、Artist、Timetableの型とschema
- `ｶﾀﾙｼｽﾜﾀﾘ`の名前、URL、SNS、色、フォント、画像
- `deploy.yml`、Cloudflare project名、Cloudflare Access設定
- 派生プロジェクトのCommit messageや日本語エラー文

## 実装着手前に決めること

- ASCをnpm packageとして参照するか、Astro integrationまたは別の配布方法を採るか
- Astro component、browser code、Cloudflare/Node codeのexport条件と実行環境
- `yaml`、`sharp`、`@jsquash/webp`、`diff`、React関連をASCの依存に追加する範囲
- GitHub APIエラー、競合、validation issueの公開型
- Cloudflare Pages向けadapterをASC本体に含めるか、provider packageまたは例として分離するか
- 各候補を`index.ts`から公開する範囲と、内部実装として保持する範囲
- A/B候補ごとに2つ目の派生プロジェクトで成立する最小利用例

これらのうち、外部依存の追加、ASCの責務変更、特定hosting serviceへの依存、公開APIの破壊的変更は`docs/conventions.md`に従いADRで決定する。
