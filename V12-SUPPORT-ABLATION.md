> Historical cost3/5 evidence, retained as the reason for correction. Current cost2/4 follow-up: [cost-only train/heldout report](support-cost-calibration/README.md). Do not treat the old replacement-budget conclusions as current cost2/4 results.

# Support ability causality and same-cost replacement probes

Complete: six representative mixed-team fixtures ×10 deterministic priority seeds × three treatments =180 battles. Physics hash remains e84f6d573f5f3571f2a2e1846b84d90e673e7766ded884a287be31186f78ad37. No production changes.

Treatments: normal ability ON; only its ability field set to0 in an isolated test engine; normal ability unit replaced with an existing same-cost roster. ON/OFF share every initial position, HP, priority and cost. Replacements preserve the ally army and replace support slots locally; extra bodies are spaced20px, so this is a roster-value comparison, not a perfectly identical geometry experiment.

- Cricket cost3 → sword cost3. Ally army: six swords +two crickets, total24. Target fast-melee enemy:12 goblins, cost24; counter:8 archers, cost24.
- Toad cost5 → sword3 +goblin2. Ally: four shields +two toads, total26. Enemy:13 goblins, cost26; counter:8 archers +one goblin, cost26.
- Treant cost9 → three swords3. Ally: six archers +two trees, total36. Enemy:12 archers, cost36; counter:12 swords, cost36.

| Fixture | ON / OFF / replacement wins (of10) | Mean ON-minus-OFF allied HP | Mean ON-minus-OFF enemy HP | Mean ON-minus-replacement HP margin |
|---|---|---:|---:|---:|
| Cricket vs fast goblins |10 /10 /10|+18.5|0|−68.2|
| Cricket vs archers |0 /0 /10|0|+3|−179.8|
| Toad vs goblin swarm |0 /0 /0|0|−120.8|−166.9|
| Toad vs archer counter |0 /0 /7|0|−105|−297.91|
| Treant vs archers |0 /0 /0|0|−124.6|+9|
| Treant vs swords |0 /0 /10|0|0|−370.9|

HP margin means surviving allied HP minus surviving enemy HP at the end; different roster max-HP and survivor bias mean it is only a descriptive proxy, not a utility score. There were no draws. Ability application counts over10 seeds were cricket71/50, toad134/75, treant680/0 for intended/counter fixtures respectively.

## Interpretation
All three mechanics demonstrably affect combat; lack of pure-roster wins is not proof of no effect. However, at current provisional costs, cricket and toad did not justify replacing existing units in these intended representative fixtures. Their adoption value remains unproven: hold them back or calibrate **new units only** in a separate candidate before claiming they offer useful choices. Treant showed the expected ranged-only causality and a small same-cost advantage in final HP margin, while correctly offering no ability value against melee. That small margin does not establish broad balance.

These are small, deliberately targeted tests, not outcome-selected formations or a global metagame calibration. Existing17 unit stats, predictions, economy and generator were not changed. Results are in `support-ablation-results.json`; test code is `support-ablation-probe.cjs`.
