# Content Assets

## 目的

Content本文と、そのContentだけで使用する画像を同じdirectoryで管理し、静的配信用directoryへ安全に同期する。

```text
src/content/projects/
└── watari-ea/
    ├── index.md
    └── assets/
        ├── hero.webp
        └── gallery/
            └── detail.webp
```

ASCはcollection固有のschemaや画像の役割を持たない。派生プロジェクトが`heroImage`、`gallery`などのfieldを定義し、ASCはassetの配置、検証、同期、公開URL解決だけを担当する。

Content Bundleをdirectory単位で移動でき、collectionが増えても同じ規則を利用できるよう、本文はentry directory直下の`index.md`に統一する。`index.md`がないentryや、同じ階層に別の`.md` / `.mdx`があるentryは同期時に拒否する。構造化された補助データは`data/`、画像は`assets/`へ分離する。

## 同期

Consumer側に同期scriptを作成する。

```js
// scripts/sync-project-assets.mjs
import { syncContentAssets } from "albasimia-ssg-core/content-assets";

const assets = await syncContentAssets({
  sourceRoot: "src/content/projects",
  outputRoot: "public/images/projects",
  publicBasePath: "/images/projects",
  allowedExtensions: [".avif", ".jpg", ".png", ".webp"],
  maxFileBytes: 10 * 1024 * 1024,
});

console.log(`${assets.assets.length} assets synced`);
```

`dev`、`check`、`build`の前に同期する。

```json
{
  "scripts": {
    "sync:assets": "node scripts/sync-project-assets.mjs",
    "predev": "npm run sync:assets",
    "precheck": "npm run sync:assets",
    "prebuild": "npm run sync:assets"
  }
}
```

既定では出力directoryを同期前にcleanする。全Assetの検証が完了するまでは出力を削除しない。`clean: false`を指定すると既存fileを残したまま上書きする。

## 参照

同期結果の`resolve()`は、Assetが存在する場合だけ公開URLを返す。

```js
assets.resolve("watari-ea", "hero.webp");
// /images/projects/watari-ea/hero.webp
```

存在しない参照は`ContentAssetError`の`ASSET_NOT_FOUND`となる。Content schemaなど、filesystemを参照しない場所でURLだけを組み立てる場合は`createContentAssetUrl()`を利用できる。

```ts
createContentAssetUrl("/images/projects", "watari-ea", "hero.webp");
```

## 安全性

- 絶対パス、`..`、空segment、backslashを含むAsset参照を拒否する
- entry directory直下に`index.md`がない構成を拒否する
- entry directory直下に`index.md`以外のMarkdownがある構成を拒否する
- Asset directory内のsymbolic linkを拒否する
- `sourceRoot`と`outputRoot`が包含関係にある設定を拒否する
- 許可されていない拡張子を拒否する
- `maxFileBytes`指定時は上限を超えるfileを拒否する
- 既定の許可形式はAVIF、GIF、JPEG、PNG、WebPとする

画像の縦横寸法、圧縮率、用途別命名は派生プロジェクト固有の検証として追加する。
