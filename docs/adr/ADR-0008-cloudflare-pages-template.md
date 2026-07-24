# ADR-0008: Cloudflare Pagesを最初のdeployment templateとする

- 状態: Accepted
- 日付: 2026-07-25

## 背景

派生projectが静的buildを継続的に検証・配布するための具体的な導入例が必要である一方、ASCのfeatureをhosting providerへ結合させてはならない。

## 決定

Cloudflare Pagesを最初の標準deployment templateとし、GitHub Actions workflowとWrangler設定をコピー可能な雛形として配布する。project名、account ID、token、branch、output directoryは派生側で設定する。ASCのTypeScript API、Site、Content、UI、GitOps featureからtemplateを参照しない。

## 理由と影響

具体的な導入経路を提供しつつprovider依存を配布設定へ閉じ込められる。CIではtemplateの構文とplaceholderだけを検証し、実deployは行わない。他providerは実需要が確認された時点で別templateとして追加を判断する。
