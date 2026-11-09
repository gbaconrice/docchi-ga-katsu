# Requested multiplayer and battle updates

Entry: https://gbaconrice.github.io/docchi-ga-katsu/releases/requested-fixes-20261110/gravity-entry.html

Baseline: main a42af2f8e323c5c2ba05a07e9c53ada79a421e0c.

- Multiplayer ends after exactly 15 rounds. Rounds 11–15 retain ordinary percentage betting. A player at 0G can continue predicting; a correct prediction restores a balance floor of 10G in rounds 1–5, 30G in rounds 6–10, and 100G in rounds 11–15. Positive balances also use the same floor, so losing money deliberately cannot improve the next correct-prediction balance.
- Every result stays for five seconds on the host clock. The final result then advances to the complete standings, never a sixteenth round. Reconnection preserves the shared deadlines and participant balances. Solo checkpoint, overtime, payout and cashout rules remain unchanged.
- Multiplayer 3/2/1 is drawn on the actual battlefield before the existing replay start epoch, and the opening appears at that epoch. This never delays confirmation, replay ticks or settlement. A late replay joins the current ceremony position rather than replaying elapsed numbers.
- The normal summoner can create ten children. The Lich can create ten skeletons in total, including four opening escorts and corpse-based replenishment. Team and lifetime record limits remain enforced, and generation reserves eleven slots per summoner.
- The selected F-direction opening cue uses the original procedural drum-and-bronze sample. The 3/2/1 sound and all other UI cues remain unchanged. Mute, audio resume and voice/node caps remain authoritative.
- Participant gold stays visible after reaching zero or finishing; pure spectators retain the unknown marker. The two requested redundant menu/lobby sentences are removed.

All 698 existing image assets and URLs are reused byte-for-byte. Native header clearance, terrain, camera coordinates and original artwork are unchanged. The content revision changes intentionally; every participant must refresh to this same version.

The `qa/` pages are isolated test wrappers. They disable native rooms and external score submission and are not loaded by either production entry. Do not package them into GRAVITY.

Actual iPhone Safari, native GRAVITY transport, device audio and external ranking acceptance require separate real-device verification. Consult VALIDATION.json for the checks that were actually run.
