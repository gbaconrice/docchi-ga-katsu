> Historical uncalibrated-base evidence (source hashes below). The current calibrated generator is verified by `v10-calibrated-generation-test.cjs` and `v10-calibrated-smoke.json`; the old generator script is intentionally omitted to avoid treating old cost assertions as current.

# v10 generator and full-loop independent audit

`node v10-generator-audit.cjs` reads the built inline `game-runtime`, not an extracted generator. The DOM/canvas are inert stubs; no browser, renderer, SDK or network is used. Production source remains untouched by the audit.

## Completed evidence
- 540 generation-only fixtures passed: stage mapping 1,3,5,7,9,11,13,15,17,20; planned budget formula; exact actual spend (maximum remainder 0); mandatory 1/2/3 right-side kinds; anti-air eligibility; fresh initial bodies; unique tokens; no initial same-layer overlap. Synthetic high-cost carries exercised the 160 budget ceiling in 240 fixtures.
- 20 deterministic sessions / 200 full battles passed. Each battle was rerun using the opposite prediction choice through the raw combat core; winner, total ticks, HP, positions, statuses and pending children matched exactly.
- Real winner's starting roster carried to the next left side as new full-HP entities with new tokens; dead/surviving bodies and summoned children did not carry. Round 10 completion followed by replay creates a fresh round 1/session; no round 11 setup occurred.
- An additional test-only zero-initial-credit session completed all 10 battles with free predictions. An unaffordable 50 stake was rejected; final credit was 50 from five correct predictions. Production initial credit and reward rules were not altered.
- All 17 selectable kinds appeared. Frequency table includes the extra zero-credit session (210 battles); normal outcome/budget summary includes only the 200 regular battles.

## Observed normal-session results
- Left wins 71; right wins 129; draws 0. This reflects an intentionally strengthening challenger, not a claim of balanced 50/50 predictions.
- Maximum initial count 32/team; live plus pending children 32/team; total records 82/team (bound 128).
- No regular battle reached the 160 budget ceiling. Round 10 right spend: 54–124, mean 91.95; round 1 mean 19.
- Mean right spend by round: 19,25,31.35,38.4,45.75,53.25,62.15,70.3,76.55,91.95.
- Audit CPU time for the regular sessions was about 204 seconds. Per-battle p95 was about 3156 ms **including its opposite-choice second simulation**; this is not browser frame cost, mobile performance, or wall-clock play duration.

The result JSON includes `complete:true`, completed session counts, exact audited index/source SHA-256 and detailed rows. The script's final metadata was extended after the successful run to explicitly label completion/frequency scope; no assertions or simulation behavior changed. Source physics and horizontal-axis invariance are covered independently in `V10-HORIZONTAL-AUDIT.md`.
