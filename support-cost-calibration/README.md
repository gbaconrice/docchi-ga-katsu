# Minimal cricket/toad cost calibration candidate

Selected changes only: screech_cricket cost3→2; spore_toad cost5→4. All HP/damage/speed/cooldown/ability amounts and physics source remain unchanged. Existing17 kinds, mantis and treant are unchanged. `monster-contract.json` contains the two selected cost edits; `baseline-contract.json` preserves the input. Integration must update its own cost table consistently; nothing here edits production.

## Method
Seven preregistered small candidate configs (`configs.json`) compared on training seeds1..5, then only the two cost-only candidates tested on disjoint heldout101..110. Each role uses one fixed intended mixed matchup and one fixed archer-heavy counter. Each seed runs ability ON, ability OFF, and same-cost existing-unit replacement. No runtime combat-outcome reroll or prediction-dependent selection.

Cricket: six swords +two crickets =22 budget; replacement is two goblins (2 each). Intended enemy11 goblins=22; counter six archers+two goblins=22.
Toad: four shields+two toads=24; replacement is two shields (4 each). Intended enemy12 goblins=24; counter eight archers=24.

Initial counter arithmetic for cricket had rounded22 to21; that probe bug was corrected to exact22 and **all training and selected heldout results were rerun**. Current JSONs contain corrected evidence. Costs are checked equal between ON and replacement in the script.

## Heldout observations
| Role | Intended mean HP-margin advantage over replacement | Seeds improved | ON / replacement wins | Counter ON / replacement wins |
|---|---:|---:|---|---|
| cricket cost2 |+42.8|9/10|10/10 vs10/10|0/10 vs7/10|
| toad cost4 |+23.4|7/10|0/10 vs0/10|0/10 vs10/10|

The ability itself improved cricket allied surviving HP by25.1 on average in the intended matchup, and poison reduced enemy surviving HP by115.4 on average. This establishes causal activity and some targeted budget value without removing the archer counter. Toad did not reverse a loss into a win in the intended fixture; its useful-choice claim remains weaker and should not be advertised as broad balance. HP margin is final allied minus enemy surviving HP, only a descriptive proxy affected by roster HP and survivors.

More aggressive poison candidates (6/8 DPS with cost4) won their archer-counter training fixtures and were not selected. Cost-only changes are the smallest tested modifications preserving intended weakness. These are small targeted tests, not global balance, holdout matchups, device performance or publication approval. Art/SDK/UI untouched.
