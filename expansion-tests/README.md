> v10 note: this folder’s physics.js now uses horizontal combat. Legacy vertical trajectory/counter fixtures below are historical. Current axis regression: `node ../v10-horizontal-physics-audit.cjs` from this directory (or run the file from the candidate root). See `../V10-HORIZONTAL-AUDIT.md`.

# Six-unit combat expansion — frozen candidate

This folder owns combat source and contracts only. No browser rendering, publication, SDK calls, or economy changes were performed. Original v6.2 files remain unchanged.

## Integration inputs
- `physics.js`: drop-in reviewed solver, old 11 types unchanged.
- `monster-contract.json`: old four monster types plus the six new selectable types and spawn-only `slimelet`.
- `expansion-contract.json`: exact primitive status fields, event names/coordinate fields, selectable/child IDs, and bounds.
- Add the six selectable IDs to generation intentionally; **do not generate `slimelet` initially**.

## Distinct actions / final candidate values
| ID | Cost | HP | Damage / interval | Distinction |
|---|---:|---:|---|---|
| boar | 5 | 155 | 20 / 1.2 s | First impact +32 damage and 22 px nominal push; heavy targets resist push by mass ratio. Opening speed72, then30. |
| bombbug | 3 | 55 | explosion115 | Approaches at48, detonates once at contact, hits ground enemies within radius50 + target radius, and dies even if simultaneously healed. |
| frostmage | 4 | 85 | 15 / 1.4 s | Projectile slows movement to .55 for1.5 s. No stacking/refresh; .75 s post-slow immunity. Ground + air. |
| stormmage | 5 | 80 | 24 / 1.4 s | Up to3 unique targets, next link within60, damage multiplier .65 per link; ground + air. |
| burrower | 5 | 120 | 25 / 1.1 s | One .5 s vulnerable warning, .3 s underground travel, then ordinary melee. Rearmost target; equal rear depth uses nearest x before stable tie-break. |
| slime | 4 | 115 | 12 / 1.4 s | On death queues up to2 slimelets. |
| slimelet | spawn-only | 35 | 7 / .9 s | Small ground melee, speed34. Never splits or summons. |

Burrow warning x/y marks destination; sourceX/Y marks current position. The unit can be killed during warning, emits no attack while underground, and never repeats the ability. All source hooks contain frozen primitive snapshots. A split child emits both existing `summon_spawn` and specialized `split_spawn`; choose one visual mapping to avoid duplicate sparkles.

## Finite entity / fairness invariants
- Concurrent live + queued reservations ≤32 per team.
- Slime splits are queued after simultaneous damage, enter next tick, inherit side, use `${parentToken}/split:${index}`.
- A dead parent does not cancel its already-queued child.
- Initial cap32 and finite children imply ≤32 + 3×initial_wraith + 2×initial_slime ≤128 created records/team (256 total). No recursive descendant spawning.
- Stable token/priority ordering, no added shared RNG calls, fixed dt unchanged.
- Existing 11-kind combined fixture is bit-for-bit equal to the old core across final units/HP/positions/winner/time/pending children.

## Validation
`node tests.cjs`: old11 equality, all six abilities, next-tick splitting, frozen primitive hooks, vulnerable burrow warning, plus20 mixed seeds under mirror / list reversal / choice / no-hook / buffer / callback variants.

`node caps-test.cjs`: simultaneous32-slime deaths do not exceed32 queued/live children; 64-initial mixed stress observed peak32/32 active and records67/65, 1189 ticks to result. This is headless stress, not mobile performance approval.

`node final-balance-probes.cjs`: final values,20 deterministic placement/cooldown fixtures per pair. These are local matchup probes, not exhaustive17-kind balance calibration:
- boar3 vs archer5:20/20 wins, vs spear5:0/20 (15 G-equivalent budget each).
- bombbug8 vs rider3:20/20 wins (24 each); bombbug7 vs drake3:0/20 (21 each; cannot hit air).
- frostmage7 vs golem3:20/20 (budgets28 vs27); frostmage3 vs archer4:0/20 (12 each).
- stormmage3 vs goblin8:20/20 (15 vs16); stormmage3 vs archer5:0/20 (15 each).
- burrower3 vs archer5:20/20, vs sword5:0/20 (15 each).
- slime3 vs cannon2:20/20, vs sword4:0/20 (12 each).

Pure equal-count bombbug vs low-HP melee/ranged often ends in simultaneous-destruction draw. Prefer mixed-composition introduction; this is not a reason to reroll a simulated outcome. Do not generate trivial all-ground versus all-air matchups as normal challenges. Frost and chain are ranged support, not universally superior archers.

Earlier `counter-probes*.json` / `burrow-probes.json` are development measurements; **use `final-balance-probes.json` for final stats evidence**.
