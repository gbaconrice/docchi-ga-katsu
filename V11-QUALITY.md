# v11 quality candidate

Separate from the frozen ten-round calibrated candidate. No new unit, environment rule, economy, generation rule, physics or replay outcome change.

## Optional reactions
One optional 44px entry in the existing battle toolbar row opens four temporary stamps. Selecting closes the popover; tapping outside closes it and consumes that tap. Combat continues. The popover temporarily occupies that same toolbar row, not the battlefield. No extra row permanently shrinks the battlefield. Preview, pause, unit-info, results, home and hidden tabs suppress the UI. The latest short stamp expires in 2.6 seconds; at most four are retained internally. Rate and sequence limits apply.

Solo is local-only. In multiplayer a dedicated side channel requires the native SDK envelope room ID and sender, verified current membership, protocol/mode/session/round and battle phase. A payload cannot name its actor. Reactions never enter the game FSM, canonical replay, BET or ledger. Rejected/failed sends do not close the session or modify money. Native delivery is unverified; mock tests only.

## Original special audio
Four deterministic synthesized PCM accents: golem ground contact, storm chain, bomb explosion, drake impact. No fire cue for drake and no false critical-hit cues. Source must be an actual combat event or recorded replay effect. The bank loads before the existing audio controller; original voice/node caps, gesture unlock, mute, hidden/pause suppression and recording suppression remain. Physics/RNG/settlement never wait for sound.

Real speaker/mobile audition and visual QA have not been performed. PCM peak/bounds and fake WebAudio tests are not claims about perceived sound quality.

Known audio difference: canonical hit-spark records do not retain attack source species. Drake's dedicated impact plays from solo's actual resolved-hit event, while multiplayer replay currently falls back to a generic contact sound. Golem, storm and bomb have distinct recorded effect kinds. This candidate does not extend replay schema merely for this audio difference.

## Preview fit QA correction
A real-browser report on the prior public version found the static formation preview cropped at 1280×720, while live battle fit correctly. Desktop layout was gated only by fight phase; preview kept choose phase and therefore missed the field-fit rules. The correction uses a presentation-only data-field-view attribute for both battle and preview. Returning removes it and restores comparison. Phase, draft/BET, world, seed, clock and wallet are unchanged. Full-inline DOM/attribute and CSS checks pass; corrected visual behavior still needs browser re-verification.
