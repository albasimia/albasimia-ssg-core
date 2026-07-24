# Content Source Codec 公開API計画

- 状態: 設計案・未実装
- 対象: `docs/extraction-plan.md`のA-05、A-06のみ
- 作成日: 2026-07-24

## 目的

YAML sourceとYAML frontmatter付きMarkdownを、Node.js、Astro、ブラウザのいずれにも依存しない純粋関数として扱うための最小公開APIを定義する。

最初の公開APIとして小さく検証することを優先し、Content Bundle、schema検証、管理画面、GitHub保存との統合は扱わない。この文書ではAPI案、型定義、テスト計画だけを定め、実装、依存追加、既存コードの移動は行わない。

## 対象範囲

### A-05: YAML Codec

- YAML 1.2 Core Schemaとしてのparse
- 単一YAML Documentの強制
- 重複keyの拒否
- alias展開の禁止
- 決定的なserialize
- 安定したエラー分類

### A-06: Markdown Frontmatter Codec

- Markdown本文とYAML frontmatterの分離
- YAML Codecを利用したfrontmatterのparse
- frontmatterと本文からMarkdown sourceを再構築
- LF / CRLFの検出と再構築時の保持
- 安定したエラー分類

## 対象外

- Zodなどによるschema検証
- Event、Artist、Timetableを含むDomain型
- 複数ファイル間の関係検証
- ファイルサイズ上限
- draft、slug、Collection、アセット参照の検証
- YAML内のコメント、quote style、key間の空行などの文字単位での保持
- frontmatterの部分更新、path指定更新、deep merge
- MDX構文またはMarkdown本文のparse・render
- ファイルI/O、Astro loader、GitHub API、HTTP responseへの変換

schema検証とサイズ検証はB-01で、frontmatterを保った高度なsource編集はAdmin Foundationで別途検討する。

## 設計原則

### parse結果は`unknown`とする

YAMLのparseは実行時schema検証を行わないため、型引数だけで任意の型へ変換できる`parseYamlSource<T>()`は提供しない。利用側はZodなど自身のvalidatorで`unknown`を検証する。

### Event固有の語彙を公開APIへ入れない

既存の`parseEventMarkdown`は`parseMarkdownFrontmatter`へ置き換える。既定のファイル名、エラーメッセージ、型に`event.md`やEventを含めない。

### エラー判定はmessageではなくcodeで行う

管理画面などの利用側が表示文言をローカライズできるよう、ASCは安定したerror codeと診断情報を返す。英語の`message`は開発者向けとし、UI文言の契約にはしない。

### serializeはcanonical出力とする

YAMLの意味とkeyの挿入順は維持するが、元sourceのコメントや書式は維持しない。出力は2スペースindent、折り返しなし、keyの自動sortなし、末尾LFありとする。

### Markdown本文は意味を変えない

parse時は改行をLFへ正規化して`body`へ返し、元sourceの改行種別を`newline`へ保持する。serialize時は指定された改行へ統一する。本文のtrimや末尾LFの追加・削除は行わない。

## 配置案

```text
src/
└── features/
    └── content-source/
        ├── errors.ts
        ├── frontmatter.ts
        ├── types.ts
        ├── yaml.ts
        └── index.ts

tests/
└── content-source/
    ├── frontmatter.test.ts
    ├── public-api.test.ts
    └── yaml.test.ts
```

派生プロジェクトは`index.ts`から公開された名前だけを利用する。次のimport pathは配布方式の確定前であるため仮称とする。

```ts
import {
  ContentSourceError,
  parseMarkdownFrontmatter,
  parseYamlSource,
  stringifyMarkdownFrontmatter,
  stringifyYamlSource,
} from "@asc/content-source";
```

## 公開API案

### A-05: YAML Codec

```ts
export function parseYamlSource(
  source: string,
  options?: ParseSourceOptions,
): unknown;

export function stringifyYamlSource(value: unknown): string;
```

`parseYamlSource`は次の契約を持つ。

- YAML 1.2 Core Schemaとしてparseする
- YAML Documentが1つでない場合は拒否する
- 重複keyを拒否する
- aliasを展開しない
- schemaによる値の検証や変換は行わない
- 失敗時は必ず`ContentSourceError`をthrowする

`stringifyYamlSource`は次のcanonical形式を出力する。

- indentは2スペース
- 長い行を自動で折り返さない
- objectのkey挿入順を維持し、自動sortしない
- aliasまたはanchorを生成しない
- 改行はLF
- source末尾にLFを1つ付ける
- 自身が生成したsourceを`parseYamlSource`でparseできる
- 失敗時は`ContentSourceError`をthrowする

### A-06: Markdown Frontmatter Codec

```ts
export function parseMarkdownFrontmatter(
  source: string,
  options?: ParseSourceOptions,
): ParsedMarkdownFrontmatter;

export function stringifyMarkdownFrontmatter(
  input: StringifyMarkdownFrontmatterInput,
): string;
```

`parseMarkdownFrontmatter`は次の形式だけをfrontmatterとして認識する。

```text
---
YAML
---
Markdown body
```

追加の契約は次のとおりとする。

- opening delimiterはsourceの先頭にある単独行の`---`とする
- closing delimiterはopening delimiterより後にある最初の単独行の`---`とする
- delimiterの前後に空白を許可しない
- BOM、先頭空白、frontmatterより前の本文を許可しない
- YAML部分のparseには`parseYamlSource`と同じ規則を使う
- `body`内の`---`はclosing delimiterより後であれば通常の本文として扱う
- LFとCRLFを受け付け、`body`はLFへ正規化する
- 混在改行を受け付けるが、`newline`はopening delimiter直後の改行を採用する
- frontmatterがない、または閉じていない場合は`ContentSourceError`をthrowする

`stringifyMarkdownFrontmatter`は次の契約を持つ。

- frontmatterは`stringifyYamlSource`のcanonical形式で生成する
- `newline`の省略時はLFを使用する
- opening delimiter、YAML、closing delimiter、本文の間に規定の改行を置く
- `body`の改行を指定された`newline`へ統一する
- `body`の先頭・末尾空白や末尾改行を変更しない
- 生成結果を`parseMarkdownFrontmatter`でparseできる

## 型定義案

```ts
export type SourceNewline = "\n" | "\r\n";

export interface ParseSourceOptions {
  /** エラーの診断にだけ使用する。挙動は変えない。 */
  sourceName?: string;
}

export interface ParsedMarkdownFrontmatter {
  /** schema未検証のfrontmatter値。 */
  frontmatter: unknown;
  /** LFへ正規化したMarkdown本文。 */
  body: string;
  /** opening delimiter直後で検出した改行種別。 */
  newline: SourceNewline;
}

export interface StringifyMarkdownFrontmatterInput {
  /** schema検証済みかどうかは利用側の責任とする。 */
  frontmatter: unknown;
  /** LFまたはCRLFを含み得るMarkdown本文。 */
  body: string;
  /** 生成sourceの改行。既定値はLF。 */
  newline?: SourceNewline;
}

export type ContentSourceErrorCode =
  | "YAML_DOCUMENT_COUNT"
  | "YAML_PARSE_FAILED"
  | "YAML_STRINGIFY_FAILED"
  | "FRONTMATTER_NOT_FOUND"
  | "FRONTMATTER_NOT_CLOSED";

export interface ContentSourceErrorOptions {
  code: ContentSourceErrorCode;
  sourceName?: string;
  details?: readonly string[];
  cause?: unknown;
}

export class ContentSourceError extends Error {
  readonly code: ContentSourceErrorCode;
  readonly sourceName?: string;
  readonly details: readonly string[];
  readonly cause?: unknown;

  constructor(message: string, options: ContentSourceErrorOptions);
}
```

`sourceName`は`event.md`のような任意の表示名を利用側が渡すためのものであり、パスの解決やファイル読み込みには使わない。

### エラー対応表

| code | 発生条件 | `details`の用途 |
| --- | --- | --- |
| `YAML_DOCUMENT_COUNT` | YAML Documentが1つではない | 検出したDocument数 |
| `YAML_PARSE_FAILED` | syntax error、重複key、alias利用など | parserが返した診断文 |
| `YAML_STRINGIFY_FAILED` | 循環参照などcanonical形式へ変換できない値 | serializerが返した診断文 |
| `FRONTMATTER_NOT_FOUND` | source先頭にopening delimiterがない | 原則空配列 |
| `FRONTMATTER_NOT_CLOSED` | closing delimiterがない | 原則空配列 |

frontmatter内のYAMLエラーは`YAML_PARSE_FAILED`または`YAML_DOCUMENT_COUNT`を維持し、`sourceName`によってMarkdown source内の問題であることを識別する。frontmatter専用の重複したYAML error codeは作らない。

## 利用例

### YAMLをparseして派生側schemaで検証する

```ts
const sourceValue = parseYamlSource(source, { sourceName: "profile.yaml" });
const profile = profileSchema.parse(sourceValue);
```

### Markdownを編集して再構築する

```ts
const parsed = parseMarkdownFrontmatter(source, {
  sourceName: "article.md",
});

const current = articleSchema.parse(parsed.frontmatter);
const next = { ...current, title: "Updated title" };

const output = stringifyMarkdownFrontmatter({
  frontmatter: next,
  body: parsed.body,
  newline: parsed.newline,
});
```

この操作は未知のkeyを`articleSchema`が除去する可能性がある。未知のkeyを維持する必要がある利用側は、schemaの方針を適切に設定するか、検証前のobjectを基準に明示的にmergeする。ASCはDomainごとのmerge方針を決めない。

## テスト計画

テストは公開契約を優先し、VitestでNode環境から実行する。実装内部の関数や`yaml` package固有classを直接assertしない。

### `yaml.test.ts`

#### 正常系

1. object、array、string、number、boolean、nullをYAML 1.2 Core Schemaとしてparseできる
2. quoted scalarと複数行scalarをparseできる
3. `sourceName`の有無がparse結果へ影響しない
4. serialize結果が2スペースindentになる
5. serialize結果が長い文字列を自動改行しない
6. serialize結果がobjectのkey挿入順を維持する
7. serialize結果の末尾がLF 1つになる
8. 同じ値を複数回serializeして同じsourceになる
9. `parseYamlSource(stringifyYamlSource(value))`が意味的に元の値と一致する
10. 同一object参照を複数箇所に含めてもanchorを生成せず、独立した値としてparseできる

#### 異常系

1. 複数Documentを`YAML_DOCUMENT_COUNT`で拒否する
2. Documentが0件になる入力を`YAML_DOCUMENT_COUNT`で拒否する
3. syntax errorを`YAML_PARSE_FAILED`で拒否する
4. 重複keyを`YAML_PARSE_FAILED`で拒否する
5. alias利用を`YAML_PARSE_FAILED`で拒否する
6. 循環参照を`YAML_STRINGIFY_FAILED`で拒否する
7. errorに指定した`sourceName`が含まれる
8. parserの診断が`details`に格納される
9. throwされる値がすべて`ContentSourceError`である

### `frontmatter.test.ts`

#### 正常系

1. LF sourceからfrontmatterと本文を分離できる
2. CRLF sourceからfrontmatterと本文を分離し、`newline`がCRLFになる
3. parse後の`body`がLFへ正規化される
4. 空の本文を扱える
5. 本文中の単独行`---`を本文として維持する
6. frontmatterがscalar、array、nullでもschema未検証値としてparseできる
7. serializeの既定改行がLFになる
8. `newline: "\r\n"`で全体をCRLFへ統一する
9. serializeが本文の先頭・末尾空白と末尾改行を変更しない
10. LFとCRLFそれぞれでparse、serialize、再parseした結果のfrontmatter、body、newlineが一致する
11. 混在改行sourceの`newline`がopening delimiter直後の改行になり、再構築時にその改行へ統一される
12. serialize結果のfrontmatterがYAML Codecのcanonical形式になる

#### 異常系

1. opening delimiterがないsourceを`FRONTMATTER_NOT_FOUND`で拒否する
2. opening delimiterより前に空行、空白、BOM、本文があるsourceを`FRONTMATTER_NOT_FOUND`で拒否する
3. closing delimiterがないsourceを`FRONTMATTER_NOT_CLOSED`で拒否する
4. 空白付きdelimiterをfrontmatter delimiterとして扱わない
5. frontmatter内のsyntax errorを`YAML_PARSE_FAILED`で拒否する
6. frontmatter内の重複keyとalias利用をYAML Codecの規則に従って拒否する
7. errorにMarkdownの`sourceName`が保持される
8. throwされる値がすべて`ContentSourceError`である

### `public-api.test.ts`

1. `features/content-source/index.ts`から4関数と`ContentSourceError`をimportできる
2. 公開型を`index.ts`からtype importできる
3. Event、Artist、Timetable、Astro、Node.js、DOMの型が公開signatureへ現れない
4. `parseYamlSource`と`parseMarkdownFrontmatter`の戻り値が`unknown`を含み、validatorなしで任意Domain型として利用できない
5. 内部ファイルをimportしなくても全ユースケースを表現できる

型契約は`expectTypeOf`またはコンパイル専用fixtureで検証する。packageの`exports`を設定する段階では、公開subpathから同じテストを追加する。

### 移行互換テスト

`catharsiswatari-events`から次の最小fixtureだけをASCのテストへ複製し、派生リポジトリをテスト時に直接参照しない。

- nested objectとarrayを含むYAML
- YAML frontmatterとMarkdown本文を含むLF source
- 同内容のCRLF source
- 重複key、複数Document、未閉鎖frontmatterの異常source

ASC側では汎用Codecの契約だけを検証する。Event Bundle全体と既存全イベントの互換性は、派生プロジェクト側のconsumer testで確認する。

## 完了条件

実装に着手した場合は、次をすべて満たした時点でA-05、A-06を完了とする。

1. 公開APIが4関数、共通エラーclass、関連する公開型に限定されている
2. `index.ts`以外へのdeep importを必要としない
3. Node.js、Astro、DOM、Event Domainへ依存しない
4. YAMLの単一Document、重複key禁止、alias禁止、canonical出力がテストされている
5. Markdown frontmatterのLF / CRLF処理と本文非破壊がテストされている
6. 全異常系が安定したerror codeを持つ`ContentSourceError`になる
7. 派生側schemaを使う利用例が型安全に成立する
8. `npm run check`、`npm run test`、`npm run build`が通る
9. `catharsiswatari-events`側のconsumer testが通る

## 実装前の決定事項

### `yaml` packageの採用

既存実装は`yaml` packageを利用しているが、ASCにはまだ依存として追加されていない。外部依存の追加は`docs/conventions.md`によりADR対象であるため、実装前に次をADRで決定する。

- `yaml` packageをContent Foundationの実行時依存へ追加すること
- Node.jsとブラウザの両方を対象にすること
- YAML 1.2 Core Schema、重複key禁止、alias禁止を標準契約にすること
- package更新時にcanonical出力の差分をテストで検知すること

### packageの公開subpath

`@asc/content-source`はこの文書上の仮称である。ASCの配布方式と`package.json`の`exports`を別途決め、確定したsubpathへ置き換える。

これらは実装前に決定する事項であり、この計画の作成時点ではpackage設定、依存、source codeを変更しない。
