# ADR-0009: Content AssetをContent directoryへ同居させる

## 状態

Accepted

## 背景

派生プロジェクトでは、画像を`public/`へ直接集約すると、どのContentに属するAssetかがdirectory構造から分からなくなる。管理画面からContentと複数Assetを同一Commitで保存する場合も、所有境界が曖昧になる。

`catharsiswatari-events`では、イベントごとの`assets/`をContent directoryへ置き、build前に公開領域へ同期する方式が実運用されている。ポートフォリオでも同じ所有境界が必要になった。

## 決定

- Content entryごとのdirectory内に`assets/`を置く
- ASCはfilesystem同期、安全な相対パス検証、公開URL解決を`content-assets` subpathとして提供する
- collection schema、Asset field名、画像寸法などのドメイン規則は派生プロジェクトに置く
- Assetはbuild前に`public/`配下へ同期し、静的URLとして配信する
- 同期先を消去する前に全Assetを検証する

## 理由

- ContentとAssetの所有関係がGit上で明確になる
- GitOpsで本文と画像を同一単位として扱える
- Astro固有の画像schemaへ基盤を固定せず、複数のContent modelで再利用できる
- 派生プロジェクト固有の画像要件をASCへ持ち込まずに済む

## 影響

- Consumerは`predev`、`precheck`、`prebuild`で同期scriptを実行する
- 同期出力は生成物として扱い、正本はContent directory側とする
- 存在しない参照の検証は、同期結果のcatalogとConsumerのContent schemaを接続して行う
- 画像変換や寸法検証は必要に応じてConsumer側で追加する

## 代替案

### `public/`だけでAssetを管理する

配信は単純だが、Contentとの所有関係とGitOpsの更新単位が不明確になるため採用しない。

### Astroの`image()` schemaへ統一する

Astro内では強力だが、管理画面、Git保存、単純な静的URL利用まで含むASCの共通境界としては制約が強いため採用しない。
