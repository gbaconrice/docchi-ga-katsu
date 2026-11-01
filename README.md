# どっちが勝つ？ — 大軍・ソロ延長候補（24兵種）

独自コード・pixel art・合成音による予想バトル。単一HTMLは外部module/CDNなしでソロ動作します。この版の実画面・実スマホ・native SDK通信・音の実機試聴は未検証で、公開後に実画面確認を行う予定です。既存公開版や過去のQAと混同しないでください。

## 操作と財布
BET（0/10/25/50 G）→軍カードを選択→「対戦開始」。未選択の自動賭けはありません。「配置を見る」は同じ戦場の静止プレビューで、予想・BET・乱数・財布を変えず戻れます。戦闘中は兵情報、音、速度、zoom/pan/全体表示、pauseを利用できます。リアクションは任意です。

開始100 G、最初10戦は的中報酬10 GとBET同額の利益、はずれはBET分だけ失います。引分0 G。Gは購入・換金できないゲーム内通貨です。純益は現在残高−開始100 G。通常は残高を主役にし、選んだ区切りの結果だけ「開始時より ±N G」を表示します。

ソロは区切りで終了/追加5/追加10を**明示選択**。11戦以降は的中の無料10 Gをなくし、BET損益のみ。0 BETは正解でも0 G、残高0でも続行可能ですが無料復活ボーナスはありません。資金・勝者構成・累計成績を継続し、新規run開始時だけ100 Gへ戻します。結果は実差額を表示し、非区切り戦のみ可視時間3秒で次へ。追加操作なしで賭けたり延長したりしません。

multiplayerは従来の10戦固定で、延長合意/退出制度は未導入です。host確定結果・本人の精算を共有し、guestは再シミュレーションしません。切断や録画受信拒否で確定損失を取り消せません。ただしhostの不正に対するサーバー権威はなく、実SDK通信は未検証です。

## 勝者・増援・規模
- 実際のwinnerの戦闘開始構成を全員新品で次の左へ。死者除外・残HP・召喚子の持越しはありません。
- 左の元構成を消さず人数優先で増援し、後半は別種追加も可能。予想や財布は生成に関与しません。引分は両軍新規。
- 右は第4戦以降2種、第7戦以降3種。全24種が第7戦までに候補になります。
- 正規seedから先に規模型を決め、その型内の有限候補を静的な編成推定で選びます。実戦solverによる勝敗選別・予想後の調整はありません。
- 第7戦以降の仮抽選設定はnormal65%/swarm25%/giant10%。swarmは右50〜64体、giantは右20体以下かつ半数以上がradius25以上。予算/配置/対空不適合はnormalへ明示fallbackします。
- 左右各64 active（予約含む）、初期合計128、全生成最大512 records。巨大軍を常用推奨する意味ではありません。負荷は端末依存です。
- growth14/右倍率1.06。有限兵種・個体値・64体・配置制約のため成長上限があります。**無限のインフレは保証しません**。隠しstat倍率やtierは追加していません。
- 通常候補が無解なら、最大32の固定構成変換を検証。左を消さず、右の完全同構成mirrorを拒否し、予算/種類/対空/支援/配置条件を維持します。全合法入力の生成可能性は数学的には未保証。なお無解時はround/財布/構成を原子的に据え置きます。

## 検証と限界
固定係数・正規HTML由来TYPES・共通LCG初期化を用いた別seed601–610、3方式各100戦を保存。型先決版は左52/右47/引分1、勝者残HP平均25.63%、75%以上残HPの圧勝0、50体以上9戦/3run。cost基準は残HP37.64%、圧勝4、50体3戦でした。

これは10個のseed-clusterという小標本です。第1戦は左1/右9、第2戦は左9/右1、giantは4戦のみで偏りが残ります。swarm25%は設定値で、実抽選/実現は後半5/40（12.5%）、fallback0。50体9戦にはcarry継続4戦も含みます。完全balanceや実運用勝率を保証しません。旧60/310戦は別のcontrolled fixtureで、正規生成の勝率と同一視しません。

詳細・固定BETの理論/実財布収益・round別人数/cost・CPUは `growth/validation/VALIDATION601-610.md`。追加tail252生成で旧12拒否を解消、旧成功240および通常100の出力一致。新fallback戦闘自体のbalanceは未評価です。

## 描画・長期戦・録画
物理480×538、左右配置、固定1/60 tick。20 sim秒以降最低2×、40秒以降最低3×、60秒引分。手動倍率とは最大値で、二重掛算しません。pause/背景時間を加速に足しません。

開始時だけ全pose境界から最小paddingでfitし、手動cameraを保ちます。死体→地上足元Y→飛行の再利用描画リストで描き、solverの配列順は不変。スライムの絵は物理円より広く、密集で画像が重なること自体は残ります。実QAの特定seedの壁密集は再現できておらず、視覚修正完了とはしていません。

host録画計算は8ms/16tickを目安にyieldします（単一tickは分割不能）。録画2MiB capはcaptureのみ中止し、solverはactualwinnerまで継続して正常精算します。録画不能は観戦障害であって返金理由ではありません。guestはhost時計とcanonical replayで追いつき、通信非対称の誤差は残ります。

## 再現チェック
`python3 build_standalone.py` で再buildできます。主要な現行テスト:
- `node typed-generator-inline-test.cjs` / `node growth/initial-units.test.mjs`
- `node generation-atomic-ui-test.cjs` / `node extension-ui-test.cjs`（全25戦・重い）
- `node multi-ui-test.cjs` / `node async-host-lifecycle-test.cjs` / `node large-inline-replay-test.cjs`
- `node --test multiplayer/protocol.test.mjs wallet/extension-wallet.test.mjs ranking/score-bridge.test.mjs`
- `node draw-depth-test.cjs` / `node growth-padding-test.cjs` / `node asset-frame-test.cjs`
- `node v10-ui-test.cjs` / `node expansion-events-ui-test.cjs` / `node personal-result-ui-test.cjs` / `node hero-fx-ui-test.cjs`

Headless DOM/canvas stubの検査は実画面QAではありません。旧version名の設計文書/テストは履歴資料で、旧32体などの記述を現在仕様と混同しないでください。

## ランキング・権利
score bridgeは正規の本人signed純益のみ、選択した最終区切りの明示終了操作で一度。継続中の中間送信なし。standalone送信なし。負値受理、native実通信、旧固定長スコアとのboard/cohort分離は外部設定確認が必要です。ここでは実送信しません。

独自code/sprite/arena/音と採用済みCC0効果5点。CC0記録はassets/effects。原作素材や第三者キャラクター転用なし。全体に新規LICENSEを勝手に付与していません。
