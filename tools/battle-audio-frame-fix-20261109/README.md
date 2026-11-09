# Reproduce this narrow release

From the repository root, reconstruct the previous and current standalone sources. The reassembler verifies every asset hash and the complete source hash.

```
node tools/battle-audio-frame-fix-20261109/reassemble-demand-source.cjs releases/original-combat-audio-20261109 /tmp/docchi-before.html
node tools/battle-audio-frame-fix-20261109/reassemble-demand-source.cjs releases/battle-audio-frame-fix-20261109 /tmp/docchi-after.html
node tools/battle-audio-frame-fix-20261109/test-no-battle-background.cjs /tmp/docchi-before.html /tmp/docchi-after.html
node tools/battle-audio-frame-fix-20261109/test-integrated-audio.cjs /tmp/docchi-after.html
```

The first test verifies the unchanged encoded assets and effects, absence of sustained oscillators and repeated backing melody. The second covers event effects, scheduling, deduplication, lifecycle and 1000 bursts. Browser rendering and actual OfflineAudioContext measurements are documented in verification/battle-audio-frame-fix-20261109. Native physical-device hearing and actual Gravity multiplayer are not covered.
