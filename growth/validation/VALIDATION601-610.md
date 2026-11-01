# Frozen shape-first validation: seeds 601–610

Independent candidate only; no production edits, publication, browser rendering or native SDK calls. All 3 arms completed 10 sessions × 10 battles. Model/config were frozen before these seeds. Earlier training, 401 heldout and 501 exploration are not pooled into this validation. Actual winning STARTING roster carries fresh; draw resets both armies. Generator never calls physics or uses predictions, wagers or battle outcomes to select a matchup.

## Results

| Arm | L/R/draw | Mean winner HP fraction | Stomp ≥75% | Close ≤25% | ≥50 battles / runs | Max left streak | Mean / p90 sim seconds | Mean / p90 whole-battle CPU ms |
|---|---|---:|---:|---:|---|---:|---|---|
| cost | 58/42/0 | 0.3764 | 4% | 27.00% | 3/100; 3/10 | 5 | 21.30/33.13 | 993/2164 |
| model | 54/46/0 | 0.2445 | 0% | 59.00% | 0/100; 0/10 | 4 | 24.48/38.63 | 1006/2568 |
| typed | 52/47/1 | 0.2563 | 0% | 56.57% | 9/100; 3/10 | 4 | 24.44/38.63 | 1233/3403 |

HP denominator includes max HP of all created winner-side entities; surviving cost counts original units only. HP/close/stomp exclude draws. CPU is headless host whole-battle work, not a frame budget or smartphone benchmark. The typed arm retains most closeness gain while recovering large armies. This is not proof of universal balance: only 10 clustered runs; first-round typed L1/R9 and round2 L9/R1 reveal residual round/composition bias despite aggregate L52/R47. Giant subset is only 4 battles (L3/R0/draw1), so do not claim giant balance.

## Shape requests and realized quantity

Late rounds 7–10: normal 31, swarm 5, giant 4 requested AND realized; fallback 0. Swarm probability 25% is tentative seed-draw configuration, not an achieved frequency: realized 5/40 late battles (12.5%). These 5 swarm armies have mean 57.4 right units, L2/R3, mean winner HP 32.07%. Giant armies average 16.5 right units. Nine ≥50 battles include five explicit swarm plus four normal rounds retaining/growing prior large winners; 3/10 sessions reach 50, not 9 independent sessions.

Swarm cost≤3 and cap64 imply absolute cost ceiling192. If budget lower bound exceeds192, a swarm cannot fit; typed-breakdown.mjs classifies budget-ceiling separately without changing generation. None occurred in this validation. Longer extension rounds can exhaust this shape band: no guaranteed continued 25% swarm realization. All-air opponent has explicit eligibility fallback. No shape/config was tuned on these validation results.

## Typed per-round growth

| Round | L count mean [p10,p90] | R count mean [p10,p90] | L cost mean | R cost mean | ≥50 battles |
|---|---|---|---:|---:|---:|
| 1 | 3.8 [2,6] | 6.0 [6,6] | 16.6 | 18.0 | 0/10 |
| 2 | 10.0 [10,10] | 7.0 [6,11] | 30.0 | 30.6 | 0/10 |
| 3 | 15.0 [15,15] | 7.0 [6,6] | 45.0 | 48.0 | 0/10 |
| 4 | 10.9 [7,20] | 17.9 [12,24] | 57.2 | 60.4 | 0/10 |
| 5 | 16.0 [9,24] | 17.8 [11,22] | 72.0 | 75.4 | 0/10 |
| 6 | 19.6 [11,29] | 21.1 [14,28] | 87.2 | 92.3 | 0/10 |
| 7 | 23.2 [15,29] | 26.8 [12,50] | 101.2 | 108.9 | 2/10 |
| 8 | 33.4 [17,56] | 27.7 [16,35] | 120.1 | 126.7 | 2/10 |
| 9 | 35.9 [18,45] | 28.9 [17,41] | 134.5 | 140.2 | 2/10 |
| 10 | 42.0 [26,49] | 34.9 [16,62] | 150.8 | 156.8 | 3/10 |

Full 3-arm round count/cost distributions, streaks, times and CPU: typed-comparison.json.

## Fixed-side profit diagnostics

R10 first ten; theoretical delta/battle = pWin×(10+stake) − pLoss×stake. R0 column applies the SAME observed rates algebraically with no bonus; it is NOT a measured extension result. Actual mean 10-round profit uses frozen Wallet API, initial100, requested stake clipped to available balance and cap50. Limited bets count across100. Draw yields0. No gameplay reruns.

| Arm/side | Requested stake | Theory R10 / battle | Hypothetical R0 / battle | Actual 10-round mean profit | Limited bets |
|---|---:|---:|---:|---:|---:|
| cost/A | 0 | 5.80 | 0.00 | 58.00 | 0 |
| cost/A | 10 | 7.40 | 1.60 | 74.00 | 0 |
| cost/A | 25 | 9.80 | 4.00 | 97.50 | 1 |
| cost/A | 50 | 13.80 | 8.00 | 118.00 | 15 |
| cost/B | 0 | 4.20 | 0.00 | 42.00 | 0 |
| cost/B | 10 | 2.60 | -1.60 | 26.00 | 0 |
| cost/B | 25 | 0.20 | -4.00 | 3.50 | 3 |
| cost/B | 50 | -3.80 | -8.00 | -25.00 | 38 |
| model/A | 0 | 5.40 | 0.00 | 54.00 | 0 |
| model/A | 10 | 6.20 | 0.80 | 62.00 | 0 |
| model/A | 25 | 7.40 | 2.00 | 74.00 | 4 |
| model/A | 50 | 9.40 | 4.00 | 78.00 | 25 |
| model/B | 0 | 4.60 | 0.00 | 46.00 | 0 |
| model/B | 10 | 3.80 | -0.80 | 38.00 | 0 |
| model/B | 25 | 2.60 | -2.00 | 32.00 | 8 |
| model/B | 50 | 0.60 | -4.00 | 36.00 | 16 |
| typed/A | 0 | 5.20 | 0.00 | 52.00 | 0 |
| typed/A | 10 | 5.70 | 0.50 | 57.00 | 0 |
| typed/A | 25 | 6.45 | 1.25 | 61.50 | 4 |
| typed/A | 50 | 7.70 | 2.50 | 65.00 | 25 |
| typed/B | 0 | 4.70 | 0.00 | 47.00 | 0 |
| typed/B | 10 | 4.20 | -0.50 | 42.00 | 0 |
| typed/B | 25 | 3.45 | -1.25 | 40.50 | 8 |
| typed/B | 50 | 2.20 | -2.50 | 52.00 | 16 |

A=left, B=right. Free prediction rewards mean both constant sides can profit over ten rounds; this does not imply unbiased wagers. Typed fixed50 theoretical R0 retains left +2.5 / right −2.5 per battle at this sample’s rates. Affordability changes path-dependent actual profits; do not substitute terminal balance or raw full-stake algebra. Full per-run traces and cumulative curves: profit-report.json.

## Validation scope

Eight unit tests (estimator/generator/typed), all seven pre-validation source hashes, and verify-typed-validation.mjs pass. The latter checks all300: carry, one draw reset, nonoverlap gap≥2, cap64 per army/512 total records, bands, air eligibility, shape restrictions and frozen canonical provenance. No actual run exceeded132 created entities. Larger/longer stress, browser/mobile timing, UI and real SDK remain outside this report. Pair fixture evidence and disabled unsupported features remain documented in README-model-only.md; no new individual stats or economy changed.
