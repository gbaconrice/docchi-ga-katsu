# Portable layout regression checks

Run against an explicit final source and a repository containing the preserved historical input suite:

```
GAME_REPOSITORY=/path/to/repository GAME_HTML=/path/to/source/index.html node run-layout-regressions.cjs /path/to/new-report-directory
```

The runner verifies all173 original test hashes, stages an isolated workspace, runs15 explicit updated historical equivalents and2 real-handler regressions, then verifies source and originals stayed unchanged. It does not edit the historical tests. `GAME_TEST_ROOT` may explicitly identify the original tests; otherwise the repository's `tools/review-fixes/input-suite/tests`, `validation-preview/tests`, then `tests` are checked. A mismatched suite is rejected.

Each equivalent retains the original's remaining assertions. The bundled `.diff` files and `equivalent-edit-audit.json` document every expected-contract or harness-fixture change. This is separate evidence, not a173/173 canonical pass. The canonical initial result and all39 failure classifications are in the parent audit directory.

Focused scripts can also run independently using the same environment variables:

```
node test-prediction-entry.cjs
node test-choose-controls.cjs
```

They exercise actual solo and multiplayer transition handlers, same-phase reopening, menu/info/emote actions, validated reaction send/receive and participant rendering. They assert authoritative phase/deadline immutability. Browser geometry, iOS, and real SDK transport remain independent checks.
