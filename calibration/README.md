# V10 offline generation calibration candidate

Recommended provisional option: `soft_weight.json` / `selected-policy.json`. This prioritizes closer battles over forcing 50/50 sides. Not deployed. No production/source gameplay or wallet damage statistics were modified.

## Reproduce current policy

The enclosing package already integrates soft_weight. From package root run `node v10-calibrated-generation-test.cjs` and `node v10-balance-audit.cjs --runs=6 --seedStart=101 --out=calibration-rerun.json`. The latter runs the actual inline HTML through draft/commit/settle/carry. Recorded baseline/low/soft_weight JSONs retain exact source hashes; generator-policy.cjs and the patch document the offline change against the separately preserved base. Do not apply them again to this already-integrated source. No outcome-dependent reroll or prediction-dependent generation is introduced.

## Policy

Previous challenger multiplier: `(1.04 + min(streak,4)*.02)^advance`, plus `2*advance`.
Candidate: `(1.00 + min(streak,4)*.005)^advance`, plus `round(.5*advance)`. Original stage budget floor and caps/unlocks/mixture progression remain. Stormmage generation cost rounds from 5 to 7 (1.4 weight). Healer share cannot exceed `max(1, floor(roster length*.35))`. The cap rejects healer-heavy prospective packs before best-budget selection; it does NOT search all alternative packings of the same type combination. Counter/synergy surcharges were tested separately but are disabled in the recommended option. Cost weighting is not a proven universal true-power model.

## Evidence

Training: seeds 1–3, six policy candidates × 30 battles; baseline first 30 of previously frozen 200. Two options selected for unseen seeds 101–106 (60 battles each); baseline also run on those exact heldout seeds. Compositions diverge naturally after changed winners/carry. This is a small exploratory holdout, not a universal balance guarantee.

| Heldout metric | Baseline | soft_weight | low |
|---|---:|---:|---:|
| Left/right/draw |20/39/1|21/39/0|25/34/1|
| Winner surviving HP / all created max HP |37.09%|23.68%|31.43%|
| Surviving original static cost ratio |58.74%|51.44%|59.82%|
| Winner HP >=75% |3/59|0/60|2/59|
| Winner HP <=25% |19/59|35/60|24/59|
| Winner loses no original unit |13.56%|15.00%|10.17%|
| Simulation seconds mean |15.30|15.64|15.56|

75%/25% are descriptive bins, not validated thresholds. Closeness improves, side bias does NOT improve in soft_weight. No-casualty wins slightly increase. Zero-incoming-damage wins are zero in all heldout arms. HP includes actually-created summons/split children in both numerator and denominator; cost excludes children. Damage-intent sums include overkill and are not net healing-adjusted HP.

Candidate mean right original static cost by round: 19,21.17,22.83,25.67,28.17,30,35.33,39.33,42.67,50. Inflation remains but weaker: round10 baseline91.67→50 and right unit count17.83→8.67. This tradeoff must be accepted explicitly; this candidate does not promise large endgame crowds. Full round/composition metrics are in `comparison.json` / individual audit JSONs.

No art/UI, renderer/browser, real SDK/network/native score test, deployment or Library save was performed here. Integration owner owns follow-up carry, multiplayer, replay and UI regression. Preserve the frozen uncalibrated baseline.

## Generation guard audit

`node generation-sweep.cjs --config=soft_weight.json`: 1,000 deterministic synthetic eligible carry contexts (100 per round; pure/mixed rosters, size 1..cap, streak 0..7) PASS. The fallback expression is instrumented to throw and never executes. Assertions cover required 1/2/3 kind count, active cap, budget ceiling/accounting, healer cap, required anti-air and drake eligibility. This is bounded coverage, not exhaustive proof that every legal packing is retained; DP's alternative-distribution omission remains acknowledged.
