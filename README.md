# どっちが勝つ？
勝つ軍を予想して、みんなでバトル観戦する小さなゲームの試作です。

**Prototype:** 画面・実端末・GRAVITY SDKの実通信は未検証です。公開リポジトリは動作や公平性を保証する製品版ではありません。オンラインの検証はメモリ内mockのみです。

## 遊び方
index.html をローカルで開くと、既定ではオフラインのひとり用です。外部アセット取得は不要です。
- 全20戦。朱軍/蒼軍を予想し、無料0 Gまたは任意の上乗せ10/25/50 Gを選んで確定。
- 的中は+10 Gと上乗せ額と同額の利益。不正解は上乗せ額だけ失う。引き分けは増減なし。
- 開始100 G。残高0でも無料予想を続けられます。Gは購入・換金できません。
- 見るだけと未回答は上乗せ・報酬なし。残高、純益スコア、正解数は別々に表示。
- 1〜5戦は異なる単兵種同士で等支払12〜24。6〜11戦は最大2種/軍、12〜20戦は最大3種/軍。後半のコストは未較正です。

## 戦場
独自ピクセルアートの7兵種（剣/盾/槍/弓/砲/騎/癒）。身体半径、衝突、前衛による進路妨害を持ちます。矢を盾で遮る射線システムはありません。
現モードは**最大8体/軍・計16体**。大人数を扱うテストはstress試験であり、ゲームの対応人数を示すものではありません。
既存の勝者予測型ゲームを参考にした独自実装です。原作の画像・コード・名前は同梱していません。勝利軍継承・同兵種リロールは未実装で、毎戦独立生成です。

## マルチ試作
2人ローカルmockは同端末内だけの模擬通信で、相手は自動の無料予想です。
部屋を作る/参加を押した場合だけGRAVITY SDK 1.0.2をロードし、部屋APIを呼ぶ実装があります。初期ロードでSDKや部屋通信は行いません。SDK取得に失敗してもひとり用は利用できます。最大8人はアプリ側の仮上限です。
ホストが戦闘と損益を確定し、同じcanonical replayを配布。ゲストは勝敗を再計算しません。ACKは観戦用で、拒否や転送timeoutによって確定損失は取り消されません。
途中参加は観戦者。ホスト喪失で停止し、永続セーブやhost migrationはありません。予想の秘密・ホストの公正性・認証・通信保証はありません。SDKランキングへのスコア送信は未実装です。

## ソースとテスト
Node.js（標準モジュールのみ）とPython 3で検証・再buildできます。ブラウザテスト、ネットワークテストは含みません。

    python3 build_standalone.py
    node wallet-ui-test.cjs
    node multi-ui-test.cjs
    node sdk-ui-test.cjs
    node --test wallet/wallet.test.mjs wallet/audit/multiplayer-wallet-fixed.audit.mjs multiplayer/*.test.mjs
    node asset-frame-test.cjs
    node replay/compact-replay.test.mjs
    node physics-tests/goldens-test.cjs
    node physics-tests/generator-test.cjs
    node physics-tests/stats-test.cjs
    node physics-tests/test.cjs
    node test.cjs

source、wallet、multiplayer、replay、physicsから単一HTMLをbuildします。外部module importは不要。PNGはHTML内へ埋め込み済みで、assetsにも検証用原本を置いています。tests/original-v8.jsは自作コアの旧内部版で、既存他作品のコードではありません。

## 未完の点
見やすさ・操作感、スマホ性能、実SDK/複数端末での再接続と遅延、公平性・コスト、長期の進行設計を引き続き検証する必要があります。外部エフェクト素材はまだ採用していません。
