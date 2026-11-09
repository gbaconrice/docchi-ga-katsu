# Reconstruct the original combat-audio candidate

This is an unpublished candidate, not a live release. The visual work is retained. The new sound bank is original deterministic JavaScript synthesis, not recorded or downloaded audio. Existing baseline assets, character artwork, game rules and limits remain unchanged.

Run `python3 build-source.py BASELINE_INDEX NEW_SOURCE_INDEX` to reconstruct from the pinned baseline. Run `node build-tools/build-demand-release.cjs NEW_SOURCE_INDEX NEW_OUTPUT_DIRECTORY` to create a self-contained release. Copy source-support files next to the source before packaging. Every source stage has a checked exact inverse. Reassembly must match the sealed standalone source exactly.

Listening previews compare the actual baseline and candidate audio factories through the browser's native OfflineAudioContext. Numerical QA is not subjective hearing approval or physical GRAVITY verification. Publication is a separate step after release acceptance.
