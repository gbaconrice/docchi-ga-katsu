# fun-feedback-20261109

演出だけの追加です。戦闘・乱数・リプレイ・所持金・マルチの通信内容には触れません。

- 綱引きゲージ：戦闘中、両軍の残りHPの割合を戦場の上に表示。自分が賭けた側にコインの印。
- 王者の表示：2戦目以降、勝ち残った軍のカードに「♛ 王者」、2連勝以上は「♛ N連勝」。
- 確定の「ドン」：対戦開始を押すと、賭け金に応じた枚数のコイン音のあと、選んだカードに「予想」の判子。
- 開戦のカウントダウン：ひとり用のみ 3・2・1・開戦（約2秒）。マルチは開始を遅らせず、開戦時に角笛だけ鳴らす。
- 触れた瞬間の反応：ボタンは指が触れた時点でへこむ。木の軽いクリック音（主ボタンは少し重い音）。
- 修正：ひとり用で「読込中…」「名前未取得」を出さない／地形の説明を言葉の途中で改行しない／カードの「基本間隔」を表示しない。

効果音（tap, tapHeavy, coin, stamp, count, horn）は既存の音エンジンの中で合成するオリジナルで、録音や外部素材は使っていません。ミュート・音の同時発音数の上限・iOSの音声解除の規則は既存のものに従います。

## 作り方

```
node tools/fun-feedback-20261109/reassemble-demand-source.cjs releases/multiplayer-controls-results-20261109 /tmp/base.html
python3 tools/fun-feedback-20261109/apply-fun-feedback.py /tmp/base.html /tmp/src/index.html
# /tmp/src に前リリースの ARTWORK.md, GRAVITY_INTEGRATION.md, EFFECT_ASSETS.json, COMBAT_AUDIO_ASSETS.json, STATUS_PROJECTILE_PROVENANCE.json, licenses/ をコピー
node tools/fun-feedback-20261109/build-demand-release.cjs /tmp/src/index.html /tmp/out
node tools/fun-feedback-20261109/reassemble-demand-source.cjs releases/fun-feedback-20261109 /tmp/check.html   # 元のソースと一致すること
```

新しい画像はありません（画像はすべて前のリリースのものを再利用）。

## 確認

`test-fun-feedback-browser.cjs`：リポジトリのルートをHTTPで配信し、ヘッドレスChromiumで2〜3戦遊んで、押下の反応・判子・カウントダウン・綱引きゲージ・王者表示・修正3点を確認します。
