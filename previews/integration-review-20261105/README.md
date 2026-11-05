# Integration review preview

This self-contained preview is separate from the normal game. It is based on main `5377bae0aaf2135c43834a2c18780467bb579034` and locally integrates selected features from review packet `0380c5a2b1e1894b176ede21874a9dbbfd674165`. It preserves the tavern artwork and five existing sound files; their source and license are documented in `../../licenses/SFXMINT.md`.

The candidate passed 90 normal mocked regression tests, 37 adapted packet tests, and a separate inline image failure/retry test. Two packet tests use equivalent embedded asset fixtures instead of the older external URLs. These are mock/synthetic checks: actual mobile rendering, iOS gestures, audible sound, GRAVITY WebView and live multi-device communication remain unverified. The experimental pillar feature retains 14 unresolved cases among 60 synthetic dense-corner fixtures; that is not an observed gameplay rate.

The HTML is approximately 42 MB and can take time to download. This page is for review and does not replace the normal game. Its gameplay content revision is `92a48b98155d8170c7d5bd4d556cf4e865c02e60058f36b1d96784c57c43fb14` and its expected HTML SHA-256 is `e71a60792b2a939413c0ecc67d0329d80e9cf6da609dfc80a9f689e7a3de3478`.
