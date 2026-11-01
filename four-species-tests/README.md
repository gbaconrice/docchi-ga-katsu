# Four-species combat prototype — not integrated or calibrated

This independent candidate extends the frozen calibrated v10 horizontal core. No production/public source, wallet, round progression, UI, art, network or SDK was changed. It has 21 selectable kinds plus the existing spawn-only slimelet (22 internal kinds).

## Simple roles and provisional stats
| ID | One-line role | Cost | HP | Basic damage / cooldown | Radius |
|---|---|---:|---:|---|---:|
| screech_cricket | A cry briefly delays the enemy's next attack. | 3 | 65 | 8 / 1.3 s | 8 |
| reaper_mantis | Parries its first direct melee hit. | 5 | 125 | 29 / 1.25 s | 13 |
| spore_toad | A brief cloud poisons nearby ground enemies. | 5 | 145 | 6 / 3.5 s | 17 |
| rootwarden_treant | Softens incoming projectiles near allies. | 9 | 350 | 24 / 2 s | 27 |

All four are ground units targeting ground. Values are initial prototype values, not an equal-budget balance claim.

- Cricket: +0.35 s to the target's cooldown after simultaneous attacks resolve; already-created attacks are never cancelled. A target has 3.5 s reapplication immunity, no refresh/stack, and no movement slow.
- Mantis: 70% reduction on exactly one direct melee intent. Explosions, poison, lightning, cries and projectiles do not consume it. Concurrent attackers are chosen by existing stable priority/kind/id/token order, independent of input list and side reflection. This is not an all-tick shield.
- Toad: radius42 burst around its target applies poison to targetable ground enemies; no persistent spatial cloud or entity is created. Six 2-damage pulses at 0.5 s intervals total12 over3 s. No stacking/refresh; 1 s additional immunity after expiry. Applied poison persists if its source dies, including simultaneous source death. Poison targetability uses the shared tick-start layer snapshot. Visual `poison_cloud` must be a short puff, not a lingering damaging obstacle.
- Treant: radius80 center-to-center aura reduces projectile damage by25%, after existing target armor. Self included, friendly ground/air allies eligible. Multiple trees do not stack: highest reduction, then stable-order tie. Lightning/direct spells/explosions/poison are not shielded. Tick-start alive trees and positions determine the whole tick, even if a tree dies on that tick.

## State / replay contract
`four-species-contract.json` names primitive persistent fields and frozen event fields. `resolved_hit` gains additive `delivery` (`direct`, `melee`, `projectile`, `poison`); presentation should suppress ordinary impact sparks for poison, not damage or HP recording. Events never expose mutable entity references. Source-independent poison attribution retains the source token after death.

The new roles never summon; the existing32 active-plus-reserved/team and128 record/team bounds are unchanged. Radius27 is included in computed MAX_RADIUS and variable-radius grid queries. Initial center spacing must be at least54;56 is preferable where space permits. A physics-only32/team fixture uses8 rows at y80..458 spaced54 and four depth columns x44..206 / x436..274. Large sprite art may extend outside collision circles, so this is NOT a claim of art margins or UI visual correctness; generator/card integration must handle that separately.

## Test command and limits
`node tests.cjs` checks focused abilities, nonstacking behavior, source death, projectile-only aura, stable parry selection, exact old17 baseline state equivalence for8 seeds, new4 xmirror/list/choice/nohook equivalence for8 seeds, and64-entity large-radius bounds.

This is a mechanic prototype. Cross-roster/equal-budget calibration, generator eligibility, full compact replay encode/decode, real-browser visuals and SDK behavior remain integration work. No claim is made that the four roles are balanced or ready for publication.
