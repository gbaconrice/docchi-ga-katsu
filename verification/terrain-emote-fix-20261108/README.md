# Display and added-effect verification

Source SHA-256: `ff7862a0193b266463bf699edc8844b7ce30b7c9fb03e283462542f6d0f4985f`.

## Scope

- Complete terrain labels wrap at the original font size. Measured result clearance prevents overlap on short screens.
- Emotes keep their 18px box and upper-right avatar position; their backing and border are removed.
- The specified lobby explanation and redundant self-role suffix are removed. Routine room chrome and empty prediction/winner labels are omitted. Genuine names, settlement amounts, next-round controls and explicit error recovery remain.
- Only the added darkfan claw effect changes: persistent marks draw as narrow terrain-colored fissures below actors; short contact chips remain above. Its original events, lifetime and collision rules remain.
- One home GIF is replaced with the pinned 24-frame original-painting flame/light animation, with lamp bodies and chains fixed. All 573 original PNG/WebP files, original character drawing and non-GIF embedded assets are unchanged. The original PNG remains the static fallback.

## Reproduction

With Node.js and Python 3, run from the repository root:

```sh
node tools/terrain-emote-fix-20261108/reproduce.cjs /absolute/new-output-directory .
```

The output directory must not exist. The script first reconstructs and verifies the preceding public release, then applies the declared UI patches, exact GIF replacement, invertible claw renderer and content seal. It rebuilds the split release and checks every formal file, manifest and root entry byte-for-byte. The GIF is a pinned input, not regenerated during reconstruction.

## Tests

Scope tests verify the exact UI composition, one GIF replacement, reversible claw-only edits, unchanged character renderer and all original non-GIF asset bytes. Eleven claw checks include 1,200 natural battle ticks with identical events, effects, character frames, positions and HP. They also cover effect lifetime, ground/contact layers, all replay effect kinds and reduced-effects behavior.

The suite covers eight terrain labels, solo/eight-player emotes, clearance, lobby roles, eight focused match-label/recovery cases, all seven retained UI suites and seven actual distribution-loader cases. The results suite keeps its full gameplay equality check, normalizing only the literal, independently verified claw-renderer insertion. Normal next-round waiting remains 8 seconds, post-ten decisions 30 seconds and the prediction cap 60 seconds.

See `reproduction.json`, `source-build.json`, `retained-ui-summary.json`, the focused test logs and `claw-tests.json`. The exact final-source browser report is `browser-verification.json`: 384 fresh layout cases, 36 label/recovery cases, 96 claw width/facing/effect combinations, 160 onset/settled-time cases and native-play inspection across all eight terrains. It also covers original sprite loading, the fixed GIF, home/game pause and resume, unchanged button/title geometry, disabled motion, low power, page hide/show and a missing-image fallback with game entry and return. No game errors were recorded. The separate 1,344-case inherited layout evidence is labeled in `inherited-layout-verification.json` and supported by exact non-media source and CSS/DOM equivalence; those cases are not represented as fresh final-source runs. Five replacement tests verify direct original-GIF replacement and full inversion, and reject wrong source bytes, an already replaced input, duplicate GIFs and wrong replacement bytes.

## Limits

No physical iOS/GRAVITY safe-area, native room invitation, real SDK transport, CPU, thermal or battery benchmark is claimed. The GIF is 992,844 bytes; 24 fully decoded RGBA frames would be a conservative 56.25 MiB cache bound, not a measured browser allocation. Static fallback, reduced-motion and power-saving controls remain tested. Private screenshots, real user identifiers and browser-only test controls are not included.
