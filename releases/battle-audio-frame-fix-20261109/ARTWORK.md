# 素材と原本

200個の別原典CC0 atlas、全15,148 original framesを使用・未使用原画として保持。Slimeletは親atlasを共有する内部子で追加種には数えません。
原PNG/plistはOpenDuelystの固定commit2843f2400854136598631288c2e8dfb8f5173de7と照合済み。原画pixelsは変更していません。原作能力・原作速度を移植したとは称しません。
各出典、hash、全frame名はprovenance/Duelyst-original-sources.json。CC0原文とSpritePilot効果素材の出典証拠も無改変保存。原画レビューはゲーム画面での全種可読性保証ではありません。


## ホーム背景のGIF（2026-11-08）

元の1024×1536 PNGだけを素材にし、各フレームを元画像から作成しています。ランプ本体・鎖・ろうそく本体・家具・建物は同じ位置に保ちます。4つの灯りの明るさ、3つのろうそくの炎、暖炉内の炎と近くの既存の反射だけを局所的に動かしています。ランプや背景の切り抜き、補修画像、別の炎アトラス、ランプ本体の回転や揺れは使用していません。

動作版は640×960・256色・24フレーム・10fps、2.4秒ループです。GIF: 992,844 bytes。SHA-256: f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084。
元PNG SHA-256: 43fbeb1f07efc3c8bda997c7b28f3b02c5f7284d394ae984209bba630788d7aa。

元PNGは無改変で保持し、低モーション・省電力信号・読込失敗時に表示します。GIFには縮小と256色化による差があり、高解像度の元PNGと同じ画素という意味ではありません。物理端末での電力消費・発熱・フレーム時間は未測定です。

前版の16フレーム・530,538 bytesのGIF（SHA-256: c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae）は以前のリリースに保持しています。再構成はこの前版から上記固定灯具版へ直接置換します。

## 追加された爪エフェクト

元のキャラクター画像・アトラス・攻撃フレームは無改変です。ダークファンに追加された爪の表示だけを、既存イベントに沿った細い地面の裂け目と小さい接触破片で描画します。地形に合わせた土色の縁と切れ目の中の紫色を使います。新しいキャラクター画像、当たり判定、ダメージや効果時間は追加していません。


## 2026-11-09 effect and audio update

The existing 574 image assets, including all original character artwork and the fixed-body home animation, remain byte-for-byte unchanged. This update adds 123 unique effect-only PNG images (124 embedded occurrences) and an original procedural combat-sound bank, with no added recorded audio samples. Packaging performs no resizing or re-encoding.

The licensed image sources are pinned to the Open Duelyst repository at commit `2843f2400854136598631288c2e8dfb8f5173de7`, under its CC0-1.0 dedication. The unchanged full license text is included as `licenses/Duelyst-CC0-1.0.txt`. Per-payload hashes, source URLs, selected frames, crops and derivative roles are recorded in `EFFECT_ASSETS.json`. The separate original procedural sound-bank provenance is recorded in `COMBAT_AUDIO_ASSETS.json`. Small code-native cached projectile/status glyphs and the thorn effect have their separate provenance; they are not represented as downloaded CC0 artwork.

The game uses the new effects through existing effect events and lifetimes. Optional display-only identity metadata corrects the moon and ice-breath placement without changing damage, targeting, movement, radii, collision or match results. Existing numeric replay FX rows remain unchanged. Legacy recordings without valid identity data retain their recorded anchors. Optional metadata is omitted if it would exceed the existing replay byte limit.

The separate comparison gallery distinguishes the changed 55 replay-effect kinds from five retained authored raster kinds and the retained dark-claw branch. It also covers 26 projectile/trap kinds, 16 status flags, two stacked-status examples and 23 native audio comparison contexts. Media-card counts are not counts of distinct combat abilities. Browser rendering, comparison audio and physical GRAVITY behavior are separate verification scopes.
