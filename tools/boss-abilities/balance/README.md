# ボス対戦検証の再実行

Node.js 24系（検証時はv24.22.1）と同梱ファイルだけで実行できます。npmパッケージ、ネットワーク接続、非公開ディレクトリは不要です。ゲームの戦闘処理をHTMLから読み込み、指定した編成・シード・左右反転条件で再実行します。画面描画やブラウザー操作の試験は含みません。

## 入力HTML

外部スクリプトを参照するローダーHTMLではなく、すべてのゲームスクリプトを含む復元済みHTMLを指定してください。`docchi-demand-images-v1`形式の公開パッケージでは、リポジトリ内の共有画像も揃えたうえで、次のコマンドで復元できます。`RELEASE_DIR`には対象版の`manifest.json`を含むディレクトリを指定します。

```sh
node tools/boss-abilities/balance/reassemble-demand-source.cjs RELEASE_DIR reports/balance-input.html
```

復元処理はパッケージ内の各ファイルと元HTMLのハッシュを検証します。直接、同一の単一HTMLを用意しても構いません。

今回検証したHTMLのSHA-256：
`649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7`

## 全条件を新規に実行

リポジトリのルートから実行します。既存結果を入力に流用しません。出力先には新しいディレクトリを指定してください。既存ディレクトリへの出力は拒否します。開始前に入力JSONの件数とSHA-256を同梱マニフェストと照合します。

```sh
node tools/boss-abilities/balance/run-all.cjs --html reports/balance-input.html --out reports/balance-reproduced --workers 2 --expect-sha 649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7
```

`--workers`は同時実行数で、1〜4を指定できます。既定は2です。各ランナーは途中経過も保存するため、終了コードと完了件数を必ず確認してください。`FULL_STEP`環境変数は設定せず実行してください。本検証と同じ`combatStep`経路を使います。

| 入力 | 件数 | 実行ファイル |
|---|---:|---|
| `jobs/controlled.json` | 2,208 | `combat-duels.cjs`、2分割 |
| `jobs/mixed.json` | 196 | `combat-duels.cjs` |
| `jobs/lich-support.json` | 80 | `lich-duels.cjs` |
| `jobs/cleaver-support.json` | 88 | `cleaver-duels.cjs` |
| 合計 | 2,572 | 重複確認を含む実行回数 |

全入力の件数とSHA-256は`job-manifest.json`に記録しています。支援試験の対照軍、既存・別シード・新規シード、ソードマン2体を添えた確認も、これらのJSON内で指定済みです。編成やシードを追加する必要はありません。

## 出力と再集計

- `manifest.json`：実際に読んだHTMLのSHA、入力ファイルのSHA、実行条件。
- `controlled0.json`、`controlled1.json`、`mixed.json`、`lich-support.json`、`cleaver-support.json`：全対戦の生データ。
- `catalog.json`：そのHTMLから取得したユニット情報と実際の価格。
- `portable-summary.json`：群別の勝敗、49種類別集計、左右反転一致、コスト照合、時間切れと生存者情報。
- 同名の`.log`：起動と進捗。

対戦を増やさず集計だけをやり直す場合：

```sh
node tools/boss-abilities/balance/summarize.cjs reports/balance-reproduced
```

各対戦の元ランナーを直接呼ぶ場合は、`GAME_HTML`に同じ復元HTMLを設定し、`入力JSON 出力JSON 分割番号 分割数`の順で渡します。分割番号は0始まりです。価格表を書き出すときだけ、`combat-duels.cjs`に`CATALOG_OUT`も設定します。

支援ランナーはダメージ・召喚数などを観測します。リッチの生データにある古い`reason: cap`ラベルは累計3体の診断基準が残っているため、現行の上限確認には実測の`maxLiveChildren`と`raised`を使ってください。上限は同時3体・合計6体です。

左右反転と別群の重複確認を独立標本として合算しないでください。固定したテスト編成の結果であり、ランダム編成全体の勝率や予測確率の校正を示すものではありません。
