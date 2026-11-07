# Real Canvas2D review, not browser verification

Frozen source: `649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7`.

Renderer: installed `@napi-rs/canvas`, real Skia Canvas2D. The five production scripts execute unchanged in a Node VM. Production `step()` generates state/events and production `draw()` draws actual decoded embedded sprite images. DOM nodes and scheduling are test stubs; no Chromium, browser navigation, network, SDK or publication was used. No sprite images or production modules were changed.

Outputs:
- `contact-all49.png`: one actual ability frame for every approved boss, with role identifier and simulation tick.
- `contact-detail.png`: 40 additional frames spanning orbit, crossing birds, progressive light/fire columns, falling meteor, ground fissure, freeze, growth, reflection, splitting children, death-wall children, raised skeletons, red army aura, throw, airborne lift, and phase opacity.
- 89 original full-resolution 480×538 PNG frames.
- `canvas-report.json`: per-frame effects, units, flags, sprite-readiness and asset status, plus SHA and limitations.

Result: 89 frames, 87 decoded image objects, zero image failures, zero pending assets at capture, zero render/image errors, zero untriggered scenarios. All captured unit sprite references were ready. Empty image-source release calls are intentionally ignored by the harness; they are not failed asset requests.

Test setup: fixed small matchups. Death-triggered bosses start at 1 HP and die from ordinary production enemy attacks. Werewolf begins at 40% HP. The lich corpse scenario starts enemies at 1 HP so ordinary combat creates corpses. No effects are injected and no damage/action code is replaced. Frames are selected using real emitted event/status predicates. This verifies these controlled situations, not every possible matchup.

Visual inspection: both contact sheets were opened. Decoded sprites, HP bars, distinct attacks and status overlays are visible; no placeholder boxes appear. Columns rise vertically, meteor moves down toward impact, fissure extends along the ground, frozen targets have ice shells, phase reduces opacity, and spawned children render as actual sprites. Large source-authored attack frames can cover parts of the small added cues at certain ticks; the multi-tick detail sheet helps inspect the underlying geometry. Static contact sheets alone do not establish complete animation readability, mobile layout, touch usability, browser performance or multiplayer delivery.

Reproduce: `node tests/render-canvas.cjs`. The harness checks the frozen source copy at `reports/canvas/frozen-source.html` against the full SHA above and writes this clean final folder. Earlier `reports/canvas` images are preliminary and are not part of this final review.


## Portable optional QA dependency

This review used Node v24.22.1 and `@napi-rs/canvas` v0.1.100. The harness uses ordinary `require('@napi-rs/canvas')` resolution, with no private installation paths. `sharp` is not used. Canvas is an optional development QA dependency, not a dependency of the game or delivered HTML. With the package available through normal Node resolution (or a caller-configured NODE_PATH), run `node tests/render-canvas.cjs` from the project root.

On a fresh checkout, if `reports/canvas/frozen-source.html` does not exist, the harness first verifies that `source/index.html` has the exact expected SHA above, then creates the snapshot with an exclusive write. A differing existing snapshot is rejected without replacement. A changed current source cannot initialize a new snapshot. Initialization was smoke-tested independently without rerendering all frames.


## Interoperability refresh

All 89 frames were rerendered from the exact 649a36f5 snapshot after reading `reports/boss-status-interop-audit.md`. Both new contact sheets were opened and visually inspected. Zero render/image errors, missing or pending assets, or untriggered scenarios were reported. These fixed fixtures do not independently exercise every newly repaired ordinary-support interaction; their authoritative coverage remains in the separate interoperability tests. Prior 46a92 PNGs, report, review, source snapshot, and harness are preserved under `reports/snapshots/46a92df7-canvas/`. The latest authoritative Canvas outputs are in `reports/canvas-final/`.
