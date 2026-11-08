# どっちが勝つ？

## 今回の変更

「外部ランキングには送信していません」の文言だけを表示しないようにします。他のランキング文言、記録の再試行、送信条件・処理、ゲーム進行は変更しません。画像574点、キャラクター、エフェクト、固定された照明のホームGIFも前の版をそのまま使います。

- 通常入口: https://gbaconrice.github.io/docchi-ga-katsu/
- GRAVITY入口: https://gbaconrice.github.io/docchi-ga-katsu/GRAVITY_EXTERNAL_ENTRY.html
- 固定リリース: `releases/ranking-notice-fix-20261108/`
- 連携用プロンプト: `GRAVITY_PROMPT.txt`
- 検証: `verification/ranking-notice-fix-20261108/README.md`

これらは配信先のURLです。ファイルを保存しただけでは公開版は切り替わりません。公開状態はリポジトリのPages実行結果で確認してください。

## 再構成

Node.jsとPython 3を用意し、リポジトリのルートから次を実行します。出力先は未作成のディレクトリを指定してください。

```sh
node tools/ranking-notice-fix-20261108/reproduce.cjs /absolute/new-output-directory .
```

前の `terrain-emote-fix-20261108` リリースをハッシュ確認して元の単一HTMLを復元し、1文の削除と内容識別子の更新だけを適用します。現行のルート入口には依存せず、以前のリリース・画像・再構成ツールは変更しません。新リリース17ファイルと入口2ファイルの一致、画像574点の一致、対象表示・スコア処理・読込処理の回帰テストを確認します。

実機のGRAVITY、実際のランキング受付、ネットワーク、物理端末の性能を検証したとは扱いません。詳しいSDK方針・制約はリリース内の `GRAVITY_INTEGRATION.md` を参照してください。
