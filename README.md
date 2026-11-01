# どっちが勝つ？ — v7 / 17兵種の予想バトル

独自コード・独自pixel artで制作したプロトタイプです。原作ゲームの発想を参考にしていますが、画像やコードの転用ではありません。

## 遊び方
ホームで「ひとりで遊ぶ」を選び、両軍を見比べて予想します。全20戦。開始100 G、無料的中+10 G、任意上乗せ0/10/25/50 G（残高以内）。的中は上乗せ額と同額の利益も加算、不正解は上乗せだけ失います。見るだけ・引分は増減なし。残高0でも無料予想は継続でき、スコアは純益＝残高−100 Gです。Gは購入・換金できません。

## 追加6種（既存11種・経済ルールは不変）
- 突進猪：一度だけ速く突進して敵を押し込む。
- 爆弾甲虫：近づいて自爆し、周囲の地上敵を巻き込む。
- 氷術師：氷弾で移動を一時的に遅くする。延長・重ね掛けなし、短い耐性時間あり。
- 雷術師：近い敵へ最大3体まで雷が連鎖。
- 地潜り虫：被弾できる予告0.5秒→潜行0.3秒→一度だけ後ろへ浮上。
- 分裂スライム：倒れると小スライム2体を次tickに予約。子は再分裂しない。

選択可能17種、分裂の子を含む内部18種。子には専用32px atlasを使用。初期軍には生成しません。第3戦は突進猪または分裂スライムの単兵種比較を同予算で紹介し、種の左右はseedで反転。その後は候補抽選。第6戦から自爆/氷、第10戦から雷、第12戦から潜行も候補に入り全17種が揃います。第1〜5戦は単兵種、第6〜11戦は最大2種、以降最大3種。爆弾だけの軍には同コストの剣士を1体混ぜます。戦闘結果を見て再抽選する処理はありません。

## 表示・シミュレーション
比較カードは代表姿＋人数、「配置を見る」で実際の布陣を表示。特徴は現在の兵種から選択して短く確認できます。攻撃・自爆・氷・連鎖・潜行予兆・分裂の演出は解決済みの実イベントだけに対応します。

固定1/60 tick、二相ダメージ解決、半径衝突。同じseed/戦力で予想先によって結果は変わりません。地上/飛行を区別し、矢に味方遮蔽はありません。勝者軍の持ち越し・同種リロールは未実装です。通常初期は最大8体/軍（16体全体）。active+予約32/軍、wraith3体召喚・slime2体分裂が有限のため初期32体/軍stressでも総生成128/軍以下。256entityはstress上限であり通常モバイル性能保証ではありません。

可視RAFの遅れは固定tick backlogに保持し、1frame最大120tick/8ms処理予算。非表示・停止再開・開始・次戦で時計をリセットします。戦闘時間上限60秒はsim時間です。

## マルチ・ランキングの留保
部屋操作は明示ボタンのみ。単独ロードでSDK/部屋通信を開始しません。実SDK/GRAVITY通信・負の純益スコア受付は未検証です。ホストが作成したcanonical replayを配り、ゲストは再計算しません。減速/潜行/突進flagsと雷の接続先、spawn/despawnも記録します。6KB raw chunk、100ms間隔、2MiB上限はアプリ側設定でnative quota保証ではありません。時刻同期は推定誤差を持ち、遅着時は共有scene tickに追いつきます。観戦ACK拒否や遅配で確定損益は取消されません。

ホストは信頼前提で暗号学的権威・秘匿保証はなく、再接続の永続保存やhost移行も未実装。同一部屋のv6/v7混在は非対応です。ランキングは20戦完了後の明示終了/再戦操作で本人のsigned純益だけを1回送る設計、standaloneでは送信しません。

## 検証・再ビルド
`python3 build_standalone.py` で外部module importなしのindex.htmlを再生成。

- `node inline-boot-test.cjs` / `NO_ENCODER=1 node inline-boot-test.cjs`
- `node full-loop-ui-test.cjs` / `node solo-timing-ui-test.cjs`
- `node expansion-events-ui-test.cjs` / `node expansion-replay-ui-test.cjs`
- `node expansion-tests/tests.cjs` / `node expansion-tests/caps-test.cjs`
- `node replay/v7-schema.test.mjs` / `node replay/compact-replay.test.mjs`
- `node asset-frame-test.cjs` / `node multi-clock-ui-test.cjs`

旧11種結果一致、20seed mirror/list/choice/nohook、各新種に効く/弱いfixture、3000生成で17種・同予算紹介・種数上限、実20戦UI、18種×赤青×9frame、exact-tick HP/死亡/状態/replayをheadless検証しています。最終新種の対戦probeは expansion-tests/final-balance-probes.json。全混成バランスの完全較正やモバイル性能保証ではありません。v6.2で実ブラウザ2戦を確認しましたが、v7新要素の実画面・スマホ縦・実native QAは公開後に別確認が必要です。

## アセット
独自spritesと、採用したCC0効果5点。CC0 provenance/legalcodeは assets/effects に同梱。全体への新たなLICENSE付与は行っていません。私的会話・認証・原作画像は含みません。
