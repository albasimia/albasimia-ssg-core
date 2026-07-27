# UI Foundation

UI Foundationは、固有名詞や業務コンテンツに依存しないAstro UIの最小Primitiveと、Light / Dark / Autoテーマの実行契約を提供する。

## 公開コンポーネント

各コンポーネントは`albasimia-ssg-core/components/<Name>.astro`から個別にimportする。

- `Container`: `wide` / `prose`幅の中央配置
- `Section`: 共通のblock余白と`aria-labelledby`
- `SectionHeader`: eyebrow、見出し、任意説明文
- `ArrowLink`: 矢印付きテキストリンク
- `Tag`: `default` / `accent`表示
- `MetaList`: term/valueの定義リスト
- `SkipLink`: main contentへのkeyboard導線
- `VisuallyHidden`: 視覚的に隠す補助テキスト
- `ThemeBoot`: 初期テーマをheadで同期決定するinline script
- `ThemeSwitcher`: Light / Dark / Autoを選択するbutton group

Header、Footer、Navigation、Card、Heroは名称・情報構造・リンク構成がサイトごとに異なるため、現段階では派生プロジェクト側の責務とする。

## Theme契約

`ThemeBoot`と`ThemeSwitcher`には同じ`storageKey`を渡す。未指定時は`asc-theme-preference`を使用する。保存値は`light`、`dark`、`auto`のいずれかで、未設定または不正値の場合は`auto`になる。

`ThemeBoot`は`<head>`内で実行し、`html`へ次の属性を設定する。

```text
data-asc-theme-storage-key
data-asc-theme-preference = light | dark | auto
data-asc-theme-resolved = light | dark
```

`auto`選択中は`prefers-color-scheme`変更へ追従する。別tabの保存変更も`storage` eventで同期する。切替後は次のCustomEventをdocumentへ送る。

```ts
type AscThemeChangeDetail = {
  preference: "light" | "dark" | "auto";
  resolved: "light" | "dark";
};

document.addEventListener("asc:theme-change", (event) => {
  // event.detail satisfies AscThemeChangeDetail
});
```

JavaScriptが無効な場合も、CSSの`prefers-color-scheme`によりlight/darkが決まる。`ThemeSwitcher`だけが操作不能になり、本文閲覧には影響しない。

## Token上書き

全Primitiveは`--asc-*` tokenを利用する。派生プロジェクトはASCのCSS読込後に値を上書きし、色、書体、余白、幅を調整できる。

```css
:root {
  --asc-color-accent-light: #2458d3;
  --asc-color-accent-dark: #8fb0ff;
  --asc-content-width: 76rem;
  --asc-prose-width: 44rem;
}
```

Primitive内部へサイト名や特定Projectのclassを持ち込まない。派生側の固有componentが必要な場合は、Primitiveを内包するか、固有CSSを追加する。

## Release境界

このAPIは`0.1.3`から公開する。既存の`0.1.2` consumerは影響を受けず、利用するcomponentだけを個別subpathから追加できる。
