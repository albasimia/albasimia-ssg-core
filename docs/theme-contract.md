# Light / Dark 基礎テーマ契約

- 状態: 実装済み
- 対象: `docs/extraction-plan.md`のA-04aのみ
- 実装日: 2026-07-24

## 公開CSS契約

派生プロジェクトへ公開する契約は、`--asc-`で始まるCSS Custom Propertiesとする。Sass partialのファイル構造やselector構成は公開APIにしない。

compile済みCSSは`albasimia-ssg-core/styles/theme.css`と`albasimia-ssg-core/styles/global.css`から公開する。raw SCSSは配布せず、package版BaseLayoutは`global.css`を自動importする。

### テーマ別color token

- `--asc-color-background-light` / `--asc-color-background-dark`
- `--asc-color-text-light` / `--asc-color-text-dark`
- `--asc-color-surface-light` / `--asc-color-surface-dark`
- `--asc-color-border-light` / `--asc-color-border-dark`
- `--asc-color-accent-light` / `--asc-color-accent-dark`

### 解決済みcolor token

- `--asc-color-background`
- `--asc-color-text`
- `--asc-color-surface`
- `--asc-color-border`
- `--asc-color-accent`

### typography、spacing、layout token

- `--asc-font-family-sans`、`--asc-font-family-mono`
- `--asc-font-size-small`、`--asc-font-size-body`、`--asc-font-weight-bold`、`--asc-line-height-body`、`--asc-letter-spacing-wide`
- `--asc-space-1`、`--asc-space-2`、`--asc-space-3`、`--asc-space-4`、`--asc-space-6`、`--asc-space-8`
- `--asc-content-width`、`--asc-prose-width`、`--asc-page-gutter`、`--asc-page-block-spacing`

派生プロジェクトは`global.scss`より後でこれらを上書きする。light/dark双方の色を変更する場合は、テーマ別color tokenを上書きする。

```scss
:root {
  --asc-color-background-light: #fafafa;
  --asc-color-background-dark: #181818;
  --asc-font-family-sans: "Project Sans", sans-serif;
  --asc-space-4: 1.125rem;
}
```

## テーマ解決

lightを既定値とし、`@media (prefers-color-scheme: dark)`内で解決済みcolor tokenをdark tokenへ接続する。`color-scheme: light dark`も宣言するため、JavaScriptがなくてもOS設定に応じて基礎テーマが適用される。

## 責務分担

### `_theme.scss`

- 公開Custom Propertiesの既定値を定義する
- `prefers-color-scheme`から解決済みcolor tokenを切り替える
- component selectorやサイト固有値を持たない

### `global.scss`

- `_theme.scss`を読み込む
- resetと既存の基礎layout selectorを保持する
- 色、font、spacingを公開token経由で使用する

### `BaseLayout.astro`

- `global.scss`を1回読み込む
- theme判定、inline script、保存済み設定の復元を行わない

`theme-color` metaはSite Metaの静的設定として扱い、A-04aから動的に更新しない。

## 対象外

- ThemeSwitcher UI
- 手動テーマ切替
- `localStorage`などへの永続化
- theme用JavaScript
- `theme-color` metaの動的切替
- 視覚componentの追加

## テスト

`tests/theme/theme.test.ts`でSCSSをcompileし、公開token、light既定値、dark media query、token利用、BaseLayoutとの責務境界を確認する。最終確認は`npm run check`、`npm run test`、`npm run build`で行う。
