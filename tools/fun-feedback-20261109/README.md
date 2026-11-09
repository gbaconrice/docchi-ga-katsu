# Feedback integration on current production

PR #4's features are retained and integrated on `gravity-spacing-20261109`, whose sealed source is `1fec6310780fd73198af9accd5892ffdf6a8143988a7b0651830d6d44b66b3cc`.

- Normal-flow gauge row, outside the battlefield and its frame.
- Reserved card feedback row for crown and prediction stamp, below artwork and player picks.
- Stake-dependent 1–5 coin cues, stamp, solo 3/2/1/開戦, immediate multiplayer confirmation and battle horn.
- Cancellable ceremony bound to session, round, side and stake; immediate input shielding; Escape/hidden/blur cleanup; no stale delayed commit.
- Existing audio engine handles six new procedural cues with the same mute/unlock/voice cap rules. Controls with dedicated cues do not get duplicate generic taps.
- Guest crown uses validated optional `matchup.presentationChampion` metadata. It never feeds gameplay. Missing/invalid values hide the crown. Protocol version/implementation, physics, wallet, RNG and replay are unchanged, but the optional display field does add 57 bytes to the tested snapshot.
- Solo placeholder names hidden, terrain chunks use a forward-only scanner rather than regexp lookbehind, basic interval hidden on cards only.
- All 698 existing images and URLs, Gravity tall-field geometry, inverse tap coordinates and home extension are preserved.

## Reproduce

Run from the repository root. Use a new temporary work directory.

```sh
node tools/fun-feedback-20261109/reassemble-demand-source.cjs releases/gravity-spacing-20261109 /tmp/feedback/base.html
python3 tools/fun-feedback-20261109/apply-fun-feedback.py /tmp/feedback/base.html /tmp/feedback/source/index.html
# Copy licenses/ and ARTWORK.md, GRAVITY_INTEGRATION.md, EFFECT_ASSETS.json,
# COMBAT_AUDIO_ASSETS.json and STATUS_PROJECTILE_PROVENANCE.json from the candidate
# release into /tmp/feedback/source, preserving the current integration documentation.
node tools/fun-feedback-20261109/build-demand-release.cjs /tmp/feedback/source/index.html /tmp/feedback/build
node tools/fun-feedback-20261109/reassemble-demand-source.cjs /tmp/feedback/build/releases/fun-feedback-20261109 /tmp/feedback/reassembled.html
node tools/fun-feedback-20261109/verify-scope.cjs /tmp/feedback/source/index.html /tmp/feedback/base.html /tmp/feedback/source/changes.json
node tools/fun-feedback-20261109/test-feedback.cjs
node tools/fun-feedback-20261109/test-champion-wire.cjs /tmp/feedback/source/index.html
python3 tools/fun-feedback-20261109/verify-feedback-layout.py /tmp/feedback/source/index.html
```

The scope test reverses the exact nine approved replacements and the appended module/CSS, then checks every other byte against the sealed production source. Packaging roundtrips to the new sealed source. The static layout test does not claim rendered browser measurements.

## Browser fixture

```sh
node tools/fun-feedback-20261109/prepare-browser-qa.cjs releases/fun-feedback-20261109 /tmp/feedback/browser
python3 -m http.server 8764 --bind 127.0.0.1 --directory /tmp/feedback/browser
```

Open `http://127.0.0.1:8764/index.html` for ordinary solo flow. Add `?hostShell=gravity` for the existing host-shell layout fixture.

For two real tabs, open `qa.html?role=host&session=test1` first, then `qa.html?role=guest&session=test1`. Add `&bots=6` on the host for eight-player picks. This QA-only adapter uses the real protocol and BroadcastChannel. It disables native SDK access and score submission and is never loaded by a production entry.

Check 320×568, 390×844, landscape and desktop, solo and two-tab multiplayer, crowns/stamps/player picks, gauge/frame/HUD/result clearance, trusted pointer and keyboard input, cancellation/re-entry, all stakes/terrain labels, mute and reduced motion. Native iPhone/GRAVITY/multiple-device transport and audible sound quality require separate device checks.

## Publication state

This candidate does not switch root `index.html` or `GRAVITY_EXTERNAL_ENTRY.html`. Do not treat the original PR's browser results as certification of the revised candidate. Current browser verification results will be recorded after testing this exact commit.
