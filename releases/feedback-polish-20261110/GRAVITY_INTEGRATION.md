# Feedback polish

Entry: https://gbaconrice.github.io/docchi-ga-katsu/releases/feedback-polish-20261110/gravity-entry.html

Based on main ae16ce4fa1eaeca62fdf70ef19819676792a1ff4. The solo 3/2/1 ceremony now runs after the canonical prediction commit has switched to the actual battlefield. Only the simulation clock is held during the short ceremony. Escape or interruption ends the ceremony without a second commit. Multiplayer confirmation and replay timing are unchanged.

The HP gauge is inside the lower fitted arena, as requested in the reference screenshot, with no coin marker. Prediction stamps are round in the existing card slot. Champion text retains its position without a label border. Audio recovery retries an unresolved resume on a subsequent trusted gesture, retaining mute and stale-generation guards.

All 698 image assets and URLs, physics, RNG, wallet, protocol and replay code remain unchanged. The only core loop change is the bounded solo presentation-clock gate.

Actual iPhone Safari, native GRAVITY and multiple-device transport/audio require separate real-device verification. Automated and browser checks are recorded with this release's validation report.
