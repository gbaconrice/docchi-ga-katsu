# Next-three combat candidate — independent / not integrated

Only this candidate folder was changed. Base is frozen v12 four-species physics; existing21selectable types and wallet are not modified. Art IDs/radii follow gravity_next_three_nine_candidate. No public/SDK/native calls or rendering. Stats below are provisional, supported by small controlled probes rather than global calibration.

| ID | cost | HP | damage / cooldown | speed | radius / surface reach | mechanic |
|---|---:|---:|---|---:|---|---|
| sky_harpooner |5|95|10ground,24air /1.6s|24|11 /145|Targetable air first, single projectile; no pull|
| bounty_hound |4|110|18 /.9s|40|11 /5|Owned summon/split child first, single bite; no currency bounty|
| siege_crab |9|300|55 /3s|12|28 /150|Ground-only single projectile, armor factor.7; no splash|

No new spawning, statuses or RNG. Preferred targets are first selected from the existing targetable enemies; if preferred set is nonempty, choose its smallest surface gap then existing stableOrder. Thus a farther air/child can supersede nearer ordinary enemy, even outside immediate range. Hound child means nonempty ownerToken, not appearance, kind name or a live parent lookup; source death cannot remove child classification. Hound cannot attack flying/underground targets. Sky's2.4× bonus is frozen at launch against tick-start target layer, no retargeting/pulling. Crab cannot hit air and does not inherit cannon AoE merely because its art is a cannon.

## Integration contract

`physics.js` is a replacement candidate; append `next-three-contract.json.types` to TYPES/COST using the normal build path. RADII/REACH include all three; MAX_RADIUS becomes28 so grid neighbor search includes new body size. Existing TEAM_CAP32 remains. Initial admission is owned by generator/protocol, not added here; do not pass >32perteam to claim support. Existing finite spawn/record contract≤128created/team (256total) unchanged, because new units do not summon.

Existing projectile_release/resolved_hit remain. New primitive event:
`priority_strike {sourceToken,targetToken,k,priorityKind:'air'|'child',x,y,damage}`
This records an ACTUAL chosen preferred attack intent/release, not guaranteed final damage: damage is pre-armor/parry/ward. Emit only when an attack fires, not every movement/target scan; guest must never score/damage from this event. No new compulsory effect is required; use existing release/impact and source-specific sprite pose. Replay needs append-only3role extension/newengineversion; not edited here. Callback exceptions are swallowed by unchanged existing hook behavior.

## Headless tests

`node tests.cjs`:7suites PASS. Four targeted mechanics fixtures;20 old21species fixtures match baseline full state/ticks/winner exactly;20 mixed fixtures match xreflection, reversed list, opposite choice, nohook and throwing callback. All emitted events are primitive; event order/source/target match mirror after coordinate+side normalization. 32units/team mixed large-body battle stays within radius-aware arena bounds,64records,3600ticks draw; CPU whole battle~1.32s in this environment, not smartphone performance evidence.

`node probes.cjs`:180same-budget battles (3new×12opponents×5deterministic formation/priority seeds), equal static cost exactly; budgets vary12–72 (minimum LCM permits some10/15 cases), counts remain≤32. Five related fixtures are not population win rates. No simulation-selected roster at runtime.

Highlights from same-budget-results.json (candidate wins /5):
- Harpooner vsdrake5; vsordinary sword/shield/spear/archer/rider/goblin/golem/wraith/slime0. Vs cannon5. Vs tree0with4draws. Specialist intentionally weak on ground; eligibility/composition matters.
- Hound vswraith3 andslime5; loses to sword/spear/archer/rider/drake0. Wins shield/cannon/goblin/golem/tree5 in these fixtures. Do not call it a universal summon counter based on3/5.
- Crab wins sword/spear/archer/cannon/goblin/golem/wraith/tree5; loses shield/rider/drake/slime0. Its bulk is strong in these fixtures but clear counters remain; production generator calibration still required.

These counters are observed, not hardcoded outcome rules. No economy/generator changes. Symmetry stress draw and harpooner-tree draws remain visible limitations; no arbitrary balance mutation was made to remove them. Adoption owner must run complete battle/replay/selection UI/carry/late-join tests after integration. Keep old v12 immutable.
