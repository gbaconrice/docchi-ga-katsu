# UI, result and visual restoration

This reproducible patch follows the ability modules and precedes content-revision sealing. It preserves all49 combat mechanics and source artwork.

Changes:
- Compact terrain/round/coin/audio header and home audio within the artwork.
- Prediction-stage menu, information and reactions use existing handlers and identity/round validation.
- Uniform 攻撃 label with unchanged numeric values; routine image progress text hidden while retries remain.
- Loss coins choose a safe continuous path instead of cancelling every coin when one crosses the wallet digits.
- New boss cues use shaded pixel materials and existing licensed effect sheets.

`apply.py` composes exact source patches. `original-presentation.js` is a strict replacement anchor; `presentation.js` is the final rendering module. It is intentionally applied after existing ability/replay patches.

Original historical tests and releases remain intact. Updated contracts must describe requested behavior explicitly; original failures remain separately reported. Browser verification, actual SDK/network delivery and physical-phone verification are different scopes.
