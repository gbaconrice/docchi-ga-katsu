# External release: 2026-11-06

The root `index.html` is now a small **external-file entry**, not the inline game
source. Do not run an old inline-source test directly against the root entry.
Use the supported runner below. It never replaces the deployed root file.

## Identities

- External root entry SHA-256: `756e0cd15ef0b1f00c23457be14ee88494630b6580fc83f39680cb7213362001`.
- Reconstructed game source SHA-256: `fe91cc2808610cb6a33f7aa2696aa84c2b4009bb2f70326e7bf2aa14296710a0`, 48,368,569 bytes.
- Release manifest: `releases/reconstructed-20261106/manifest.json`.
- `CURRENT_PREVIEW_MANIFEST.json` identifies the external entry and its source separately. `PUBLIC_MANIFEST.json` remains an unchanged historical record.

## Supported verification

Requires Node.js 18 or newer; the Node/VM checks need no npm installation.

```sh
node tools/external-release/test.cjs
```

The runner verifies the actual external entry, release hashes, asset bytes,
script syntax, URLs, defer order and boot with the original stub-DOM harness.
It reconstructs the original game into an isolated temporary directory and
stages the exact reviewed test inputs listed in
`tools/external-release/regression-inputs.json`. It then runs every discovered
top-level non-browser test. The current canonical suite has **127 tests**.
Missing or altered required inputs fail verification; newly added tests are
also run. Logs and `summary.json` are retained in the reported directory.

The main repository's original tests are not modified. Nine reviewed variants
live in `tools/external-release/reconstructed-tests/` and replace only their
temporary-worktree counterparts. The original nine run separately, unchanged,
as historical compatibility diagnostics. On this source those nine fail;
the other 82 historical Node tests pass. Thus **127 canonical passes does not
mean the historical suite or direct-root invocation passes**. The runner names
this result `PASS_CURRENT_RELEASE_WITH_HISTORICAL_DIFFERENCES`; its successful
exit status applies to current-release checks, not the historical diagnostics.

The source-validation manifests in `tools/external-release/fixtures/` are
historical fixtures copied only into the temporary worktree. Their
`unpublished` text describes the original review snapshot, not current hosting.
The original GRAVITY builder is also preserved; its reviewed five-script
variant is staged only in the temporary worktree.

The nine variants cover balance budget expectations, legacy CSS block bounds,
guard descriptions, removed formation-preview copy, roster metadata,
opening reachability, participant layout, prediction display, and comparison
styling. They predate this packaging. Their differences are explicit and are
not suppressed by changing the game source or rewriting the old assertions.
The exact comparison is saved in
`tools/external-release/historical-test-differences.patch` for review; it is not
applied to the repository's original tests.

## Reproduce the 31 deploy files

Choose new, absent output directories:

```sh
node tools/external-release/test.cjs --report-dir /tmp/docchi-release-report --rebuild-to /tmp/docchi-release-rebuilt
```

This also rebuilds the release and compares every deployable file byte for byte
with the current release. The builder refuses to overwrite an existing output.
Use `--keep-temp` to retain the reconstructed source worktree for inspection.

For source-only reconstruction and an integrity check:

```sh
node tools/external-release/reassemble-source.cjs releases/reconstructed-20261106 /tmp/docchi-source/index.html
```

For external-entry checks without running all source regressions:

```sh
node tools/external-release/verify-external-release.cjs
```

The standalone deterministic builder is
`tools/external-release/build-external-release.cjs INPUT_INDEX OUTPUT_DIRECTORY`.
It requires the frozen source hash and the original `ARTWORK.md`,
`GRAVITY_INTEGRATION.md` and `licenses/` beside the input. The supported runner
prepares these inputs from the immutable release automatically.

## Packaging and limits

The root entry, immutable release entry and GRAVITY entry use the same five
original scripts. Eight ordered static data bundles preserve the exact runtime
image/audio strings and existing data-URL validators. Four UI images are
byte-identical hashed binary files. No gameplay logic is rewritten or minified.
Every deploy file is below 8 MiB even after base64 transport encoding. The
GRAVITY entry is 2,699 bytes and uses `data-host-shell="gravity"`; standalone
entries use `standalone`. Total first-load bytes are not claimed to be reduced.

The optional `tests/integrated-browser.cjs` and
`tests/map-emote-layout-browser.cjs` are preserved but not run by this command.
They need a browser-capable environment. No real-browser rendering, GRAVITY
SDK/multiplayer, live CSP/network loading, iOS, or audio playback success is
claimed by the Node/VM tests. Publication must be verified separately.
