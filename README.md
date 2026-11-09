# どっちが勝つ？

## 新しい戦闘エフェクトと効果音

`original-combat-audio-20261109` の内容と確認方法です。以下は配信先として使うURLです。公開済みかどうかはPagesの実行結果と実際の配信内容で確認してください。

- 通常入口: https://gbaconrice.github.io/docchi-ga-katsu/
- GRAVITY入口: https://gbaconrice.github.io/docchi-ga-katsu/GRAVITY_EXTERNAL_ENTRY.html
- 固定版: https://gbaconrice.github.io/docchi-ga-katsu/releases/original-combat-audio-20261109/gravity-entry.html
- 全127項目の新旧比較: https://gbaconrice.github.io/docchi-ga-katsu/comparisons/original-combat-audio-20261109/
- 連携用プロンプト: `GRAVITY_PROMPT.txt`
- 検証資料: `verification/original-combat-audio-20261109/`
- 再構成ツール: `tools/original-combat-audio-20261109/`

### 作り直した部分

- 戦闘エフェクト、幾何形状の演出、補助演出、状態異常・飛び道具の表示を更新。月と氷のブレスの表示位置も修正しました。
- 元の画像574点を保持し、エフェクト用画像123点を追加。キャラクター画像と照明を固定したホームGIFはそのままです。
- 戦闘音は読みやすいJavaScriptから生成する新しい合成音に変更。11系統×3種類で、追加の録音素材・外部音声素材は使いません。
- 命中・接触時の音を優先し、同時発音数を制限。初回生成後の音声時計を使って再生を予約し、生成中に予約時刻が過ぎる問題を修正しました。
- 比較画面で、視覚効果と音の全127項目を確認できます。音の23項目は変更前・変更後の処理から生成して比較します。

元の背景音・UI音、ゲームルール、命中判定、ダメージ、進行、スコア条件・送信処理、既存のSDK連携は変更しません。「外部ランキングには送信していません」の非表示も維持します。

### 再構成と検証範囲

Node.jsとPython 3を用意し、リポジトリのルートで実行します。出力先は未作成のディレクトリにしてください。

```sh
node tools/original-combat-audio-20261109/reproduce.cjs /absolute/new-output-directory .
```

`ranking-notice-fix-20261108` の固定版をハッシュ確認して復元し、表示・音の変更を適用します。既存の画像URLを保持し、単体ソースと配信用ファイルの再構成一致を確認します。

表示位置、保護対象関数、元の素材の保持、新しい音の同時発生・ミュート・一時停止・破棄、ブラウザーでの新旧音声生成を検証しています。数値検証は聴感評価とは別です。実GRAVITYの複数人通信、アカウントプロフィール、実際のスコア受付・ランキング反映、物理端末の性能やスピーカー出力は未検証です。

ソースSHA256: `7d9a28e118a2bd0312469d23993cf83e47e28532f4387aecbb8a98375fc3924f`  
内容識別子: `997b48b0642d95e67c804645fff1fedeef5b8163ceb3395c042df62465147029`

## 以前の更新: ranking-notice-fix-20261108

以下は前の版の記録です。固定リリースと検証・再構成の参照先を保存しています。

### 当時の変更

「外部ランキングには送信していません」の文言だけを表示しないようにします。他のランキング文言、記録の再試行、送信条件・処理、ゲーム進行は変更しません。画像574点、キャラクター、エフェクト、固定された照明のホームGIFも前の版をそのまま使います。

- 通常入口: https://gbaconrice.github.io/docchi-ga-katsu/
- GRAVITY入口: https://gbaconrice.github.io/docchi-ga-katsu/GRAVITY_EXTERNAL_ENTRY.html
- 固定リリース: `releases/ranking-notice-fix-20261108/`
- 連携用プロンプト: `GRAVITY_PROMPT.txt`
- 検証: `verification/ranking-notice-fix-20261108/README.md`

これらは配信先のURLです。ファイルを保存しただけでは公開版は切り替わりません。公開状態はリポジトリのPages実行結果で確認してください。

### 当時の再構成

Node.jsとPython 3を用意し、リポジトリのルートから次を実行します。出力先は未作成のディレクトリを指定してください。

```sh
node tools/ranking-notice-fix-20261108/reproduce.cjs /absolute/new-output-directory .
```

前の `terrain-emote-fix-20261108` リリースをハッシュ確認して元の単一HTMLを復元し、1文の削除と内容識別子の更新だけを適用します。現行のルート入口には依存せず、以前のリリース・画像・再構成ツールは変更しません。新リリース17ファイルと入口2ファイルの一致、画像574点の一致、対象表示・スコア処理・読込処理の回帰テストを確認します。

実機のGRAVITY、実際のランキング受付、ネットワーク、物理端末の性能を検証したとは扱いません。詳しいSDK方針・制約はリリース内の `GRAVITY_INTEGRATION.md` を参照してください。

