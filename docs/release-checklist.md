# v0.1 release checklist

`0.1.1`をnpmへ公開する直前に、release担当者が実行・確認する。CIは検証までを担当し、npm publish、GitHub Release、実Cloudflare deployは行わない。

## Repository検証

- [ ] clean installとして`npm ci`が成功する
- [ ] `npm run check`が成功する
- [ ] `npm run test`が成功する
- [ ] `npm run build`が成功する
- [ ] `npm pack --dry-run`が成功する
- [ ] `npm run test`内のpacked package consumer testが、5つのTypeScript subpath、BaseLayout、CSS、sitemapをinstalled packageから検証する
- [ ] CIがcheck、test、package build、pack/distribution test、sample static buildを実行する

## 配布物とmetadata

- [ ] tarballが`package-dist`の公開生成物、deployment template、README、CHANGELOG、LICENSE、package metadataだけを含む
- [ ] tarballに`src`、tests、sample site、CI、docs、raw SCSS、credentialが含まれない
- [ ] `package.json`とCHANGELOGのversionが`0.1.1`で一致する
- [ ] repository、homepage、bugs、author、keywords、license、engines、peer dependencyを確認する
- [ ] MIT LICENSEの内容とcopyright holderを確認する
- [ ] CHANGELOGまたはrelease notesが公開内容と一致する
- [ ] token、Authorization header、Cloudflare account IDなどのsecret実値がtracked filesとtarballへ混入していないことを確認する

## 派生project確認と公開判断

- [ ] `catharsiswatari-events`でA-05 YAML codecとA-06 Markdown frontmatter codecを実データに対して利用確認する（本repositoryのrelease作業では移行しない）
- [ ] 修正版tag `v0.1.1`からclean installし、`prepare`後の`package-dist/`とAstro buildを確認する
- [ ] 公開version、npm account、公開範囲をrelease担当者が最終確認する
- [ ] `npm publish`は自動化せず、上記確認後に手動で判断する
