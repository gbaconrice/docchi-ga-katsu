# Requested feedback polish

Source baseline: main ae16ce4fa1eaeca62fdf70ef19819676792a1ff4, `releases/fun-feedback-20261109`.

- Solo 3/2/1 appears only after the canonical confirmation displays the actual battle. The simulation clock is held until the ceremony ends; the audio context stays active.
- Escape/blur/visibility changes cancel the pre-commit card effect. After the battle transition, interruption only releases the ceremony, never commits twice or rolls back the wallet.
- The HP gauge sits at the lower inside edge of `fieldMap`, above the stone border. Its coin marker is removed.
- The prediction stamp is round in the same card row. Champion text keeps its location without a label border.
- A later trusted gesture can retry an unresolved Web Audio resume. Mute, pause, visibility and stale-request guards are preserved.
- All 698 existing images and URLs and unrelated source bytes are preserved. Multiplayer confirmation, RNG, physics, wallet, protocol and replay implementations are unchanged.

## Reproduce

From the repository root, use a fresh work directory:

```
node tools/fun-feedback-20261109/reassemble-demand-source.cjs releases/fun-feedback-20261109 /tmp/polish/base.html
python3 tools/feedback-polish-20261110/apply-polish.py /tmp/polish/base.html /tmp/polish/source/index.html
```

Copy `licenses/`, `ARTWORK.md`, `GRAVITY_INTEGRATION.md`, `EFFECT_ASSETS.json`, `COMBAT_AUDIO_ASSETS.json` and `STATUS_PROJECTILE_PROVENANCE.json` from this release into `/tmp/polish/source/`. Then:

```
node tools/feedback-polish-20261110/build-demand-release.cjs /tmp/polish/source/index.html /tmp/polish/build
node tools/feedback-polish-20261110/reassemble-demand-source.cjs /tmp/polish/build/releases/feedback-polish-20261110
node tools/feedback-polish-20261110/test-feedback.cjs
node tools/feedback-polish-20261110/test-champion-wire.cjs /tmp/polish/source/index.html
node tools/feedback-polish-20261110/test-clock.cjs /tmp/polish/source/index.html
node tools/feedback-polish-20261110/test-audio-resume.cjs /tmp/polish/source/index.html
```

Validation: 18 feedback checks, 5 host/guest protocol checks, 3 simulation-clock checks, 10 audio lifecycle checks, JavaScript syntax, exact source scope reversal and packaging roundtrip passed. Native iPhone/GRAVITY, cross-device transport and physical audibility are not certified by these tests.
