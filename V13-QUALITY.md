# v13 — personal settlement and hero contact FX candidate

## Scope
Based on v12 including the legacy slow/burrow/charge presentation regression fix. No physics, roster, generation, economy, 10-round limit, carry, or active/record cap changes. Large armies and optional paid-risk extensions are separate work, not included here.

## Personal settlement
The host's atomic wallet settlement now attaches the exact ledger entries as `roundResults` to the same validated snapshot. Each client selects its own playerId; the shared winner/carry is never treated as everybody winning. Entry balance difference and wallet totals are checked. No guest scoring or reconstructed reward amount.

The final canonical field remains visible behind a compact result panel. The shared left/right winner is a small secondary line; the main stamp is personal correct/incorrect/neutral and the amount is the actual ledger delta. A wrong free prediction shows 0 G, not a loss. Draw/invalid/unsubmitted players are neutral. An absent guest replay is not invented. Final multiplayer standings are separate and final-round-only.

Visible RAF choreography: 120 ms stamp, 280 ms actual delta pop, 450 ms balance pulse. These are cosmetic beats, not settlement delays. Existing 3-second solo auto-next remains; no extra tap. Terminal round and existing host/manual multiplayer transitions remain unchanged. Hidden/home cancels unissued stages and animations without replaying audio on return. Reduced motion or missing WAAPI stays static. Text always contains the real settled values; no fake counter, near miss, or altered money.

## Hero FX
Original native pixel atlases for golem single-target contact (300 ms), drake melee claws (200 ms, no fire), bomb burst (400 ms within actual radius 50), and chain endpoint (240 ms). Chain segments use exact-endpoint dark/gold/ivory lines, not stretched sprites. Material-only preview boards and unused direction tiles are not runtime assets.

Only accepted combat events trigger these. Drake gets its own canonical `drake_claw` effect, so guest visuals and the existing original special cue no longer lose its source classification. Replay version is `v13-personal-result-herofx-v1`; old-version packets are rejected. No extra audio event is emitted per rendered frame/shard. Existing global 24-object protection and per-family caps apply (stone 4, drake 6, bomb 3, chain 6). No new damage, shockwave, false projectile, terrain obstacle or camera shake.

## Tests / limits
Actual final-inline solo/multiplayer flow, 120/280/450 ms sequence, idempotence, hidden cancellation, self result and 0 G miss, presentation/ledger noninterference, hero PNG byte hashes/frame duration/caps/canonical effect roundtrip, original six event/status regressions, new-four status and 22-role schema, audio fake WebAudio/PCM pass. Atomic 8-player wire boundary/ACK-refusal tests are run separately before freeze.

Real screen/mobile/native SDK/reaction transport and actual audio audition remain unverified. Static layout reasoning is not visual QA. New personal-result panel deliberately overlays part of the final battlefield, never the active fight. Further approved large-army/reinforcement/extension work is not represented as completed here.
