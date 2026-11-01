# Independent v9 generator audit

Production source was read-only in this audit. Only audit code/results were written. No browser, renderer, SDK call or publication was used.

## Findings and closure

1. **Original cheap-role cap waste:** a rider×3 carry (cost24), round2/seed1/streak4 planned29 but produced archer×8 cost24. The right army had not actually strengthened. A real old-generator sample of25 sessions/500 battles contained51 such non-increasing challengers and34 cap-limited packs. The owner replaced this with bounded cost-only packing and a round2–5 cap12.
2. **Original 32-unit initial interleaving:** the old4-column/36px placement crossed the centerline. The owner replaced >8-unit formation geometry. Cross-team overlaps disappeared.
3. **Small large-body overlap:** golem/boar carry with5 units overlapped by3px in the old36px rows. The owner changed <=8-unit row gap to max(36, twice largest radius). Targeted latest-build layout audit passes.

## Final evidence

- 1900 cost-stress generation samples: cap-induced waste0, right actual spend failing to exceed left when planned>left0, cross-team initial overlap0, maximum budget remainder1.
- 20 real sessions ×20 battles =400 battles: left186 wins, right210 wins, draw4; carry is the actual winner's **starting composition**, restored as new units; dead units/HP/status/summon children do not leak; unique new tokens; no initial slimelet; required2/3 right-army types and anti-air eligibility pass.
- Active cap32/team and cumulative record bound128/team pass. Observed maximum initial25/team, active32/team, records63/team;121 battles created children.
- Right actual spend averages: round1=19, round5=27.6, round10=42.5, round15=56.9, round20=70.8. Round20 range52–96.
- VM runtime about191 seconds for400 whole battles; per-battle median308ms, p95 1618ms. Average simulated battle duration17.99 seconds. These are headless machine measurements, not mobile/browser frame-rate guarantees.
- Generator-only reconstruction using saved actual winners/seed stream matches all400 saved costs/counts and includes all17 selectable roles. Right army appearances per role range29–78; later-unlocked roles have fewer eligible rounds. No type is absent.
- Latest layout-only validation:1200 formations across counts5/8/9/16/24/32, all same-layer friendly/enemy pairs non-overlapping and every body within field bounds.
- Physics, monster/expansion contracts and wallet module are byte-identical to the prior v8 QA public package; `TYPES` remains unchanged through the400-battle run.

## Reproduce / files

`node v9-generator-audit.cjs` runs the default20-session audit after the generation sweep. `FREQUENCY_ONLY=1` reconstructs the saved sessions without resimulating combat. `LAYOUT_ONLY=1` checks current-build geometry.

- `v9-generator-audit-results.json`: final DP400-battle evidence with exact source/index hashes.
- `v9-generator-frequency-results.json`: role frequency from those saved outcomes.
- `v9-layout-audit-results.json`: latest-layout targeted evidence with its own index hash.
- `v9-core-baseline-audit.json`: immutable physics/contracts/wallet byte comparison.
- `v9-generator-pre-dp-results.json` and `.log`: historical failed-generator evidence, not final metrics.

The full400-battle run predates the small-army spacing fix and some subsequent presentation-only edits. The final spacing fix was validated by the dedicated1200-case geometry run, not a redundant full combat sweep. Source/index hashes in each result distinguish those versions. No victory-based generation reroll was found; packing uses costs only.
