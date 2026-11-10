# Ten-round multiplayer and battle updates

Entry: https://gbaconrice.github.io/docchi-ga-katsu/releases/bot-adventurers-names-20261110/gravity-entry.html

Baseline: main a42af2f8e323c5c2ba05a07e9c53ada79a421e0c.

- Multiplayer starts with 1000G and ends after ten rounds. Ordinary percentage bets remain available; 0G participants keep predicting. Correct-prediction profit is 1× the stake in rounds 1–5, 1.5× in 6–7 (rounded up), and 2× in 8–10. The correct-prediction balance floor is 100G / 300G / 1000G in the same bands. Positive balances also use the same floor, preserving monotonic returns.
- Every result stays for five seconds on the host clock. The final result then advances to complete standings, never an eleventh round. Reconnection preserves shared deadlines and balances. Solo checkpoint, overtime, payouts, cashout and formation progression remain unchanged.
- Multiplayer mixed species begin at six, catalog-defined bosses at eight. Round ten can feature two or three distinct bosses, crowds or mixed armies. Family preferences are subject to budgets, geometry, prior matchup history and legal candidates; bosses are not guaranteed each time. The incumbent army remains intact. No combat stats are changed by the formation policy.
- Multiplayer 3/2/1 is drawn on the actual battlefield before the existing replay start epoch; the opening appears at that epoch. This does not delay confirmation, replay ticks or settlement. Late arrivals join the current stage rather than restarting elapsed numbers.
- Normal summoners can create ten children. The Lich can create ten total, including four opening escorts and corpse-based replenishment. Existing team/lifetime limits remain enforced, and generation reserves eleven slots per summoner.
- Only the opening cue changes to an original procedural F-direction drum-and-bronze sample. The 3/2/1 and all other UI cues remain unchanged. Mute, audio resume and voice/node caps remain authoritative.
- Participant gold stays visible at zero and after finishing; pure spectators retain the unknown marker. Both requested redundant menu/lobby sentences are removed.

All 698 existing image assets and URLs are reused byte-for-byte. Twenty BOT portraits are added separately. Native header clearance, terrain, camera coordinates and original artwork are unchanged. All participants must update to the same content revision.

The qa/ pages are isolated test wrappers. They disable native rooms and external score submission and are not loaded by production entries. Do not package them into GRAVITY. Actual iPhone Safari, native GRAVITY transport, device audio and ranking acceptance require separate real-device checks. Consult VALIDATION.json for checks actually completed.

## Adventurer BOTs

The host can add or remove BOTs before round one, with no difficulty setting. Combined player/BOT seats stay within eight. A real player replaces the last virtual seat if the pre-game roster is full. BOT identities are explicitly marked in authoritative snapshots, cannot be impersonated through external protocol input, and never become replay ACK recipients. Their decisions use session identity/round only, not army strength or outcomes. BOT standings are local to the room; only human owners retain the existing final score submission path. Native-adapter replay of a new game keeps the BOT count. BOTs remain as a supported lobby option. Twenty fixed katakana names and distinct portrait images are selected randomly without duplicate occupants. Removing a BOT selects one current BOT randomly. There are no difficulty levels.

Submission commentary is hidden, while ScoreBridge, duplicate prevention, native submission, and failed-send retry remain intact. The multiplayer BET hint keeps its basic win/loss/draw amounts, omitting the profit/recovery parenthetical. Wallet rules do not change.
