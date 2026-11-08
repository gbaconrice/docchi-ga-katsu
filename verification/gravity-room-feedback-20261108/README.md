# GRAVITY room and presentation verification

Final standalone SHA-256: `ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa`.

## Focused tests and reconstruction

- Seven focused suites passed: 24 profile/emote cases, 27 lobby cases, pick-layout checks across 320/390/430/1200 widths and all 46 large kinds, 8 avatar-resource/backdrop cases, 20 integrated result/log/timing cases, 12 concrete boss-status log cases, and GIF lifecycle/fallback checks.
- The formal split release reconstructs the exact standalone source. Ten independent structure checks and seven full replay comparisons also pass in the portable reproduction. A clean reproduction from the previous published release, portable patches and the new GIF also passed all seven suites and seven actual entry-loader cases.
- All 573 previously referenced image files remain unchanged. The single new GIF is 530,538 bytes, 640×960, 16 frames, 8 fps and a 2-second loop. Its SHA-256 is `c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae`.

See `focused-summary.json`, the individual focused logs, `source-build.json`, `reassembly.json`, `reproduction.json` and `entry-loader.log`.

## Preserved gameplay

An independent comparison against the prior published source checks unchanged wallet arithmetic, all type records and traits, costs, roster generation, descendant exclusions, combat clocks, 60-second limit, speed-linked damage, traps, camera, corpse behavior and original embedded assets. Seven complete canonical replays match except for the deliberately changed diagnostic battle log.

The unchanged historical suites are not all claimed as passing: additional historical production tests produce 169 passing assertions and four identical pre-existing failures in both sources. Those failures and precise superseded UI expectations are explicitly recorded in [the preservation report](preserved-rules/REPORT.md). No gameplay changes were made to hide those outcomes.

## Timing

Normal multiplayer result wait is 8 seconds instead of 30. The post-ten-round cash-out/continue decision remains 30 seconds, prediction remains capped at 60 seconds with existing early-ready progression, and replay lead remains 2 seconds. Actual protocol tests cover these boundaries. Synthetic browser result holds are used only to inspect layout, not as evidence for timing.

## Native browser and limits

See [the native-browser report](browser/README.md) for measured outcomes and synthetic captures. Browser evidence uses exact-width iframes, not physical-device emulation, and a labeled mock SDK routed through production handlers. The real GRAVITY invitation flow was not modified. Real GRAVITY profile responses, real room transport/permissions, score acceptance and physical-device WebView/touch/power behavior remain unverified here.

The name/victory/log backgrounds were removed as requested without silently replacing them with another backing or outline. Existing team colors remain blue `#176ab4` and red `#b93632`. Their contrast depends on the background: these hues do not universally satisfy 4.5:1 for small text over all dark battle textures. This is a known visual constraint, not a claim of universal WCAG compliance.

No real user screenshots, names, avatar URLs or room codes are included in this verification package. Synthetic QA controls are not included in the production release.
