# Test scope and execution

`tools/run_tests.py` accepts explicit runtime, CSS and assembled HTML inputs and executes copied tests inside a temporary directory. It never edits those inputs or the packet. Use an assembled normal-source HTML test fixture for local integration; an external-script-only loader is not a valid input. The runner rejects HTML without the runtime marker.

The suite covers camera mode/touch behavior, all 300 selectable-species emphasis rules, opening full-heal/replay, trusted audio resume, failed-image retry, crowd focus and replay independence, pillar mechanics/cancellation/lifetimes/rollback, and reward timing/BigInt/lifecycle/mute/multiplayer behavior. Pillar fixtures are synthetic; they do not establish live failure rates.

Most copied tests are byte-identical. `provenance/test-sources.json` records source identifiers/hashes and the two path-only test adaptations (strength input/harness path and audio-resume harness path). No assertions were weakened for packaging. Some earlier source tests already contain explicitly recorded mock adapters; see historical provenance below.

Four reward suites intentionally use `adapted-fallback-preload.cjs`, which simulates image failure then exercises the genuine continue-with-placeholders UI. This is separate coverage, not a successful real image/network load. The inherited ordinary MVP image-gate failure is not counted as a pass. Other original ordinary tests were not copied merely to claim a higher pass count.

The original unchanged full legacy suite on the reward experiment reported 35/38 fallback and 25/39 ordinary, including three expected requested-timing mismatches. Upstream-updated expectations reported 38/38 fallback and 28/39 ordinary, with the known 11 ordinary image-mock failures unchanged. These are historical results, not tests of current main or the future merge.

Mock tests do not prove iOS gestures, GRAVITY compatibility, audible sound quality, WAAPI animation, actual browser image loading, mobile layout, device FPS, CDN/cache recovery or two-device network behavior. Do not publish until required normal-source regression and real acceptance checks are complete.

## Output-isolation regression

`python tools/check_output_isolation.py --runtime <runtime> --html <assembled-html> --css <css>` runs all 37 suites with an inherited `OUT` pointing at a protected sentinel outside the runner scratch directory. It requires the sentinel to remain byte-identical. The runner removes inherited `OUT` and `NODE_OPTIONS`; test inputs and copied helper paths are supplied explicitly.
