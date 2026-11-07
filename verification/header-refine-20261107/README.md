# Header and controls refinement verification

Exact final source SHA256: `14103deee70be661f36874c3ebfaa7e883d35bab92abea12089bd42368bea440`.

Base source SHA256: `fef9176e59383910de20f077882565c3ef44f35ca32147bf95b219647c727adf`, reconstructed from preserved `releases/ui-world-restore-20261107`.

## Reproduce

From the repository root, with Node.js and Python 3:

```sh
node tools/header-refine-20261107/reproduce.cjs /tmp/header-refine-reproduction
```

The output directory must not already exist. An optional second argument specifies the repository root. The script reassembles the immutable prior release, verifies its hash, applies the three narrow presentation patches and the metadata-only path portability patch, seals the canonical content revision, and verifies the exact final hash. It copies the prior release builder and changes only its RELEASE path, preserves ARTWORK, integration documentation and licenses, packages the release, copies manifest-listed immutable image dependencies into the isolated output, reconstructs the package and rechecks its source hash. No repository source or prior releases are changed. It also runs focused controls and zero-result runtime tests, 66 combat integration checks, and seven actual packaged-loader fixtures.

The recorded reproduction passed; its generated manifest was also byte-content equivalent to the final package manifest. Generated scratch payloads are not included in this verification directory. See `reproduction.json` and `reproduction.log`.

## Checks and evidence

This directory contains only final-version evidence plus the unchanged baseline issue and entry-loader fixtures.

- Focused controls runtime: PASS, including one audio node/listener across game/home/room, information hidden across phases, repeated solo/multi phase menu transitions, eight terrain IDs and no-terrain state. `header-controls-current.cjs.log`.
- Existing zero-result runtime: PASS, including startup/battle, asset callbacks, zero-balance prediction, final loss, win/loss/draw, and small-balance selection. `zero-result-ui.cjs.log`.
- Combat integration: 66/66 against the exact final source. `integration-ready.log`.
- Entry-loader fault fixtures: 32 passing. `entry-loader.log`.
- Actual release loader DOM fixtures: 7 passing against the final packaged code. `release-loader-ready.log`.
- Final ordinary responsive browser matrix: 144/144, allPassed true. `ordinary-ready.json`.
- Final GRAVITY responsive browser matrix: 144/144, allPassed true. `gravity-ready.json`.
- Prediction placement browser fixtures: 19/19 (18 label × width cases and one participant rail DOM fixture). `prediction-states-ready.json`.
- Gold typography browser matrix: 36/36 (six widths × choose/fight/result × ordinary/double-up). Held and winning amount font family, weight and style match; held gold retains 26px size and horizontal scrolling. `gold-fonts-ready.json`.
- Existing pause-exit test retains its known final multiplayer fixture failure (expects one leave call, receives zero). The unmodified baseline and patched candidate outputs match exactly; preceding solo lifecycle checks pass. `baseline-pause.log` and `patched-pause.log`. This test was neither modified nor excluded to claim an aggregate clean pass.

Held gold now matches the established winning-gold font family and weight, while keeping its size and exact-value scrolling. The approved choose-phase prediction badge sits at the left edge, vertically centered with the toolbar controls; active reaction feedback stays visible beside it. The multiplayer participant rail remains in its existing row below. Fight/result badge and clock placement are unchanged. The patch moves audio into the toolbar only in game, retains but hides the information control and hooks, exposes semantic terrain identity, and simplifies only the choose-phase pause contents. Score submission, cashout, exit and multiplayer leave logic are unchanged. Header spacing, colors and control locations are presentation changes. Exactly 57 quoted asset provenance paths were made portable in metadata; attribution, licenses and image bytes are preserved.

DOM mock checks are not real browser/device proof. Responsive browser results cover the recorded desktop-browser widths and fixtures, not physical touch devices or iOS WebView. Actual GRAVITY SDK acceptance and live-network multiplayer remain unverified. Counts from overlapping suites are not summed into a combined test total.

## Public evidence sanitization

Only absolute local filesystem prefixes in copied logs were replaced with portable `<validation>/` or `<reproduction>/` placeholders. Assertion results, expected/actual values, stack line numbers, and other output were not changed. Original local logs are retained unchanged outside this publication bundle.

## Browser inspection

`final-header-mobile.png` records the final mobile header. Open `qa-header.html` or `qa-gravity-header.html` from this directory through the same-origin site, press Solo after the game loads, then use the matrix, prediction-state and typography buttons. Their frames reference the ordinary root entry and final GRAVITY release entry respectively. Keep the browser tab visible while measuring because animation-frame throttling can delay background runs. Participant rail checks use a DOM fixture, not a live multiplayer room. These optional QA pages are separate from the game entry and do not establish real GRAVITY SDK acceptance.
