# UI and pixel-effect correction validation

Frozen source SHA256: `6130a52363207d7128a36c75f154bfa4541a4ecca23ba5db51e0a9f78639c48f`.

## Automated results

- Current ability/compatibility suite:189/189. The187 prior entries remain, with2 actual-event/replay tests added for crystal reflection and full-field beam edge coverage.
- Production combat integration:66/66. Entry loader:32/32. Actual release loader:7/7.
- Layout/control restoration:15 explicit historical equivalents and2 actual-handler regressions pass. Original historical tests remain unchanged.
- Copy/loading:10 focused checks, plus both original loading tests. All300 attack fields use 攻撃 with unchanged values. Failures/timeouts/retry behavior remain.
- Loss motion:12 continuous coin paths, unchanged previous safe paths, protected digit regions, reduced-motion guards and cleanup pass. Real-time browser evidence is reported separately.
- Exact combat comparison:98 paired420-tick executions and98 paired240-tick replay executions, covering all49 bosses normally and mirrored. Full unrounded state, events and replay bytes match the prior ability release. This is not a new2,572-match balance run.
- Real production Canvas:119 frames per side, all49 bosses/all30 effect families, plus4 death-blast phases. No missing assets or rendering errors.15 native-resolution before/after pairs are included. Rendering statistics are desktop Skia timings, not phone performance.

These are distinct suite descriptions, not a sum of independent end-to-end tests; some assertions are nested or overlap.

## Preserved historical tests

The unchanged173-test suite reports134 passes and39 failures, and exits nonzero intentionally.24 failures already existed in the ability release. The15 additional failures reflect12 changed UI contracts,1 incomplete historical fixture, and2 tests that exposed one real overlay-transition bug. That bug is fixed and tested through actual nextPrediction/displayMultiState paths; the original tests still contain retired disabled-control expectations.

See `failure-traceability.json`, `canonical/canonical-summary.json`, the unchanged logs, and the explicit equivalent diffs under `tools/boss-abilities/ui-restoration/qa/layout`. No historical failure is relabeled as a pass.

The old capacity contract also pinned the pre-restoration HTML/CSS. Its supplementary version retains every model, score and reservation assertion, verifies the historical snapshot hash, and pins the separately reviewed restored UI hash in `expected-ui.json`.

## Scope limits

Canvas and VM fixtures do not establish physical touch, actual iOS/WebView behavior, real GRAVITY score acceptance, or real multiplayer transport. Private and postdeployment browser reports identify the exact source, viewports and interactions actually checked.

## Reproduction

Run `node tools/boss-abilities/run-current.cjs OUTPUT_DIRECTORY` for the current suite including restoration checks. Run `node tools/boss-abilities/run-canonical.cjs OUTPUT_DIRECTORY` for the unchanged historical tests and their expected nonzero result. Optional real Canvas captures use the already available or separately installed reputable `@napi-rs/canvas` package and `GAME_REPOSITORY=/path/repo node tools/boss-abilities/ui-restoration/qa/render-production.cjs SOURCE_HTML OUTPUT_DIRECTORY`.
