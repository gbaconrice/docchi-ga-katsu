# どっちが勝つ？ — v6.2 品質修正候補

- 可視ページの低 RAF 頻度で時間が切り捨てられ、戦闘が不必要に長引く処理を修正。固定1/60 tick は維持し、1フレーム最大120 tick・8ms予算で処理、残り時間は保持。非表示/停止再開/次戦では backlog をリセットします。小さな戦闘時間表示も追加。実ブラウザでの遅さの原因は未確定で、公開後の比較が必要です。
- マルチ参加者の配置確認で、次戦の編成を受信しても前の配置図が残る不具合を修正。
- 予想画面に、現在の編成から選べる短い兵種説明を追加。対空・回復・召喚・大型の性質を確認できます。
- 上乗せの的中利益、見るだけ・引分、純益スコアの意味を明確化。経済ルール・兵種数値・物理・財布・通信プロトコルは変更していません。
- 正規全 inline script と登録 handler、RAF で全20戦・停止/速度・ホーム中断再開・再戦を検証。TextEncoder 欠落でもソロ起動を確認。
- この候補の実画面 QA は未実施。実 SDK 通信・ネイティブ負スコア受付も未検証です。公開は別途承認・確認後です。

主な追加試験: `node formation-ui-test.cjs`、`node unit-traits-ui-test.cjs`、`node full-loop-ui-test.cjs`、`node solo-timing-ui-test.cjs`。

---


# どっちが勝つ？ — v6 モンスター・演出・共有時計の試作
**画面/実端末/実SDK通信は未検証。製品版の品質やネイティブ動作を保証しません。**
7基本兵種＋4モンスター、独自G予想、ホスト確定replay、GRAVITY向け明示操作bridgeを単一HTMLに統合した版。

## 遊び方
開始100 G、全20戦。無料0 Gまたは任意上乗せ10/25/50 G（残高以内）。的中は+10 G＋上乗せ同額の利益、不正解は上乗せのみ失う。引分±0。Gは購入/換金不可。
未選択/見るだけ/締切欠席は賭けも無料報酬もない。0残高でも無料予想を続けられる。残高、signed純益（残高−100）、正解数を分離。純益だけで順位を決め、同額は同順位。
比較→戦場→結果を分離。ひとり用は初期ロードで通信なし。マルチは30秒または全員確定でlock。同じ単兵種同士を避ける編成生成であり、戦闘結果を見て引き直さない。

## 兵種・生成
基本7種は剣/盾/槍/弓/砲/騎/癒。新4種：
- 小鬼：小型・高速、地上近接、50 HP。
- 岩巨人：大型・重い・遅い、390 HP、50 damage/2.5秒、半径25、mass2600。地上近接だけ。接触演出はAoEではない。
- 羽トカゲ：飛行、地上/空中へ攻撃。地上近接からは攻撃できず、弓/砲/亡霊等が対空。配色は象牙/葡萄色の新version、旧青緑/橙版は未同梱。
- 亡霊術師：見た目は浮くがcollisionは地上。小鬼を最大3体召喚。初回0.25秒、以後1.5秒。確定召喚は次tickに参加し、同tick親死亡でも残る。
身体衝突と表面射程、前衛の進路妨害あり。矢を味方盾で遮るシステムはない。回復は攻撃target maskと独立。
第1〜5戦は元5種の異種単兵種・実支払同額12〜24。小鬼は6、巨人は8、羽トカゲは12、亡霊は15戦目から候補。6〜11戦は最大2種、12〜20戦は最大3種/軍。飛行を入れる場合、相手に対空兵を持たせる生成eligibilityを使う。コスト/後半混成は未較正。
通常生成は最大8初期兵/軍（計16）。召喚込み同時active上限32/軍。初期32全亡霊を仮定する理論上界は累計128/軍・256 entity。大規模はstress試験であり通常生成ではない。
勝利軍継承/同兵種リロールは未実装。既存勝者予測型を参考にした独自の独立戦モードで、原作画像や原作コードは使わない。

## アート・効果
11種の独自pixelart。セルは48/64/80/96で余白差を保持し同pixel倍率。monsterはmetadataのanchor/hoverと陣営markerを使用。羽トカゲPNG SHA256:
50da06d7da8a338a639d0fa17fdc6eeb2fec71e7c934b1a521a227768cffc5eb
PNGとtemplate/indexの埋込全4箇所が一致。新画像は原画PNGだけ確認、ゲーム画面検証ではない。
SpritePilotのCC0 PNG5点は公式bytes無改変。hitはresolved_hit、矢は実弾、muzzleは砲のrelease、slamは巨人の実接触、sparkleは成功回復/実召喚だけ。虚偽crit演出なし。HP純差ではなく正式sim eventを使い、同tick回復/被弾も区別する。
transient cap24/軽量12、slam4/sparkle4/muzzle6。hitは近接12px/80msを表示だけまとめる。弾のsimulationを省略しない。軽量時の矢はframe0。CC0 provenance/credits/legalcodeはassets/effects内。元サイトHTMLや未採用ライセンスは同梱しない。

## マルチ・共有時計
2人ローカルmockは同端末内だけで、相手は自動無料予想。実SDKではない。
部屋create/joinは明示操作だけ。SDK1.0.2は既知URLから必要時ロード。SDK返却roomIdを表示。初戦後新IDは観戦者、同ID再接続で資金再発行なし。部屋上限8人は仮のアプリ制約。
ホストが戦闘/財布を確定。startBattleの確定損益はACK拒否/離脱/転送timeoutでも取り消さない。ゲストは再simせずcanonical traceを表示する。broadcastは秘匿ではなく、ホストは信頼サーバー/不正防止機構ではない。
replayは初期metadata＋spawn/despawn/token/位置差分/HP/pose/実effect。位置10fps、被弾/攻撃/死亡は元tick。死亡表示後にvisual despawn、sim記録は消さない。初期64/cumulative256のboundsを検証。
replayStartAtはホスト時刻+2000ms。guestはping/pong midpointからhost時計を推定し、記録の遅着時には共有sceneTickへ追いつく（local0から再開しない）。未知/古い/不確かな時計は待機。非対称遅延で正確同期を保証せず、推定誤差をUI表示する。
6,000byte raw（base64約8KB）chunk、100ms間隔、ACK/再送、2MiB上限。SDK保証値ではない。遅配で観戦区間が省略されても確定財布は維持。
ホスト喪失は停止。永続セーブ、host migration、暗号認証、通信保証はない。

## スコアbridge
内部scoreはsigned純益。最終残高へすり替えず、負値をclampしない。
20戦結果後の終了/ロビー/再戦という本人の明示操作で、sessionあたり1attemptだけ window.parent.postMessage({type:'gameOver',score}, '*') を呼ぶ。観戦者・他人・早期退出のscoreは送らない。
standaloneでは送らない。埋込＋明示isGravity flag、または埋込＋SDK.getMyUserInfo成功でruntimeを確認するので、通常は手動parameter不要。未ロード時は終了操作で既知SDKを取得するが部屋を自動作成しない。
SDK/native側の負値受理・保存・ランキング反映は未確認。postMessage呼出成功を受付成功とは表示しない。例外でゲーム進行を壊さず自動再送もしない。開発時の確認はmockのみで、実ランキングへの送信は未検証です。

## 検証
- node wallet-ui-test.cjs : 20戦通し/0残高復帰/純益/skip
- node multi-ui-test.cjs / sdk-ui-test.cjs : local room/mockSDK/明示操作
- node multi-clock-ui-test.cjs : 実UIで7秒clock skew、3.2秒chunk遅配＋欠落再送、guest初tick142へcatchup、1222観測でhostと一致（対称mock経路）
- node ranking-ui-test.cjs / node --test ranking/*.test.mjs : 負score/本人のみ/重複/standalone/例外
- node --test wallet/wallet.test.mjs wallet/audit/*.mjs multiplayer/*.test.mjs : ledger/atomic/ACK拒否/clock
- node asset-frame-test.cjs / effects-event-test.cjs : 11×2×9pose/CC0原本hash/実event/caps
- node monster-tests/monster-tests.cjs : 最終solver16feature tests、no-hook/array/callback同一
- node monster-tests/generator-invariants.cjs : 4000生成、100seed mirror/list/choice
- node monster-tests/full-adapter-equivalence.cjs : 独立最終coreの20goldenとsprite/effects統合が完全一致
- node replay/compact-replay.test.mjs / dynamic-replay.test.mjs / large-core-replay.test.mjs : actual tick一致、spawn/despawn、256上界、実core大規模payload
重い全量の既PASSと最終変更の対象testsを分けて記録。画面/実端末/実SDK/実ランキングは未実施で、これらのmock成功から推測しない。
python3 build_standalone.py でsource、physics、wallet、multiplayer（clock-sync含む）、ranking、replayを単一HTMLへ再bundleできる。

## 既知の限界
視認性、タッチ、フレーム落ち、実端末CPU/熱、非対称/極端な遅延、nativeAPIの制約、balance/costは未検証または未較正。新monster統合は完成品の品質保証ではない。このリポジトリはコードの公開であり、Pages配信は含みません。
