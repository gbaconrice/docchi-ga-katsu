# Terrain and emote correction verification

Final source SHA-256: `9b412ae06ac9c37ba58a6ef7e104b705a277eaf2ed6c5f396930ba44ee2372a5`.

## Scope

- The terrain slot keeps its existing 13px font and column. It wraps the complete name/effect instead of hiding the ending in a single-line horizontal scroller. Only a header that needs more lines grows.
- The participant emote keeps its 18px box, 14px emoji and upper-right portrait position. Only its cream backing and border are removed.
- A small isolated presentation observer measures the actual upper stack for the existing result panel. Its normal126px reserve,68% height cap, internal scrolling and styling remain. The measure is batched, never polls or runs on combat ticks, and writes only changed CSS values. A guarded mutation/font fallback covers engines without ResizeObserver.

## Exact checks

The portable scope test proves that removing the one declared CSS insertion and the one literal layout helper restores the entire prior source after normalizing only the exact release-content seal. All original runtime functions, DOM content, image/audio payloads, game rules and protocol are unchanged. All574 image files, including the home GIF, are identical to the prior release.

Tests cover all eight terrain labels at maximum strength, solo and eight-player sender badges in prediction/fight/result, expiry, no obsolete feedback surface, and all embedded script syntax. Layout-helper tests cover126→142→126 clearance, more wrapped lines, batching, unchanged-value guards, hidden-to-visible changes, asynchronous terrain changes, font completion and missing APIs. Repeated identical mutations cause no layout reads.

The preceding release's seven focused UI suites pass on the final source. The actual distribution loader passes its seven cases. The split release reconstructs the exact standalone source, and the clean portable reproduction also checks the prior release before applying this correction.

See the individual logs, `retained-ui-summary.json`, `source-build.json`, `reproduction.json`, and the browser report when included. The prior full gameplay/replay equivalence evidence is in [the preceding release](../gravity-room-feedback-20261108/README.md); this correction preserves all original gameplay bytes rather than claiming a new balance simulation.

## Limitations

Native browser width/inset fixtures are not physical devices or real GRAVITY WebViews. Real SDK profiles, room transport and physical safe-area behavior still need in-app verification. Private user screenshots and browser captures are not included in this package. Test-only controls are not part of the production release.
