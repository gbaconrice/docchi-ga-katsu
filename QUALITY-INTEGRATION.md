# Responsive UI / licensed full-clip artwork integration

Gameplay base: v15 plus the separately tested initial-centering and extension-bankruptcy correction. New paper/ink responsive shell, compact round/balance HUD, scrollable comparison and fixed Start action. Home has one centered title and no header/tagline/free-prediction copy. Actual game-screen/mobile/native GRAVITY and audible QA are pending post-publication; headless tests are not visual approval.

## Artwork
Four existing roles use official Duelyst CC0 assets: shield, reaper_mantis, archer and healer. Their original PNG/plist, legal texts, source commit/hash and complete frame metadata are in `clips/`. These are licensed third-party assets, NOT newly drawn original artwork. The other20 selectable types retain previous artwork. No molten giant reference with mismatched baked fire/lightning was adopted.

Runtime source frames:59/58/76/70=263; the archer's3 source projectile frames are preserved separately but not rendered, avoiding a second projectile. No nine-frame reduction. Fixed anchors and contact/release/cast indices8/5/20/7 were inspected by the art owner on source poses. 83ms/frame remains provisional, not a claim of original-game timing. Source palette unchanged; team uses foot markers. Floating-style healer poses do not change the ground collision layer or healing radius.

Actual melee hit, projectile release and successful heal events trigger the corresponding source contact frame. A mere cooldown increase is not an attack. Anticipation skips early frames when insufficient time remains, never delaying damage. All original rectangles remain available. Comparison-card scaling uses the visible idle artwork bounds rather than empty source-cell padding; battle scale remains native.

## Canonical replay and result
Codec `variable-fullclip64-tail-v1` has role-local flat frame indices0..4095. Actual frame changes are recorded each tick. Shield/mantis death holds55ticks; archer/healer75ticks. Legacy units keep36ticks. No guest animation reconstruction.

Optional host-authored frame-only `presentationTail` completes remaining clips after the final combat frame. Combat ticks/winner/HP/positions and settlement remain unchanged and immediate. Tail is at most75ticks/1.25seconds, within the existing3second result interval; no new timers lengthen the result or cause duplicate SE/ledger writes. Hidden/cancelled result never restarts it. Codec validates final roster IDs, order, frame bounds and total2MiB payload.

## Safety and scope
Centering uses the adopted artwork's sprite/HP extents. This intentionally changes initial y positions and can change battle winners; historical pre-centering balance percentages are not a guarantee for this placement. Solver/stats and the approved economic rules are unchanged except the separately requested zero-balance extension stop.

All rejected reaction imagery is absent: the original native64px faces, the official hood-character emotes and their edited derivatives are neither embedded nor included. Reaction controls temporarily use short text labels only; final stamp artwork is unfinished and will be selected separately. Existing rate/TTL/member authority stays unchanged. Temporary feedback is an absolute pointer-events:none text overlay and never resizes field/toolbar/camera. Existing CSS utility icons remain functional.

Generic index has no guessed native obstruction. `tools/build_gravity_profile.py` generates a distinct one-file Gravity profile using explicitly provisional historical74/98px values. Supplied measured geometry / already-inset viewport takes precedence; safe-area is max, not sum. It is not native-device validation. No paid GRAVITY, real room, score submission, browser rendering or SDK verification was performed here.

## Tests
Full current regression suite PASS, plus16 fullclip/tail codec tests, pure59-frame sampler and actual-inline four-role event tests. All25 internal names remain defined. Preview input/wallet/world preservation, hostguest canonical equality, async capture, actual personal delta dedupe, bankruptcy boundaries, original6 event/status cues and source rectangle mapping pass. Raw source PNG hashes and all263 runtime rects are retained. No claim that static tests prove visual quality.
