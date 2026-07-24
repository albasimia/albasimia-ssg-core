# ADR-0007: npm packageの配布境界

- 状態: Accepted
- 日付: 2026-07-25

## 背景

TypeScript feature、Astro Layout、styleを、repository sourceへ直接依存せず派生projectから利用できる配布境界が必要である。

## 決定

ASCをESM npm packageとして配布し、root barrelではなく明示的subpathだけを公開する。TypeScriptはJavaScriptとdeclarationへbuildし、BaseLayoutとcompile済みCSSを配布する。Astro 7はLayout consumerに必要なpeer dependencyかつASCのdev dependency、SassはCSS生成専用のdev dependencyとする。raw SCSS、sample site、tests、sourceは配布しない。

## 理由と影響

feature境界とprivate implementationをexportsで維持でき、consumerにSassやsource aliasを要求しない。Astroを使わないTypeScript subpathの利用者にもpeer dependency warningが生じ得るが、単一packageでLayoutを正式提供する契約を優先する。

root用`main`、`module`、`types`は設けない。CSSだけをside effectとして宣言し、tarballとinstalled consumerを通常CIで検証する。
