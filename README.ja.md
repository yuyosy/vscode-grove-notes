<h1 align="center">
  <a href="https://github.com/yuyosy/vscode-grovenotes" target="_blank">
    <img src="resources/icon/product-icon.png" alt="GroveNotes Logo" width="200px">
  </a><br>
    GroveNotes – Notes Tree View
</h1>
<p align="center">VS CodeおよびVS Codeベースのエディタのサイドバーから、直接ツリー表示でノートを管理できます。</p>

**English version: [README.md](README.md)**


## 機能
GroveNotesは、エディタから離れることなくノートを整理・管理できるVisual Studio Code拡張機能です。

- ノート管理用のツリービュー
- ネストされたフォルダとMarkdownファイルのサポート
- 素早く作成できるノートテンプレート
- 整理しやすいタグシステム
- バージョン管理のためのJujutsu VCS統合

## インストール

この拡張機能は、Visual Studio Code MarketplaceとOpen VSX Registryで公開しています。

- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yuyosy.grove-notes)
- [Open VSX Registry](https://open-vsx.org/extension/yuyosy/grove-notes)

## バンドルされた依存関係

この拡張機能には、以下のバイナリが同梱されています：

- **[Jujutsu (jj)](https://github.com/jj-vcs/jj)** - バージョン管理システム
  - ライセンス: Apache License 2.0
  - 有効化時にバージョン管理機能で使用されます
  - システムに`jj`がインストールされている場合は、そちらが優先的に使用されます

独自の`jj`インストールを使用したい場合は、以下からインストールできます：
- 公式サイト: https://www.jj-vcs.dev/latest/
- GitHubリリース: https://github.com/jj-vcs/jj/releases

## 使い方 / スクリーンショット

TODO: 使い方とスクリーンショットをここに追加します。

## テンプレート変数

テンプレート（テンプレートフォルダ内の`.md`ファイル）とファイル名フォーマット文字列は、`{{ }}`内に以下のトークンをサポートしています。

### 日付 / 時刻

| トークン | 説明 | 例 |
|---|---|---|
| `{{YYYY}}` | 4桁の年 | `2026` |
| `{{MM}}` | 2桁の月 | `04` |
| `{{DD}}` | 2桁の日 | `15` |
| `{{HH}}` | 2桁の時（24時間制） | `09` |
| `{{mm}}` | 2桁の分 | `30` |
| `{{ss}}` | 2桁の秒 | `05` |

トークンは1つの`{{ }}`内で自由に組み合わせられます：

```
{{YYYY-MM-DD}}  →  2026-04-15
{{YYYY/MM/DD}}  →  2026/04/15
{{HH:mm:ss}}    →  09:30:05
```

### ノートタイトル

| トークン | 説明 |
|---|---|
| `{{title}}` | ユーザーが入力したノートタイトル |

### カウンター（ファイル名フォーマットのみ）

重複するファイルが存在する場合に自動採番に使用されます。

| トークン | 説明 | 出力例 |
|---|---|---|
| `{{N}}` | パディングなし | `1`, `2`, `3`… |
| `{{0N}}` | 2桁ゼロパディング | `01`, `02`… |
| `{{00N}}` | 3桁ゼロパディング | `001`, `002`… |

> ゼロを追加すると出力桁数が増えます：`{{000N}}` → `0001`, `0002`…

### テンプレートフォルダ階層

> このルールは**テンプレートフォルダ名のみ**に適用され、ファイル名フォーマット文字列には適用されません。

テンプレートを含むフォルダは、作成されるノートのターゲットサブディレクトリを定義できます。  
フォルダ名内では、`.`がパス区切り文字として扱われます：

| テンプレートフォルダ | 例（2026-04-15の場合） |
|---|---|
| `{{YYYY}}.{{YYYY-MM}}.{{YYYY-MM-DD}}` | `notes/2026/2026-04/2026-04-15/` |
| `{{YYYY}}.{{MM}}` | `notes/2026/04/` |
| `archive.{{YYYY}}` | `notes/archive/2026/` |

フォルダ名に分割せずにリテラルの`.`を含めるには、`{{.}}`を使用します：

```
v1{{.}}0  →  notes/v1.0/
```

テンプレートディレクトリ内のネストされたサブフォルダにテンプレートが保存されている場合、そのフォルダ階層はそのまま保持され、`.`展開と組み合わされます：

| テンプレートディレクトリ構造 | 例（2026-04-15の場合） |
|---|---|
| `.templates/diary/{{YYYY}}.{{MM}}/` | `notes/diary/2026/04/` |
| `.templates/work/{{YYYY}}.{{MM}}.{{DD}}/` | `notes/work/2026/04/15/` |
| `.templates/archive/{{YYYY}}/` | `notes/archive/2026/` |

## Contributing

GroveNotesに貢献したい場合は、リポジトリをフォークしてプルリクエストを送信してください。バグ修正、新機能、ドキュメントの改善など、あらゆる種類の貢献を歓迎します。

- [GitHub - yuyosy/vscode-grove-notes](https://github.com/yuyosy/vscode-grove-notes)

## 名前の由来

「Grove（小さな森）」という言葉は、木々が集まる小さな場所、つまり物事が共に育つ場所を意味しています。

GroveNotesは、まさにそんなコンセプトから生まれました。あなたのメモをただ溜め込むんじゃなくて、木を育てるみたいに整理して成長させていく場所です。

ちなみに、Jujutsu（ジュジュツ）のアイコンは鳥なんだけど、実は森（Grove）と鳥って結構相性いい感じだと思います。🌳🕊️

木の上でメモを育てて、バージョン管理までバッチリ。


## ライセンス
このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください.

