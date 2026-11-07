# Home audio correction

Source SHA256: `9872204a68cf587f56a429cd3369dc057445b8d6463747b89a9da030f1eb6c2d`.
Content revision: `c8000006e8f24710e6db9c37dc6e2a94c5bdbfe1ac566fc6404fa7ac90ffb5bd`.
Release: `releases/header-refine-home-20261107`.

## Scope

Adds only `#app #homeScreen > #soundToggle { display:none !important; }` to the previous approved final source, then reseals its revision. The single audio node, listeners, mute state, gameplay toolbar and room audio placement remain unchanged. Previous releases remain immutable. Source, artwork and licenses are preserved; images are reused byte-for-byte.

The focused test removes this exact CSS insertion and reseals the source, recovering the previous source SHA256 `14103deee70be661f36874c3ebfaa7e883d35bab92abea12089bd42368bea440`. This proves no additional source changes occurred. Synthetic DOM checks exercise home → game → room → home → game with the same audio node and listener. They verify the home-only CSS contract, not real-browser computed display; visual browser verification is separate.

## Reproduce

From the repository root:

```sh
node tools/header-refine-home-20261107/reproduce.cjs /tmp/header-home-reproduction
```

Use a new output directory. An optional second argument selects the repository root. The script reconstructs the immutable ui-world-restore base, applies the full five-patch pipeline, verifies the exact source hash, packages the new release using the previous builder with only RELEASE changed, restores shared image dependencies into isolated output, reassembles it and runs the focused controls/home-audio, zero-result, 66 combat integration and seven actual-loader checks.

## Validation

- Focused home-only CSS/source invariance and audio node/listener lifecycle: PASS.
- Existing controls test: PASS.
- Existing zero-result test: PASS.
- Combat integration: 66/66, exact final hash recorded in `integration-ready.log`.
- Actual packaged release loader: 7/7. `release-loader-ready.log`.
- Reproduction, reassembled source hash, and copied source/package identity: PASS.

These checks are synthetic runtime/DOM checks, not physical-device, live multiplayer or real GRAVITY SDK validation. Previously documented pause-exit multiplayer fixture failure remains a known baseline issue; that test was not modified or included in this targeted passing suite. No aggregate full-suite pass is claimed.

Copied logs replace only absolute local filesystem prefixes with portable placeholders. Assertion text and outcomes are unchanged.

## Browser verification

Normal and GRAVITY entries passed home → game → home cycles at 320, 390 and 1200px. Home control computed display was none and width zero before and after play; the same gameplay node remained 44×44px in the toolbar. A real click changed its label from サウンドをミュート to サウンドをオンにする. See browser-home-audio.json. Physical devices, real Gravity SDK and live multiplayer remain unverified.
