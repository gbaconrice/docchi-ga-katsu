# 計測ツール（tools/measure）

ゲーム本体（index.html）を変更せずに、製品の戦闘ロジックで大量の試合を回し、勝率・必勝法・演出の判断材料・性能を測るツールです。ChatGPT 側の作業版と競合しないよう、`tools/balance/` とは別のディレクトリにしています。

## ルール

- 計測ごとに `reports/measure/<コミット短縮ID>/` を作り、生データ（seedN.json）・ログ・REPORT.md・perf.json を置きます。
- 各 JSON の `manifest` に、対象HTMLの SHA-256、コミット、シード、試合数、Node のバージョン、作成日時を記録します。
- `analyze.py` は、SHA-256 が異なるファイルを渡すと集計を拒否します。古い版と新しい版の結果は混ざりません。
- 未公開の作業版が統合されるまでは、公開版 `1bd685a` の結果（`reports/measure/1bd685a/`）を基準値とします。

## 試合の計測（sessions.cjs）

```
node tools/measure/sessions.cjs --fights 150 --seed 1 --timeline --out reports/measure/<id>/seed1.json [--html path/to/index.html]
```

- ゲーム内の `Math.random()` をシード付きの乱数（mulberry32）に置き換えています。同じHTMLと同じシードなら、全試合が完全に一致します（確認済み）。
- ひとりで遊ぶセッションを10戦ずつ繰り返します。賭けは常に「左・25%」で、これは戦闘には影響しません。
- `--timeline` を付けると、0.25秒ごとに両軍の残りHP・最大HP・生存数・生存兵の外接矩形を記録します（召喚体は除外）。
- 2コアのマシンで4並列にすると、150戦あたり約15〜20分かかります（大軍の試合が重い）。

並列実行の例：

```
for s in 1 2 3 4; do node tools/measure/sessions.cjs --fights 150 --seed $s --timeline --out reports/measure/<id>/seed$s.json 2>reports/measure/<id>/seed$s.log & done; wait
```

## 集計（analyze.py）

```
python3 tools/measure/analyze.py reports/measure/<id>/seed*.json > reports/measure/<id>/REPORT.md
```

集計する項目は次のとおりです。

- 初戦の左勝率と、王者の勝率（連勝数別・地図別）
- 単純な選び方12種類の的中率（遠距離・間合い・人数・HP・攻撃・コスト・大型・飛行・範囲・混成・速度）。60%以上は太字で示します。
- 遠距離が多い側の勝率を、相手の特徴（飛行・大型・範囲・速度・人数・HP）ごとに分けたもの
- 人数比ごとの勝率
- 接戦・逆転・決着時点・生存数・兵の散らばり（カメラ用）

区間は、セッション単位のブートストラップで出した95%区間です（同じセッション内の試合は互いに独立ではないため）。

## 性能（perf.py）

```
python3 tools/measure/perf.py index.html > reports/measure/<id>/perf.json
```

**これはエミュレーションで、実機ではありません。** ヘッドレス Chromium に DevTools の CPU 制限（4倍・6倍）と回線制限（Fast 4G・Slow 4G 相当）をかけ、390×844（3倍密度）の画面で次を測ります。

- 読み込み：load イベントまでの時間と、ホームのボタンが表示されるまでの時間
- 戦闘：シード1〜400の初戦のうち最も人数が多い対戦を等速で再生し、requestAnimationFrame の間隔（フレーム時間）を記録

スマホの GPU、発熱、GRAVITY の WebView の挙動は再現できません。実機での確認は別途必要です。
