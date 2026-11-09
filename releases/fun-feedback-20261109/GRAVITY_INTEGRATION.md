# GRAVITY feedback integration candidate

Entry after publication: https://gbaconrice.github.io/docchi-ga-katsu/releases/fun-feedback-20261109/gravity-entry.html

This candidate rebases every PR #4 feedback feature onto gravity-spacing-20261109. Keep the release manifest, load order and existing shared image URLs. Do not recreate the game or add an iframe. Root entries are not switched by this candidate commit.

The gauge has its own normal-flow row above the field; crown and prediction stamp have a reserved card row below the art/pick lane. Solo ceremony jobs are cancellable and bound to the current session, round, side and stake. Multiplayer confirmation remains immediate.

The simulation, RNG, wallet, replay and protocol implementation remain unchanged. Matchup snapshots gain optional presentationChampion metadata for guest display only. Missing or invalid metadata hides the crown, with no gameplay effect. Six synthesized UI cues use the existing audio engine and mute/unlock/voice limits.

All 698 current image assets and their URLs are preserved, including the Gravity home extension. Existing tall viewport, inverse tap coordinates and native host clearance remain intact.

Source SHA-256: 58a0e98856638a813b817d6f5cf08c310cd250b6845917bc39b0fddfd910ea3e

Reassemble with tools/fun-feedback-20261109/reassemble-demand-source.cjs. See that folder's README for regression tests. Browser results are separate from code/VM verification. Actual iPhone Safari, native GRAVITY profiles/leaderboards and multiple-device native transport are not certified by local tests.
