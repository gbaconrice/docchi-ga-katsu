# Integrated boss ability balance evidence

Frozen HTML SHA256: `649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7`

These are deterministic selected matchup outcomes, not calibrated win rates. Cohorts and mirrored cells are not independent. No arbitrary target win rate was used.

## Cohorts

- Controlled, all: 1616 wins / 502 losses / 90 draws (2208 cells). Mirror disagreements: 0/1104 pairs.
- Controlled, targetable ground: 1616 wins / 232 losses / 80 draws (1928 cells). Mirror disagreements: 0/964 pairs.
- Controlled, unreachable air: 0 wins / 270 losses / 10 draws (280 cells). Mirror disagreements: 0/140 pairs.
- Mixed boss + two swords: 154 wins / 32 losses / 10 draws (196 cells). Mirror disagreements: 0/98 pairs.

## Integrity and unchanged constraints

- Runtime errors: 0.
- Runtime catalog cost mismatches: 0.
- All 49 types retain original HP, prices, and attack-target masks.
- Controlled cost ratios range from 0.90 to 1.07143; mixed and support jobs have exact cost parity.
- Controlled and mixed baseline sources differ. Their results are never pooled.
- Draw breakdown and every timeout survivor/terrain record are in summary.json.

## Integration equivalence

- controlledVs46a92: 0 differences in 2208 paired cells (outcome, ticks, survivor counts/HP, terrain).
- mixedVs46a92: 0 differences in 196 paired cells (outcome, ticks, survivor counts/HP, terrain).
- cleaverVs46a92: 0 differences in 88 paired cells (outcome, ticks, survivor counts/HP, terrain).
- lichVs46a92: 0 differences in 80 paired cells (outcome, ticks, survivor counts/HP, terrain).

## Support role cohorts

- lichSupport / fresh_holdout_support / equal_cost_no_support: 8 wins / 0 losses / 0 draws (8 cells).
- lichSupport / fresh_holdout_support / lich: 2 wins / 6 losses / 0 draws (8 cells).
- lichSupport / heldout_support / equal_cost_no_support: 12 wins / 4 losses / 0 draws (16 cells).
- lichSupport / heldout_support / lich: 6 wins / 10 losses / 0 draws (16 cells).
- lichSupport / original_support / equal_cost_no_support: 10 wins / 6 losses / 0 draws (16 cells).
- lichSupport / original_support / lich: 4 wins / 12 losses / 0 draws (16 cells).
- cleaverSupport / fresh_holdout_support / cleaver: 6 wins / 2 losses / 0 draws (8 cells).
- cleaverSupport / fresh_holdout_support / equal_cost_no_support: 4 wins / 4 losses / 0 draws (8 cells).
- cleaverSupport / heldout_mixed / cleaver: 4 wins / 0 losses / 0 draws (4 cells).
- cleaverSupport / heldout_support / cleaver: 8 wins / 8 losses / 0 draws (16 cells).
- cleaverSupport / heldout_support / equal_cost_no_support: 6 wins / 10 losses / 0 draws (16 cells).
- cleaverSupport / original_mixed / cleaver: 4 wins / 0 losses / 0 draws (4 cells).
- cleaverSupport / original_support / cleaver: 10 wins / 6 losses / 0 draws (16 cells).
- cleaverSupport / original_support / equal_cost_no_support: 8 wins / 8 losses / 0 draws (16 cells).

## All 49 types

| Type | Ground controlled W/L/D | Mixed W/L/D |
|---|---:|---:|
| accretion_burstcore | 48/0/0 | 4/0/0 |
| basalt_titan | 24/0/20 | 0/0/4 |
| bluefist_colossus | 40/0/0 | 4/0/0 |
| bluehorn_invoker | 40/0/0 | 4/0/0 |
| bone_crown_lich | Not a giant-duel subject | 0/4/0 |
| bonefan_reaper | 44/0/0 | 4/0/0 |
| carapace_slashbeast | 36/0/0 | 4/0/0 |
| cinder_tailbeast | 44/0/0 | 4/0/0 |
| cleaver_brute | 32/12/0 | 4/0/0 |
| colossal_hornfist | 36/4/0 | 4/0/0 |
| cyanrise_silithar | 0/28/16 | 0/0/4 |
| darkfan_clawlord | 44/0/0 | 4/0/0 |
| domeback_colossus | Not a giant-duel subject | 0/4/0 |
| emberfist_pillarer | 44/0/0 | 4/0/0 |
| emberwing_drake | 42/2/0 | 4/0/0 |
| fiery_coil_inceptor | 28/0/20 | 2/0/2 |
| flameburst_mythron | 10/32/2 | 2/2/0 |
| flamering_magus | 40/0/0 | 4/0/0 |
| frostbreath_lizard | 44/0/0 | 4/0/0 |
| frosthorn_rhino | 40/0/0 | 4/0/0 |
| gauntlet_combo_guard | 40/0/0 | 4/0/0 |
| golem | 38/0/2 | 4/0/0 |
| iceclaw_legend | 36/4/0 | 4/0/0 |
| kilnback_pincerbeast | 34/10/0 | 4/0/0 |
| moonclaw_werewolf | 26/10/0 | 2/2/0 |
| pillar_hammerer | 44/0/0 | 4/0/0 |
| plated_dualdragon | 48/0/0 | 4/0/0 |
| razorclaw_reaver | 14/18/12 | 4/0/0 |
| redhorn_dualbeast | 10/34/0 | 2/2/0 |
| ringhold_guardian | Not a giant-duel subject | 0/4/0 |
| ringneck_prowler | 16/28/4 | 2/2/0 |
| roarfang_beast | 40/0/0 | 4/0/0 |
| rootwarden_treant | 40/0/0 | 4/0/0 |
| shockplate_drake | 36/0/0 | 2/2/0 |
| siege_crab | 44/0/0 | 4/0/0 |
| silverarm_vanguard | 30/14/0 | 2/2/0 |
| skullflare_triad | 44/0/0 | 4/0/0 |
| slime | 32/8/0 | 0/4/0 |
| spectral_scale_dragon | 38/2/0 | 4/0/0 |
| spikeburst_grinder | 44/0/0 | 4/0/0 |
| spore_toad | 32/0/0 | 4/0/0 |
| stonepulse_kolossus | 34/2/4 | 2/2/0 |
| stormhorn_tripler | 16/24/0 | 2/2/0 |
| thornback_beast | 40/0/0 | 4/0/0 |
| thunderhorn_beast | 36/0/0 | 4/0/0 |
| triad_chimera | 40/0/0 | 4/0/0 |
| veteran_flamewing | 44/0/0 | 4/0/0 |
| willyee_frost_dragon | 40/0/0 | 4/0/0 |
| willyee_stone_golem | 44/0/0 | 4/0/0 |

## Interpretation

- Cleaver restores its close-range weapon contribution and keeps an army buff. Its selected conservative constants preserve concrete ranged counters; support and fresh-seed results remain separate above.
- Lich has a bounded resurrection role: at most three live and six total natural-corpse conversions, with meaningful losses still present. Ordinary support types are not judged as giant solo attackers.
- Stationary cyanrise remains vulnerable to ranged kiting. Razorclaw performs better with an escort than in ranged-only duels.
- Basalt and fiery-coil death attacks can cause mutual annihilation; those draws are not automatically simulation failures.
- Strong area-attack giants retain clear advantages in selected ground formations. Broad effectiveness is not a proof of balanced pricing across the full roster.
- No publication action was performed by this worker.
