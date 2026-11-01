# v14 — three additional roles (24 selectable / 25 internal)

Separate candidate based on v13 personal-result and hero FX. Existing 21 combat stats and current 10-round economy/carry unchanged. No extensions/reinforcement/64-active cap adopted here.

- 銛兵 / sky_harpooner: cost5, HP95, 10 ground damage or 24 against air, 1.6 s, speed24, radius11, reach145. Selects targetable air first, then stable nearest priority. No pulling.
- 猟犬 / bounty_hound: cost4, HP110, damage18 / .9 s, speed40, radius11, reach5. Prioritizes actual ownerToken children from summoning/splitting. No money bounty, no bonus economy.
- 砲蟹 / siege_crab: cost9, HP300, damage55 / 3 s, speed12, radius28, reach150, projectile armor .7. Ground-only single projectile, explicitly no splash.

Unlock stages7/9/13 correspond to rounds4/5/7; no post-outcome rerolls. All24 appeared in600 generation samples, appropriate2/3-type right-side counts, budgets, full fresh carry, body bounds and pairwise initial non-overlap pass. Ten10-round sessions plus opposite-choice replay have the same simulated results and no11th round.

The original new art has 9 poses each. Harpoon80x80, hound96x72 and crab160x144 are native non-square cells where applicable; no sprite rotation/forced rescale. Only armies containing radius28 use56px giant slots (previous giant27 preserves54px), allowing32crabs/team without body overlap. Fixed full-art camera fit is chosen at setup only; no auto-follow. Crab stress fit .8219178, arena area67.55% of unpadded view. Both original treant and crab all-boundary art/HP, zoom reset and manual camera tests pass. Real mobile readability remains unverified.

Replay version `v14-three-species-v1`: appended three roles, same bounded dynamic roster/32active per army/256records overall/2MiB transfer protections. Guests do not simulate target priorities or damage.

Independent core tests: old21 full state/tick/winner equality across20 fixtures; new mixed20 mirror/list/choice/event/no-hook/throw-callback equivalence. Same-budget180 probes show intended counters: harpoon wins drake5/5 but loses many ground matchups; hound beats wraith3/5 and slime5/5; crab loses to shield/rider/drake/slime, but wins8 other tested matchups5/5, so its broad strength is still a calibration limitation. Harpoon vs treant4/5 draws; mixed64initial stress can reach60 s draw. These are limited fixtures, not a claim of globally balanced24 roles.

Real screen/native SDK/audio and new-art gameplay inspection are pending. Material-only art approval is not game visual QA. Existing known right-side tendency remains; future reinforced-left and50-unit design is a separate branch.

Actual64initial replay including all three newcomers plus drake/wraith/slime/bomb:114created/50children, active32/team,3136ticks,259771bytes/44chunks,4.4s paced mock transfer. Full guest restoration, admission rollback and confirmed-loss preservation pass. Network throughput is not a native SDK measurement.
