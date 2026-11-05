# Integration review packet

Prepared for the specifically approved artifact-only public review branch. Live-game deployment is not approved by this packet. This is not a deployable game, a production replacement, or a claim that the latest normal game has been integrated.

## Contents

- `patches/`: complete human-readable v3-to-cloud-reference deltas for runtime, CSS and markup.
- `assets/`: the five generated floor images only. Existing game art, tavern art and audio are not duplicated.
- `tests/`: selected preserved regression suites with documented path-only adaptations.
- `provenance/`: baseline/reference hashes, intended asset paths, test provenance and explicitly historical results.
- `tools/`: packet verification, isolated reference reconstruction and portable test execution.

Start with `CONFLICT_GUIDE.md` and `TESTING.md`. There is deliberately no automatic application command targeting normal `index.html`, no publication script, and no complete game/runtime bundle.

## Verify and reconstruct the historical reference

Use Python 3 and Node.js already installed from official sources. Nothing installs dependencies or downloads files.

1. `python tools/verify_packet.py` verifies every packaged file and rejects missing/extra files.
2. `python tools/reconstruct_reference.py --baseline-dir <repo>/releases/gravity-lazy-v3/gravity --output <new-empty-path>` reads the hash-pinned v3 baseline and reconstructs a test-only reference in a directory that must not exist. It never changes the repository.
3. `python tools/run_tests.py --runtime <new-empty-path>/game-runtime.js --html <new-empty-path>/fixture.html --css <new-empty-path>/game.css` runs mock tests in a new temporary directory.

Reconstruction reproduces the older cloud experiment, not the latest normal game. Integration on current main must be separately reviewed. Do not copy reconstructed files over normal root.

The packet includes 14/60 unresolved synthetic pillar corner cases as a known limitation, not a real-world failure rate. Actual phone/iOS/GRAVITY gestures, sound, rendering, network recovery and two-device play remain acceptance work.
