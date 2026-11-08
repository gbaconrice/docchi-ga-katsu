# Ranking-notice verification

Final source SHA-256: `6283b7ec63b7e8c876ce6bff3377fbacfa9248df7c17ac8d08c861e9331ed3a4`.
Base commit: `7e8519c48608551bc2092284492a8e0f36720557`.

The change removes the 51-byte standalone notice literal. The only other source change is the deterministic content revision. Other ranking text, retry suffix/controls, submission routing, eligibility, score payloads, gameplay and all embedded assets remain unchanged.

The portable reproduction verifies the immutable base release and reassembler hashes, strict pre-seal inversion, independent sealed scope, 32 paired executions of the actual ScoreBridge/submission code in an isolated VM, and seven distribution-loader cases. All 574 existing image bytes and URLs, including the fixed-body home GIF, are reused. It checks the 17 formal files and both root entries byte-for-byte.

Run `node tools/ranking-notice-fix-20261108/reproduce.cjs /absolute/new-output-directory .` from the repository root with Node.js and Python 3.

The exact final-source browser evidence is `browser-verification.json`: 78 baseline/candidate UI states, 39 paired comparisons and 18 original retry-control flows at 320, 390 and 1200px. Other text, controls, statuses and in-memory payloads match. The empty room-entry status frame has zero height; lobby Start/Exit and final amount/Home controls remain. All 17 served formal files match, and no application errors were recorded. Prior terrain/emote/media checks are inherited through exact unchanged source, not presented as fresh runs. Synthetic score transports cannot send actual scores. No physical GRAVITY, real ranking acceptance, native identity/network behavior or device-performance verification is claimed.
