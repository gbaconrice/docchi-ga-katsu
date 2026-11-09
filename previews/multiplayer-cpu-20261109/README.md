# どっちが勝つ CPUテスト専用

本番とは独立した検証版です。CPU機能は本番のHTML、コード、公開入口に追加していません。

## 起動

このフォルダをHTTPで配信し、`index.html`を開きます。ファイルを直接開かず、HTTPを使用してください。

```sh
python3 -m http.server 8872 --bind 127.0.0.1 --directory multiplayer-cpu-test-20261109
```

同じコンピューターのブラウザで `http://127.0.0.1:8872/` を開きます。外部から使える試遊URLではありません。

1. CPU人数を1～7人から選び、「テストルームを作る」を押す。
2. ルームロビーの「対戦を開始」を押す。
3. 人間が予想と賭け金を確定すると、全員確定または時間切れで戦闘が始まる。
4. CPUは10、11、12戦目の結果で順次終了する。人間が先に終了しても残ったCPUの進行を確認できる。

「CPUを1人追加」は初戦開始前のみ。「選択だけ」「何もしない」は未確定の時間切れ確認用。「CPUのエモート」で表示を確認できます。

## 検証範囲

- 既存のMultiProtocol、MultiBinding、財布処理、リプレイ分割転送・ACK、エモートの通信形式を使用。
- CPUは未来の結果を見ず、固定シードで予想を選択。プレビューと確定は別の操作。
- 通信先は同じブラウザ内の仮参加者。GRAVITYへ接続せず、外部ランキングへ送信しない。
- テスト用プロフィール名を使用。実際のGRAVITYプロフィール、アイコン取得、端末間通信、切断・再接続、ホスト交代、ランキング受信確認は対象外。
- ゲーム画像などは既存の公開URLを参照するため、素材読み込みにはインターネット接続が必要。
- この版は元の公開リリースを固定コピーしている。別の修正を統合した最新版を試すには下記の更新を行う。

## ベース更新

```sh
python3 multiplayer-cpu-test-20261109/refresh-baseline.py PATH_TO_INTEGRATED_RELEASE --commit COMMIT_OR_CANDIDATE_NAME
node multiplayer-cpu-test-20261109/tests/protocol.test.cjs
```

更新先はこのフォルダのbaselineとgame.htmlのみです。本番へのCPUコード混入はしません。更新後はロビー、予想、戦闘、結果、次戦、最終結果のブラウザ再確認が必要です。

## 実施済み検証

`evidence/protocol-results.json`: 10項目PASS。8人上限、確定待ち、60秒時間切れ、リプレイACK、エモート、10～12戦の終了・続行、全員終了後のロビー復帰と最終残高保持。

`evidence/isolation-results.json`: 統合版との一致、本番へのCPUコード混入なし、外部ランキング・SDK接続・送信再試行の遮断、テスト入口制約の6項目PASS。実行コマンドは `node multiplayer-cpu-test-20261109/tests/isolation.test.cjs PATH_TO_INTEGRATED_RELEASE`。

`evidence/hud-environment-results.json`: テストルーム入口の画面初期化を本番と揃え、共用HUDが初戦から地形を表示すること、CPU全員に同じ地形データが届くことなど5項目PASS。実行コマンドは `node multiplayer-cpu-test-20261109/tests/hud-environment.test.cjs`。初期版の「地図未定」はこの画面初期化漏れによる表示問題で、地形データの欠落ではありませんでした。

2026-11-09のブラウザ手動確認: ロビー作成、CPU追加、5人の予想・確定、CPUエモート、実際の戦闘再生、結果表示、次戦への移行、部屋の作り直し、8人の参加者表示を確認。ゲーム由来のコンソールエラーは観測せず。GRAVITY実接続の検証ではありません。

`tests/browser.test.cjs`は開発環境向けの自動テスト草案です。この実行環境はChromium起動がsocket制約で失敗するため、自動テストの合格は未確認です。上記の確認には別の利用可能なブラウザを使用しました。

## 配布時の注意

テスト版を公開する場合も本番と別のパス・入口に置いてください。本番のmanifestからcpu-room.jsやtest-harness.jsを参照しないこと。仮CPUの結果を本番ランキングへ送らないこと。

`DEPLOY_FILES.json`にブラウザ配信に必要な11ファイルと、不要な旧baselineファイルを記録しています。baseline更新後はこの一覧も作り直してください。検証用のmanifestやtestsはGitで保持できますが、ブラウザ実行には不要です。
