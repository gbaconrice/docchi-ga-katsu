# v10 baseからの較正統合

この下の成績は凍結baseのものです。現在generatorはsoft_weightへ更新し、正規inline起動/10戦carry/1000生成/hostguest replayを再試験しています。比較根拠はcalibration/とREADMEを参照。physics/wallet/UIはbaseから不変。

# v10 基盤候補の検証

未公開候補。実画面/実スマホ/音の実機試聴/実SDK通信は未検証。ブラウザや代替rendererは使用していない。

## 対象
10戦モード、左右配置、新品winner-left carry、iOSカード枠の内側化、即時結果+3秒progress、自動再生倍率。経済/個体stats/capは不変。reactions/強音/新大技/追加兵種は未統合。

## 実行済み
- 正規inlineHTML起動、draft→confirm、静止preview復帰、10戦carryと再戦、11戦非生成。TextEncoder欠落fallbackもPASS。
- wallet/protocol/transfer/SDKmock/ranking 36 tests、quick10 mode 6 tests、clock+pace 6 tests、atomic ledger/replay 4 tests PASS。
- 60/10/4/2/1fpsで勝敗/HP/位置一致。pause/hidden/home/next/startで前戦backlog漏れなし、8ms目安/120stepフレーム上限。
- 60sim秒引分の加速fixtureは60/10/2/1fpsで同一終了state。通常約36.7可視秒、低fpsでは作業上限優先。手動2×は自動2×と乗算されない。
- 7秒時計差/3.2秒chunk遅配/欠落再送後のhostguest sceneTick一致。非対称経路の時計誤差はuncertaintyとして留保。
- 64初期兵→162entities/98children、最大active32/軍、1928ticks。canonical326142 bytes/55chunks復元、2MiB上限内。mock5.5秒転送は実SDK速度保証ではない。
- 右勝利→新品構成を左へ移し、元左右でwallet精算済み。guest physics呼び出し0。room admission失敗でworld/ledgerは原子的に不変。
- 18内部種×2team×9frames、CC0effects5点hash、cameraドラッグ/境界/reset、audio trusted resume、motion reduced/hidden/cancel PASS。

- 独立生成540構成＋20series200戦＋逆choice200再戦＋0G10戦PASS。全17種、初期/active32、records最大82/軍、右平均予算19→91.95、通常160cap到達0。別seed集合の勝敗は左71/右129/引分0。

## 意図的な留保
- 200戦baseline右140/左59/引分1。勝者初期残HP平均38.7%、生存cost63.5%、初期兵無損失14.6%。接戦較正済みとはしない。別候補でoffline較正中。
- 10戦版はGRAVITY_QUICK10_V1、旧20戦wire/stateを拒否。外部gameOverは既存type/scoreだけで、外部board分離設定は要確認。実送信なし。
- multiは共有host時刻で再生。非表示guestだけの停止時間は差し引かず復帰時catchupする。host権威の信頼/秘匿/永続再接続の課題は未解決。
