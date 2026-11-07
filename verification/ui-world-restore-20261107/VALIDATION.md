# Final source and verification scope

Source SHA-256: `fef9176e59383910de20f077882565c3ef44f35ca32147bf95b219647c727adf`
Content revision: `69ec667a9873dfc787026ab3314a79156d03736a4667a98cf0c39cdb776bbac2`

The repository build reproduced these bytes independently twice. The demand-loaded release reconstructs the same 49,451,632-byte source. All 573 image assets are reused byte-for-byte. The outside-script UI hash remains `3155b9a6f4d538df273e8ddd48837308702ab00c114c85b083c8c34b467b766a`.

## Current contracts

- Current specification equivalents: 189/189 passing; actual production integration: 66/66.
- Approved replacement mechanics: 25/25. Actual renderer: 88 checks, 68 decoded-art Canvas frames, 900 frame/facing samples, 62 exact live/replay sprite PNG matches.
- Restoration aggregate: copy, ordinary-loading silence with failure/retry retained, loss motion, 17 layout/interaction checks, unchanged46 combat/replay invariance, replacement mechanics/rendering, corrected QA replay helper and fixed-fixture balance all pass.
- Unchanged46: 285 checks, 39,184 exact assertions; 92 paired 420-tick combat runs and 92 paired 240-tick replay runs. No fields are rounded or dropped.
- Changed3: 156 fixed conditions per version. Both sets of78 mirrored pairs match; this is not a global win-rate estimate.

These counts overlap and must not be added as independent end-to-end tests. The complete one-command aggregate exited0, including both entry-loader32/32 and actual-release-loader7/7 checks; [aggregate result](replacements/aggregate-final.json).

## Historical failures remain visible

The original173 canonical inputs are unchanged: 134 pass, 39 fail. Each failure's present observation, reason and current counterpart appears in [canonical-failure-classification.json](replacements/canonical-failure-classification.json). Failure names are unchanged from the UI-only6130 build.

The original ability-test definitions dynamically exercise the additional cues and report188/194 passing, six failing groups. They expect the retired shell capture/root, gauntlet throw/pincer lift, three contact accents still visible at age15 despite their intentional6/8/9-tick duration, or the old30-cue count instead of35. Their original failures and narrow current counterparts are retained in [historical-failure-classification.json](replacements/historical-failure-classification.json) and [contracts summary](replacements/contracts-final/summary.json).

A nested historical replay-flags check printed a failure even though its enclosing runner reset exit status. This is explicitly retained as a failure. The current counterpart allows the added guard bit through2147483647 and fails on nested failures; it does not trust the old24/24 printed report.

The original strict all49 unchanged-behavior test also remains available: 281/300 pass,19 fail only for approved3 definitions/facts/combat/replay and the precisely allowed prepare/interrupt hook. The current unchanged46 contract preserves all unrelated comparisons. The replacements are deliberately different, not declared unchanged.

## Visual and browser evidence

The broader49-roster,30-family and15-pair material-effect images describe the UI/VFX-only6130 build; [its original report](UI_ONLY_6130_VALIDATION.md) is preserved. New3 effects are shown in [the final contact sheet](replacements/render-contact-sheet.png), with [actual render checks](replacements/render-report.json). The underlying character art is unchanged. Effects use the actor's licensed action frames, palette and material accents rather than generic floating weapons.

Independent pixel review found no blocking issue in the new3 or sampled existing families. The claw art raises hooks rather than literally crossing them; the description says 爪を構えて. Gauntlet's native flash briefly obscures nearby sprites, so no extra large flash was added.

Private browser UI checks cover320–430px widths,390×660 ordinary/GRAVITY layout, top inset, home audio placement, prediction controls, overlays/next-round recovery, long gold and participant rails, real12-coin loss motion and representative abilities. The49-selection60-tick pass is roster smoke coverage, not49 exhaustive behavioral proofs. UI-only browser evidence is linked in browser/; the outside-script UI is byte-identical in the final build.

Final-source browser observations cover Gauntlet and Shell in both directions, mirrored Crab, actual contact/guard/counter timing, and the corrected QA live/replay Gauntlet tick67 with matching visible swing/wave, HP1076 and7 hits. QA-only replay now supplies frameFor/facingFor and selects replay rendering; normal production replay already used those paths.

Exact postdeployment root/GRAVITY URLs require a separate public smoke and byte-hash check. Physical phone/touch, iOS WebView, real GRAVITY SDK score acceptance and real network multiplayer remain unverified. Canvas and synthetic SDK fixtures are not substitutes for those checks.

## Exact public deployment

GitHub source commit `bb9120905b6ff7f8e5c075f188ba5d91ca3924ee`, Pages run42374627039 succeeded. All610 fetched public files (including573 original images;39,374,305 bytes) match the tested file hashes. Reassembly from downloaded public bytes yields the exact final source SHA above. [Full hash evidence](deployment-verification.json).

The exact public root and unmodified GRAVITY entry load runtime `2d172fef62c3fa987cf3`. Home sound placement, prediction menu/info/emote and next-round flow pass. Two natural solo rounds won, ending with125 and156 gold. The Gravity entry retains the74px host reserve. Public replacement contacts and corrected live/replay match: fist wave67, pincer snap81, claw block82/counter94. Effects ready8/8, failures0.

Public390×660 loss QA uses a forced settlement and real requestAnimationFrame/WAAPI animation measurements: all12 coins remain visible70–80 sampled frames, move609–621px downward, and the layer clears. This is not a naturally lost round or a saved peak screenshot. Both natural public rounds happened to win. [Browser scope and observations](browser/postdeploy-final.json).

A following metadata-only commit records this evidence; the game source, loader and assets remain unchanged. The physical-device, real SDK and real multiplayer limits above still apply.
