# Site Foundation 公開API計画

- 状態: Site Meta実装・package公開済み、BaseLayout package公開はP0-3で保留
- 対象: `docs/extraction-plan.md`のA-01、A-02のみ
- 作成日: 2026-07-24

## 目的

サイト共通設定とページ単位メタ情報から、HTML headへ出力する値を一貫して解決するSite Foundationの公開APIを定義する。

タイトル、canonical URL、robots、OGP、Twitter Cardなどの解決はDomainとAstroに依存しない純粋関数とし、HTMLへの出力だけをAstroの`BaseLayout`へ置く。本設計は`src/features/site-meta`と`src/layouts/BaseLayout.astro`へ実装済みである。

## 実装状況

2026-07-24に次を実装した。

- `src/features/site-meta/`に公開関数、入力型、共通エラーclass、非公開resolverを追加
- `src/layouts/BaseLayout.astro`を非公開resolverへ接続し、既存の本文構造とstyle読込を維持
- `src/config/site.ts`を`defineSiteConfig`利用へ移行
- 旧`src/lib/seo.ts`をSite Metaへ統合し、canonical実装の重複を解消
- `tests/site-meta/`に純粋関数、公開境界、BaseLayout buildのテストを追加

Site Metaのsource境界は`src/features/site-meta/index.ts`、package公開subpathは`albasimia-ssg-core/site-meta`とする。`ResolvedPageMeta`と`resolvePageMeta`はそこからexportしない。`BaseLayout.astro`のpackage公開はP0-3で扱い、現時点のpackageには含めない。

## 対象範囲

### A-01: サイトメタデータとhead生成

- `SiteConfig`
- サイト名、URL、既定説明、locale
- title生成規則
- favicon
- theme-color
- verification meta
- Astro `BaseLayout`によるHTML documentとheadの出力

### A-02: ページ単位メタ情報とSEO出力

- `PageMeta`
- canonical URL
- robots
- Open Graph Protocol
- Twitter Card
- JSON-LDの受け渡しと安全な直列化
- サイト既定値とページ上書き値の解決

## 対象外

- sitemap、RSS、faviconファイルの生成
- Event、Artist、Portfolio ProjectなどのDomain型
- コンテンツの公開状態、下書き、開催状態などの判定
- Event、Article、Personなど個別schema.org objectの生成
- OGP画像の生成、変換、寸法検証
- theme切替、localStorage、`prefers-color-scheme`の解決
- Header、Footer、Navigation、ブランド表示
- Astro Content Collectionsからのデータ取得
- SSR、request単位の動的meta生成

派生プロジェクトは自身のDomain情報から`PageMeta`とJSON-LDを作る。ASCはその判断内容を解釈せず、検証、既定値解決、HTML出力だけを担う。

## 設計原則

### 固有値を持たない

サイト名、URL、説明、locale、画像、色、verification tokenなどの具体値はすべて派生プロジェクトから`SiteConfig`へ渡す。ASCはサンプル値を実行時既定値として使用しない。

### Domain上の判断を行わない

ASCはページがindex可能か、OGP typeが何か、どのJSON-LDを出すかを判定しない。派生プロジェクトが`robots`、`openGraph.type`、`jsonLd`を明示する。

### 純粋関数とAstro adapterを分離する

設定検証、title生成、URL解決、meta既定値のmerge、JSON-LD直列化は標準のTypeScript、`URL`、`JSON`だけで実装する。`Astro.url`、component slot、`set:html`などは`BaseLayout.astro`に閉じ込める。

### 入力型と解決済み型を分ける

派生側が渡す`SiteConfigInput`、`PageMeta`と、head出力に必要な値が揃った内部描画モデル`ResolvedPageMeta`を分ける。`BaseLayout`は内部で解決済み値を生成して描画する。

### `ResolvedPageMeta`を公開しない

`ResolvedPageMeta`は`BaseLayout`の実装詳細であり、公開APIまたは公開型としてexportしない。`resolvePageMeta`も内部関数とし、派生プロジェクトから直接利用させない。

これにより、meta tagの追加、OGPとTwitterの補完順序、JSON-LDの描画形式などを、派生側の破壊的変更なしに改善できる。派生プロジェクトの契約は入力側の`SiteConfig`と`PageMeta`、および`BaseLayout`のPropsまでとする。

### 無効化を明示できる

OGPとTwitter Cardはサイト単位またはページ単位で`false`を指定して無効化できる。favicon、theme-colorは空配列によるページ単位の抑止を許可する。暗黙の空文字で無効化しない。

## 配置案

```text
src/
├── features/
│   └── site-meta/
│       ├── canonical.ts
│       ├── errors.ts
│       ├── json-ld.ts
│       ├── resolve.ts
│       ├── robots.ts
│       ├── title.ts
│       ├── types.ts
│       └── index.ts
└── layouts/
    └── BaseLayout.astro

tests/
└── site-meta/
    ├── canonical.test.ts
    ├── config.test.ts
    ├── json-ld.test.ts
    ├── public-api.test.ts
    ├── resolve.test.ts
    ├── robots.test.ts
    └── title.test.ts
```

既存の`src/config/site.ts`、`src/lib/seo.ts`、`src/layouts/BaseLayout.astro`は、実装時にこの境界へ統合する。並行する旧APIは残さない。

## title生成規則

`SiteConfig.title`はサイト既定titleとページtitleの結合規則を持つ。

`SiteConfigInput.title`を省略した場合は、`SiteConfig.name`を`default`とし、既定のseparatorとpositionを補完する。

1. `PageMeta.title`がない場合は`SiteConfig.title.default`を使う
2. page titleが既定titleと同じ場合は重複して結合しない
3. `PageMeta.titleMode`が`absolute`の場合はpage titleだけを使う
4. `titleMode`が`template`または省略された場合は`position`と`separator`に従って結合する
5. `position: "suffix"`では`{page title}{separator}{default title}`とする
6. `position: "prefix"`では`{default title}{separator}{page title}`とする
7. titleは前後をtrimし、空文字を拒否する

既定値は`separator: " | "`、`position: "suffix"`とする。派生プロジェクトは記号や結合方向を設定できるが、任意関数を設定へ渡す方式は採用しない。

## canonical URL生成規則

`createCanonicalUrl`はサイト内pathnameからabsolute URLを生成する純粋関数とする。

- `siteUrl`はabsoluteなHTTPまたはHTTPS URLとする
- `pathname`は`/`から始まるサイト内pathとし、absolute URLとprotocol-relative URLを拒否する
- query stringは入力にある場合だけ維持する
- fragmentはcanonicalへ含めず、fragment付き入力を拒否する
- trailing slashは入力を維持し、ASCで追加・削除しない
- URLのpercent encodingは標準`URL`の規則に従う

`PageMeta.canonicalUrl`は、別originを含む明示的なcanonicalが必要な場合のoverrideとする。HTTPまたはHTTPSのabsolute URLだけを許可し、fragmentを拒否する。通常は`BaseLayout`が`Astro.url.pathname`をcontextとして渡し、サイト内canonicalを生成する。

## robots方針

robotsはcommaを含まないdirectiveの配列として受け取る。

```ts
robots: ["noindex", "nofollow"]
```

`serializeRobots`は各値をtrimし、空値を拒否し、順序を保ったまま重複を除去して`, `で結合する。既定値はサイト設定の`defaultRobots`とし、その初期値は次とする。

```ts
["index", "follow", "max-image-preview:large"]
```

ASCはページ状態からdirectiveを選ばない。index可否は派生プロジェクトが判定し、`PageMeta.robots`へ結果を渡す。

## OGP方針

OGPは既定で有効とし、次の値を解決する。

- `og:type`: ページ指定、サイト既定値、`website`の順
- `og:url`: canonical URL
- `og:title`: ページ指定、解決済みtitleの順
- `og:description`: ページ指定、解決済みdescriptionの順
- `og:image`: ページ指定、サイト既定画像の順。画像がなければ省略
- `og:image:alt`: 指定がある場合だけ出力
- `og:site_name`: サイト指定、`SiteConfig.name`の順
- `og:locale`: サイトまたはページ指定がある場合だけ出力

`SiteConfig.openGraph: false`または`PageMeta.openGraph: false`で関連metaをすべて省略する。画像pathは`siteUrl`を基準にabsolute URLへ解決する。

## Twitter Card方針

Twitter Cardも既定で有効とし、title、description、imageはページ指定、解決済みOGP、ページ共通metaの順で補完する。

- card typeの指定がなければ、画像ありは`summary_large_image`、画像なしは`summary`
- `twitter:site`と`twitter:creator`は指定がある場合だけ出力
- image altは指定がある場合だけ出力
- Xのアカウント識別子は`@`付きの文字列として受け取り、ASCはアカウントを推測しない

`SiteConfig.twitter: false`または`PageMeta.twitter: false`で関連metaをすべて省略する。

## JSON-LD方針

ASCはschema.orgの型を限定せず、JSONとして安全に直列化できるobjectを1件または複数件受け取る。

- JSON-LD objectの生成とDomain検証は派生プロジェクトが行う
- `BaseLayout`はobjectごとに`application/ld+json` scriptを1つ出力する
- `serializeJsonLd`は循環参照、`undefined`だけの値、非finite numberなどJSONとして不正な入力を拒否する
- `<`、U+2028、U+2029をescapeし、`</script>`によるscript終了を防ぐ
- JSON-LDをHTML attributeへ埋め込まない

## favicon、theme-color、verification meta

### favicon

`SiteConfig.favicons`は複数のlink定義を受け取る。`href`はサイトURLを基準にabsolute URLへ解決する。

- `rel`: `icon`、`apple-touch-icon`、`mask-icon`
- `type`、`sizes`、`color`: 必要な場合だけ指定
- `PageMeta.favicons`が指定された場合はサイト定義を置き換える

### theme-color

theme-colorは色と任意のmedia queryの組で複数指定できる。色値のブラウザ解釈までは検証せず、空文字、制御文字、HTMLを壊す文字を拒否する。

```ts
themeColors: [
  { color: "#ffffff", media: "(prefers-color-scheme: light)" },
  { color: "#111111", media: "(prefers-color-scheme: dark)" },
]
```

`PageMeta.themeColors`が指定された場合はサイト定義を置き換える。

### verification meta

verificationはmetaの`name`と`content`をそのまま定義する汎用配列とする。特定検索サービス名を型や既定値へ組み込まない。

```ts
verification: [
  { name: "example-site-verification", content: verificationToken },
]
```

空値、重複name、制御文字を拒否する。tokenをログやエラーメッセージへ含めない。

## 公開API案

純粋関数の公開subpathは`albasimia-ssg-core/site-meta`とする。

```ts
export function defineSiteConfig(input: SiteConfigInput): SiteConfig;

export function createPageTitle(
  page: Pick<PageMetaBase, "title" | "titleMode">,
  policy: TitlePolicy,
): string;

export function createCanonicalUrl(pathname: string, siteUrl: URL): URL;

export function serializeRobots(
  directives: readonly string[],
): string;

export function serializeJsonLd(value: JsonLdObject): string;
```

Astro adapterのpackage公開pathはP0-3で決定する。今回確定したTypeScript featureの`exports`には`BaseLayout.astro`を含めない。

`BaseLayout`は非公開の`resolvePageMeta`を使って全head値を一度に解決する。派生プロジェクトは内部resolverや`ResolvedPageMeta`を組み立てず、`PageMeta`を`BaseLayout`へ渡す。公開する個別関数は設定検証、CLI、テストなどで同じ基本規則を利用するためのものに限定する。

## 型定義案

```ts
export type UrlInput = string | URL;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonLdObject
  | readonly JsonValue[];
export interface JsonLdObject {
  readonly [key: string]: JsonValue;
}

export interface TitlePolicyInput {
  default: string;
  separator?: string;
  position?: "prefix" | "suffix";
}

export interface TitlePolicy {
  readonly default: string;
  readonly separator: string;
  readonly position: "prefix" | "suffix";
}

export interface FaviconInput {
  rel: "icon" | "apple-touch-icon" | "mask-icon";
  href: UrlInput;
  type?: string;
  sizes?: string;
  color?: string;
}

export interface ResolvedFavicon
  extends Omit<FaviconInput, "href"> {
  readonly href: URL;
}

export interface ThemeColorMeta {
  color: string;
  media?: string;
}

export interface VerificationMeta {
  name: string;
  content: string;
}

export interface OpenGraphDefaultsInput {
  type?: string;
  siteName?: string;
  locale?: string;
  image?: UrlInput;
  imageAlt?: string;
}

export interface OpenGraphDefaults {
  readonly type: string;
  readonly siteName: string;
  readonly locale?: string;
  readonly image?: URL;
  readonly imageAlt?: string;
}

export interface TwitterDefaultsInput {
  card?: "summary" | "summary_large_image";
  site?: string;
  creator?: string;
  image?: UrlInput;
  imageAlt?: string;
}

export interface TwitterDefaults {
  readonly card?: "summary" | "summary_large_image";
  readonly site?: string;
  readonly creator?: string;
  readonly image?: URL;
  readonly imageAlt?: string;
}

export interface SiteConfigInput {
  name: string;
  siteUrl: UrlInput;
  description: string;
  locale: string;
  title?: TitlePolicyInput;
  defaultRobots?: readonly string[];
  openGraph?: false | OpenGraphDefaultsInput;
  twitter?: false | TwitterDefaultsInput;
  favicons?: readonly FaviconInput[];
  themeColors?: readonly ThemeColorMeta[];
  verification?: readonly VerificationMeta[];
}

export interface SiteConfig {
  readonly name: string;
  readonly siteUrl: URL;
  readonly description: string;
  readonly locale: string;
  readonly title: TitlePolicy;
  readonly defaultRobots: readonly string[];
  readonly openGraph: false | OpenGraphDefaults;
  readonly twitter: false | TwitterDefaults;
  readonly favicons: readonly ResolvedFavicon[];
  readonly themeColors: readonly ThemeColorMeta[];
  readonly verification: readonly VerificationMeta[];
}

export interface OpenGraphPageMeta {
  type?: string;
  title?: string;
  description?: string;
  image?: UrlInput;
  imageAlt?: string;
  locale?: string;
}

export interface TwitterPageMeta {
  card?: "summary" | "summary_large_image";
  title?: string;
  description?: string;
  image?: UrlInput;
  imageAlt?: string;
  site?: string;
  creator?: string;
}

export interface PageMetaBase {
  title?: string;
  titleMode?: "template" | "absolute";
  description?: string;
  robots?: readonly string[];
  openGraph?: false | OpenGraphPageMeta;
  twitter?: false | TwitterPageMeta;
  jsonLd?: JsonLdObject | readonly JsonLdObject[];
  favicons?: readonly FaviconInput[];
  themeColors?: readonly ThemeColorMeta[];
}

export type PageMeta = PageMetaBase & (
  | { canonicalPath?: string; canonicalUrl?: never }
  | { canonicalUrl: UrlInput; canonicalPath?: never }
);

interface PageMetaContext {
  pathname: string;
}

interface ResolvedOpenGraphMeta {
  readonly type: string;
  readonly url: URL;
  readonly title: string;
  readonly description: string;
  readonly image?: URL;
  readonly imageAlt?: string;
  readonly siteName: string;
  readonly locale?: string;
}

interface ResolvedTwitterMeta {
  readonly card: "summary" | "summary_large_image";
  readonly title: string;
  readonly description: string;
  readonly image?: URL;
  readonly imageAlt?: string;
  readonly site?: string;
  readonly creator?: string;
}

interface ResolvedPageMeta {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: URL;
  readonly robots: string;
  readonly openGraph: false | ResolvedOpenGraphMeta;
  readonly twitter: false | ResolvedTwitterMeta;
  readonly serializedJsonLd: readonly string[];
  readonly favicons: readonly ResolvedFavicon[];
  readonly themeColors: readonly ThemeColorMeta[];
  readonly verification: readonly VerificationMeta[];
}
```

`OpenGraphDefaults`と`TwitterDefaults`は各入力内のURLをabsolute `URL`へ解決し、文字列を検証したreadonly型として`index.ts`からexportする。

`PageMetaContext`、`ResolvedOpenGraphMeta`、`ResolvedTwitterMeta`、`ResolvedPageMeta`は内部型であり、`index.ts`、package declaration、`BaseLayout`のPropsからexportしない。

## エラー方針

設定またはページmetaが不正な場合は`SiteMetaError`をthrowする。利用側はmessageではなくcodeとpathで判定する。

```ts
export type SiteMetaErrorCode =
  | "SITE_CONFIG_INVALID"
  | "SITE_URL_INVALID"
  | "PAGE_META_INVALID"
  | "CANONICAL_URL_INVALID"
  | "JSON_LD_INVALID";

export interface SiteMetaErrorOptions {
  code: SiteMetaErrorCode;
  path?: string;
  details?: readonly string[];
  cause?: unknown;
}

export class SiteMetaError extends Error {
  readonly code: SiteMetaErrorCode;
  readonly path?: string;
  readonly details: readonly string[];
  readonly cause?: unknown;
}
```

エラー契約は次のとおりとする。

- messageは英語の開発者向け診断とし、UI文言の契約にしない
- tokenやverification contentをmessage、details、ログへ含めない
- 複数項目の一括検証が必要な場合も、最初のerrorの`path`を安定して返す
- `BaseLayout`はエラーを握りつぶさず、静的buildを失敗させる
- optional metaがないことはエラーにしない
- 外部HTTP requestやURL到達確認は行わない

## BaseLayoutとの責務分担

### 純粋なSite Foundation

- `SiteConfigInput`の検証と既定値補完
- title生成
- canonical URL生成
- robots serialize
- OGP、Twitter Cardの既定値解決
- favicon URL解決
- theme-color、verification metaの検証
- JSON-LDの検証と安全な直列化
- 非公開`ResolvedPageMeta`の生成

### Astro `BaseLayout`

- `Astro.url.pathname`を`PageMetaContext`として渡す
- 非公開`resolvePageMeta`を1回呼ぶ
- `lang`、charset、viewport、generator、title、meta、link、JSON-LD scriptを描画する
- `slot`でページ本文を描画する
- 必要な派生側head拡張のため、任意のnamed `head` slotを最後に描画する

### 派生プロジェクト

- `SiteConfigInput`の具体値を定義する
- Domain情報から`PageMeta`を作る
- index可否、OGP type、画像、JSON-LDの内容を決める
- Header、Footer、Navigation、ページclass、テーマUIを構成する
- Astro Content Collectionsからentryを取得する

`BaseLayout`へSiteHeader、Footer、Domain component、サイト固有copy、サイト固有styleを埋め込まない。共通reset styleを読み込むかどうかはUI Foundationで別途決定する。

## 派生プロジェクトからの利用例

### サイト設定

```ts
import { defineSiteConfig } from "albasimia-ssg-core/site-meta";

export const siteConfig = defineSiteConfig({
  name: "Example Archive",
  siteUrl: import.meta.env.PUBLIC_SITE_URL,
  description: "作品と活動記録を掲載する静的サイトです。",
  locale: "ja",
  title: {
    default: "Example Archive",
    separator: " | ",
    position: "suffix",
  },
  openGraph: {
    locale: "ja_JP",
    image: "/images/og-default.webp",
    imageAlt: "Example Archive",
  },
  twitter: {
    card: "summary_large_image",
  },
  favicons: [
    { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  ],
  themeColors: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#111111", media: "(prefers-color-scheme: dark)" },
  ],
  verification: [
    {
      name: "example-site-verification",
      content: import.meta.env.PUBLIC_SITE_VERIFICATION,
    },
  ],
});
```

例中の名称、URL、色、画像、tokenは派生側の値であり、ASCの既定値ではない。

### 通常ページ

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { siteConfig } from "../config/site";
---

<BaseLayout
  site={siteConfig}
  meta={{
    title: "About",
    description: "このサイトについて紹介します。",
    canonicalPath: "/about/",
  }}
>
  <main>...</main>
</BaseLayout>
```

### 派生側がindex可否とJSON-LDを決めるページ

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { siteConfig } from "../config/site";

const allowIndexing = page.data.visibility === "public";
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page.data.title,
  description: page.data.description,
};
---

<BaseLayout
  site={siteConfig}
  meta={{
    title: page.data.title,
    description: page.data.description,
    robots: allowIndexing ? undefined : ["noindex", "nofollow"],
    openGraph: {
      type: "website",
      image: page.data.ogImage,
      imageAlt: page.data.ogImageAlt,
    },
    jsonLd,
  }}
>
  <main>...</main>
</BaseLayout>
```

`visibility`の語彙と判定は派生プロジェクトの責務であり、ASCは`robots`の結果だけを受け取る。

## テスト計画

純粋関数はVitestのNode環境で契約を検証する。Astro adapterは最小fixtureのbuild結果からheadを検証し、Domain fixtureを使用しない。

### `config.test.ts`

1. 必須値から`SiteConfig`を生成できる
2. title policy、default robots、OGP、Twitterの既定値を補完する
3. relative faviconと画像をsite URLからabsolute URLへ解決する
4. input objectと配列を変更しない
5. 空のname、description、locale、titleを拒否する
6. HTTP/HTTPS以外、relative URL、query、fragment付きsite URLを拒否する
7. favicon、theme-color、verificationの空値と重複を拒否する
8. verification tokenがerrorへ含まれない

### `title.test.ts`

1. page titleなしでdefault titleを返す
2. suffix、prefixを規則どおり生成する
3. page titleとdefault titleが同じ場合に重複しない
4. `absolute`でtemplateを適用しない
5. titleの前後をtrimする
6. 空のpage title、separator、default titleを安定したerror codeで拒否する

### `canonical.test.ts`

1. `/`とnested pathからabsolute URLを生成する
2. query stringとtrailing slashを維持する
3. absolute pathname、protocol-relative URL、fragmentを拒否する
4. 明示的canonical URLを解決できる
5. HTTP/HTTPS以外とfragment付きoverrideを拒否する
6. 別originのoverrideは明示指定時だけ許可する

### `robots.test.ts`

1. directiveを`, `で結合する
2. 前後空白を除去し、順序を保って重複を除去する
3. 空値、comma、制御文字を拒否する
4. page指定がsite defaultを置き換える
5. Domain状態を参照しない

### `resolve.test.ts`

1. `ResolvedPageMeta`の全必須値を生成する
2. description、robots、favicon、theme-colorのページ上書きを適用する
3. OGPのtitle、description、URL、画像を規則どおり補完する
4. サイト単位とページ単位でOGPを無効化できる
5. Twitter CardをOGPと共通metaから補完する
6. 画像有無に応じて既定card typeを選ぶ
7. サイト単位とページ単位でTwitter Cardを無効化できる
8. relative画像をabsolute URLへ解決する
9. site verificationを改変せず解決済みmetaへ渡す
10. Event、draft、Collectionなどの型や語彙を必要としない

### `json-ld.test.ts`

1. nested objectと配列を直列化できる
2. 複数objectを入力順に直列化する
3. `<`、U+2028、U+2029を安全にescapeする
4. `</script>`をそのまま出力しない
5. 循環参照、非finite number、runtimeで混入した`undefined`とfunctionを拒否する
6. schema.orgの`@type`を限定しない

### `public-api.test.ts`

1. 公開関数、`SiteMetaError`、関連型を`index.ts`からimportできる
2. `SiteConfigInput`と`PageMeta`へDomain型が現れない
3. 純粋関数のsignatureへAstro、DOM、Node.jsの型が現れない
4. `ResolvedPageMeta`と`resolvePageMeta`が`index.ts`およびpackage declarationからexportされない
5. `BaseLayout`のPropsが`SiteConfig`と`PageMeta`を受け取り、`ResolvedPageMeta`を要求しない
6. 内部ファイルへのdeep importを必要としない

### `BaseLayout`統合テスト

1. 最小Astro fixtureをstatic buildできる
2. `<html lang>`、charset、viewport、generator、title、descriptionを出力する
3. canonical、robots、OGP、Twitter Cardを解決済み値どおり出力する
4. 複数favicon、theme-color、verification metaを出力する
5. JSON-LDを安全な`application/ld+json` scriptとして出力する
6. `false`指定のOGPとTwitter metaを出力しない
7. named `head` slotと本文slotを描画する
8. Header、Footer、Domain componentを暗黙に追加しない
9. 不正な設定ではbuildを失敗させる

## 完了条件

実装に着手した場合は、次をすべて満たした時点でA-01、A-02を完了とする。

1. 公開入力の`SiteConfig`、`PageMeta`と非公開描画モデル`ResolvedPageMeta`の責務が分離されている
2. title、canonical、robots、OGP、Twitter、JSON-LDの解決が純粋関数になっている
3. Astro依存が`BaseLayout.astro`へ閉じている
4. サイト固有値とDomain型がASC実装へ含まれない
5. index可否、OGP type、JSON-LD内容を派生側が決定できる
6. 公開APIを`index.ts`から利用できる
7. `ResolvedPageMeta`と`resolvePageMeta`が公開されていないことを型テストで保証する
8. error codeとpathがテストされている
9. 純粋関数テストとBaseLayout統合テストが通る
10. `npm run check`、`npm run test`、`npm run build`が通る
11. 2つ目の派生プロジェクトで同じ公開APIを使用できる

## 実装時の決定

- Site Metaは`albasimia-ssg-core/site-meta`から公開し、BaseLayoutのpackage exportはP0-3まで保留する
- named `head` slotは共通metaの後に描画する公開拡張点とする
- JSON-LDは新規依存を追加せず、独自の再帰検査でruntime validationする
- 旧`SiteConfig`と`createCanonicalUrl`は一括移行し、BaseLayoutの`title`、`description` Propsだけは移行互換のため維持する
- OGPとTwitter Cardは設計どおり既定で有効とする

OGPとTwitter Cardの既定方針を独立ADRへ記録するかは、package公開subpathの決定時に再評価する。
