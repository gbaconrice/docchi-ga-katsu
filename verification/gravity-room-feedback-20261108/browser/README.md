# Final browser QA

PASS within the scope in report.json. Source SHA256: ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa.

Formal runtime SHA256: cd2acc050bf7484e409028dab6b936ab72a413d2c2e214470fc2ea8bab81ead1. Local QA runtime SHA256: b7ce86bcfa175705db36e869f051ac8f50e9a7b26236b29b7445688e6393e0d8. The only runtime difference is the unpublished GIF URL pointing to localhost. Separate QA helpers are not production code.

Verified native Chrome rendering at exact-width320/390/430/1200px iframes,900px tall. These are not physical devices or device emulation. Eight pick avatars do not move cards, names, stats or scroll heights. Long character names retain their existing truncation/wrapping/scroll behavior; no new typography changes were made.

Final actual reaction menu, emoji and outside-tap interactions pass in betting, fight and result. Delayed profile resolution, failed image fallback, eager successful images and badge survival on profile/image updates pass. The two discovered issues, a false image-failure runtime banner and non-clickable backdrop, were fixed and retested.

Natural result preserves +25G and wallet125; only the correct winning name appears, without details/summary or participant-results heading. The final result capture deliberately holds the clock after natural settlement for visual inspection. It is explicitly labeled timing unavailable, and is not wall-clock proof of8/30/60-second rules. Use the final automated timing tests.

Log fixture:8 recorded events,4 displayed outcomes (damage, healing, concrete status, positive block). Expiry/contact cleanup, empty status and zero block are filtered from display. Names retain original blue/red hues on transparent backgrounds. Actual GIF runs with cover; missing GIF and simulated reduced-motion preference restore the original still.

Full interrupted lobby lifecycle matrix passed on first seal60053b13c0df54359beb316d48375a68c85c39a4806d34e49de3a88e93065c61. Final eight-seat host layout was rechecked after narrow portrait/backdrop changes; full lifecycle matrix was not repeated after reseal.

All pictured identities, avatars and the QA room code are synthetic. No private user screenshots, real profiles or real room identifiers are included. No genuine GRAVITY network room, native invitation or physical WebView was exercised. Reduced motion is a QA media-query stub; physical safe-area/notch insets remain untested. At1200px the existing1180px app maximum is preserved.

Captures: lobby-390.jpg, picker-320.jpg, result-390.jpg, log-outcomes-390.jpg, home-gif-390.jpg. All render the final source. Picker image is320px; the visible QA panel retains the prior1200px audit text after resizing, while report.json includes the actual320px result.

No production files were edited or published by this QA pass.

