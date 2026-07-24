# Sitemap 公開API

- 状態: 実装済み（package公開subpathは未確定）
- 対象: `docs/extraction-plan.md`のA-03のみ
- 実装日: 2026-07-24

## 目的

派生プロジェクトが選択したabsolute URL集合から、標準的なsitemap XMLを生成する純粋関数を提供する。URLの収集と公開可否の判断は入力側に残し、ASCはURL検証、重複除去、XML escape、直列化だけを担う。

## 公開API

現時点の公開境界は`src/features/sitemap/index.ts`とする。

```ts
export type SitemapUrlInput = string | URL;

export function createSitemapXml(
  urls: readonly SitemapUrlInput[],
): string;

export class SitemapError extends Error {
  readonly code: "SITEMAP_URL_INVALID";
  readonly path: string;
  readonly cause?: unknown;
}
```

## URL規則

- absoluteなHTTPまたはHTTPS URLだけを受け付ける
- relative URL、protocol-relative URL、HTTP/HTTPS以外、前後に空白を含む文字列を拒否する
- 標準`URL`で解決した`href`を`<loc>`へ出力する
- `/docs`と`/docs/`は別URLとして扱い、入力のtrailing slashを追加・削除しない
- root URLの末尾`/`など、標準`URL`による正規化は適用される
- 入力順を出力順として維持する

## 重複URL

標準`URL`で正規化した`href`が同じURLを重複とする。重複した場合は最初の1件だけを出力し、後続を黙って除外する。

この方針により、複数の収集元を結合しても有効なXMLを決定的に生成できる。重複を入力不備として失敗させる必要がある場合は、派生プロジェクトが関数を呼ぶ前に検証する。

## XML出力

- XML declarationとSitemaps protocolの`urlset` namespaceを出力する
- URLの`&`、`<`、`>`、`"`、`'`をXML entityへescapeする
- 空配列は空の`urlset`として出力する
- URLごとの更新日時、頻度、priority、多言語alternate、画像、動画は現APIの対象外とする
- 入力配列と`URL` objectを変更しない

## 責務分担

### Sitemap純粋関数

- URLのschemeとabsolute性を検証する
- 重複を除去する
- XML escapeしてsitemap XMLを生成する
- Astro、Collection、ファイルI/Oへ依存しない

### Astro endpoint adapter

`src/pages/sitemap.xml.ts`は派生プロジェクト側のadapter例であり、対象pathnameをabsolute URLへ変換して`createSitemapXml`を呼び、`application/xml`の`Response`を返す。

### 派生プロジェクト

- sitemapへ含めるpathnameまたはURLを収集する
- Collection名、schema、公開状態などのDomain規則を定義する
- 非公開ページを除外する
- 複数originを許可するかを決める

ASCのSitemap APIはCollection名やコンテンツ状態を参照せず、入力されたURLを暗黙に除外しない。

## Astro公式sitemap integrationとの比較

Astro公式の[`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/)は、build時に静的routeと`getStaticPaths()`のrouteを自動収集し、URL数に応じた分割、filter、custom pages、i18nなどを提供する。route自動収集を優先する一般的なAstroサイトでは公式integrationが適する。

A-03では、派生プロジェクトがDomain規則に基づいて確定したURL集合を純粋関数へ渡せることと、Astro外でも同じXML生成規則をテストできることを優先する。そのため今回は公式integrationを依存に追加せず、小さな純粋関数とendpoint adapterを採用した。分割や多言語sitemapが必要になった場合は、公式integrationへの切替またはAPI拡張を再評価する。

## エラー方針

不正なURLでは`SitemapError`をthrowする。

- `code`: `SITEMAP_URL_INVALID`
- `path`: 入力位置を示す`urls.{index}`
- message: 開発者向け診断であり、UI文言の契約にしない

endpointはエラーを握りつぶさず、静的buildを失敗させる。

## テスト

- `tests/sitemap/sitemap.test.ts`: XML、escape、trailing slash、入力順、重複、空配列、URL validation
- `tests/sitemap/public-api.test.ts`: runtime exportと公開型
- `tests/site-meta/base-layout.test.ts`: static buildで`sitemap.xml`が生成されることを確認

`npm run check`、`npm run test`、`npm run build`を完了条件とする。
