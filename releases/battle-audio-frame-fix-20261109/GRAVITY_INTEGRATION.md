# GRAVITY integration

Use the complete fixed release at:

https://gbaconrice.github.io/docchi-ga-katsu/releases/original-combat-audio-20261109/gravity-entry.html

Load its JavaScript, CSS and assets in the order and at the paths specified by the release's `manifest.json`. Preserve references to reused assets in earlier fixed releases. Do not combine files from different versions, wrap the game in an iframe, or reimplement it. Every player in the room must use the same content revision.

The root aliases are `index.html` and `GRAVITY_EXTERNAL_ENTRY.html` at https://gbaconrice.github.io/docchi-ga-katsu/. Update these aliases only after the fixed release is deployed and its served contents are verified. These paths describe the intended deployment; this document alone does not confirm publication.

This release updates combat effects, status/projectile presentation and moon/ice-breath display anchors. Combat contact sounds use original readable procedural JavaScript synthesis, with 11 families and 3 variants per family, and no added recorded samples. Contact audio takes priority under the voice limit. Playback scheduling uses the audio clock after cold buffer generation.

Preserve original character image bytes, the fixed-body home GIF, baseline background/UI audio, gameplay rules, hit detection, damage and progression. Preserve existing SDK invitation and profile behavior, room joining/waiting/leaving, results, multiplayer synchronization constraints, and score eligibility/submission. Do not present unsupported SDK or multiplayer behavior as working.

Source SHA-256: `7d9a28e118a2bd0312469d23993cf83e47e28532f4387aecbb8a98375fc3924f`

Content revision: `997b48b0642d95e67c804645fff1fedeef5b8163ceb3395c042df62465147029`

Comparison: https://gbaconrice.github.io/docchi-ga-katsu/comparisons/original-combat-audio-20261109/

Repository verification reports: `verification/original-combat-audio-20261109/`

Repository reproduction tools: `tools/original-combat-audio-20261109/`

Check loading, mute, overlapping sounds, first playback and screen transitions after integration. Physical GRAVITY multiplayer, actual account profiles, score acceptance/ranking updates, device memory/performance and speaker output require separate live validation. Local and managed-browser tests do not certify those behaviors.
