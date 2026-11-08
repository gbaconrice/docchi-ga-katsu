# Display cleanup verification

Source SHA-256: `b296d5d85653c7d3906d807f7c74cce087c60fa2692a5f6e51b542a6c0c49be0`.

## Scope

- Terrain names and effects wrap inside their existing header column, retaining the font size. A measured result clearance prevents overlap on short screens.
- Emotes keep their existing 18px box and upper-right avatar position, with only the backing and border removed.
- The initial host lobby explanation and redundant self-role suffix are removed. Genuine names, avatars, host permissions and lobby controls remain.
- Routine game-room summary and exit chrome are hidden during normal play. Empty prediction/winner labels are omitted. Actual winner names, settlement amounts and the lower next-round controls remain.
- Existing recovery controls are retained only for explicit failures, not ordinary replay preparation or clock waiting.

All original character rendering and embedded assets remain unchanged. This checkpoint does not modify character attack/hit frames, effect rendering, simulation, room transport, native invitations, prediction receipts, money calculations or deadlines.

## Verification

The exact-composition test rebuilds the declared three patches and content seal. It verifies original character rendering, image-byte equality, five-script structure and idempotence. The redundant-label patch has seven invertible display-only edits; the lobby patch has four exact edits.

Focused tests cover all eight terrains, solo/eight-player emotes, overflow and clearance behavior, lobby roles and status transitions, routine versus actionable-error display, and a real canonical timeout receipt retaining its exact 0 G settlement.

All seven retained UI suites pass, including 27 lobby cases and 20 result/receipt/deadline cases. The latter retains its comprehensive original gameplay equality check; only the two superseded empty-label expectations change. Normal next-round waiting remains 8 seconds, post-ten decisions 30 seconds and prediction cap 60 seconds. The actual distribution loader passes seven cases.

Run `node tools/terrain-emote-fix-20261108/reproduce.cjs /absolute/new-output-directory .` from the repository root with Node.js and Python 3. The output directory must not exist. This first rebuilds and verifies the preceding release, then rebuilds this source and checks exact split-release reassembly.

See `source-build.json`, the test logs, `retained-ui-summary.json`, and the reconstruction/browser reports when included. Browser fixtures are not physical-device or real GRAVITY verification. Private screenshots, native identities and test-only controls are excluded from the release.
