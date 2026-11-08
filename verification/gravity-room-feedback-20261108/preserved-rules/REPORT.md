# Final preserved-gameplay verification

Final candidate SHA-256:
`ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa`

Published comparison SHA-256:
`b080617884c5f67d44431dd922b77c44736d8dbe227ef3c26fbf937645b52727`

## Result

No new gameplay regression was found. All checks below were run again on the
final candidate. Production source and historical test originals were not
edited by this audit.

- All 17 historical focused suites ran: 11 passed unmodified. Six raw failures
  were retained and precisely classified as superseded assertions, then their
  applicable coverage was rerun using auditable test-only compatibility changes.
- Strict effect-art tests passed 10/10 against a comparable pre-effect baseline,
  including exact equality of 387 accessible non-render functions. The original
  broad equality assertion was not weakened.
- Strict zero-BET tests passed 9/9 against a comparable pre-zero-copy baseline,
  including 15 display cases, 10 G zero-win recovery, a 195 G peer receipt, and
  the round-ten bankruptcy boundary. Original assertions were not edited.
- Compatible participant tests passed 10 cases; event-log tests passed 4 checks
  covering 432 attribution cases; battle UI passed 11; retained home/audio
  passed 9. The removed CSS-light geometry test is explicitly not run.
- All 10 independent structural checks passed. Full wallet, type/cost/roster,
  generator/descendant-exclusion, replay, clock and damage-speed modules match
  the published source exactly. All 300 trait displays and underlying facts,
  827 top-level declarations, and 587 ordered original asset occurrences remain
  unchanged. The exact known GIF is the only added embedded asset.
- Five original production-physics suites ran on both sources: 173 checks,
  169 passing on each, with four identical pre-existing failures. Complete
  reports, including values, all 49 boss matrices and failure details, are equal
  after excluding only report timestamp and source hash.
- Seven complete canonical replays match except the intentionally changed
  diagnostic battleLog. Every other field, effect, pose, battle fact, geometry,
  presentation tail, decoded frame and reconnect frame is equal.

## Retained gameplay details

The tests verify 1x/2x/3x damage at tick boundaries 1200/2400, the exact 3600-tick
(60-second) cap, no double scaling of reflected/redirected damage, sync/async
replay equality and host/guest/reconnect clocks with a 20-second offset.

Draws refresh both armies and preserve carried-winner rules. Late-boss coverage
includes 400 cases over rounds 11, 12, 15, 16 and 20, legal distinct triples in
R11/R12, budgets and unchanged carried armies. Diversity tests include six
20-round runs, thirty fresh draws, a 32-kind carry, bounded exhausted-history
failure and actual summon/death-child/second-generation descendant separation.

Traps retain exact 45-tick arming, expiration, one-shot charges and no friendly
or airborne hits. Revival cannot restore spent trap charges. Traps and corpses
do not pull the camera. All 300 species on both sides preserve corpse position
and facing while death animations finish; genuine revival makes a separate
live identity that still moves and turns.

BossAbilities is byte-identical outside its diagnostic event helper and the
helper's explanatory comment. MultiProtocol is byte-identical outside the
authorized normal-result wait reduction from 30 to 8 seconds; post-ten
decisions remain 30 seconds. The final avatar-resource boot-error guard is
verified as an exact insertion only.

## Raw failures: precise disposition

| Suite | Disposition |
|---|---|
| Participant rail | Old offline/unavailable labels were intentionally replaced. The wrapper supplies new NativeProfiles/style/shell mock dependencies and exact new labels. Delayed bounded retries belong to the dedicated new profile suite. |
| Event log | The 108-type / 432-case count assertion passed. Only old completion visibility failed: cancellations are now hidden, while actual aegis completion is retained. |
| Zero BET | Old strict protocol equality encountered the authorized result-wait change. Applying new authorized changes to the old pre-zero baseline restores exact assertions. |
| Home/room | One known GIF was added; original assets and static image remain exact. The wrapper adapts the CSS-variable assertion and pending-entry cleanup. Only removed CSS-light geometry is not run. |
| Effect art | The old comparison baseline lacked the new authorized UI/log/profile/GIF changes. Applying those changes to the pre-effect baseline makes all original exact assertions pass. |
| Battle UI | Only the exact asset list failed raw; the other ten assertions passed. The wrapper verifies all originals plus exactly the known GIF. No CSS-fill failure was observed. |

Four additional historical physics failures remain failures, not waived passes.
All occur identically on the published source:

1. Old metadata fixture expects ゴブリン instead of the previously approved
   シャドウクローラー display name.
2. The treant/thornback/razor status fixture reads undefined
   bossControlLock.control.
3. The two-held-enemies fixture reads undefined .length.
4. The pincer fixture expects 1000 HP at its early sample; both sources produce
   859.6 HP.

The last three were not diagnosed as gameplay defects or dismissed as fixed.
They remain pre-existing test failures for separate investigation.

## Not rerun or not covered

- The 2600-round generation audit was transferred, not rerun. Complete generator
  code, model/catalog, types/costs, exclusions and inputs are unchanged. Its
  130 controlled 20-round runs cover all 300 species, with zero cross-team
  descendant collisions and zero exact repeated pairs. These counts are not
  measured real-match win-rate balance.
- The old isolated pre-diversity R1–10 equality assertion and pre-integration
  draw whole-source comparison are not run by the historical integrated mode.
  Current full-module equality against published b080 replaces that obsolete
  baseline comparison; behavioral tests still ran.
- The removed CSS-light geometry/lifecycle test is SUPERSEDED_NOT_RUN, not
  passed. The new real-GIF tests own the replacement behavior.
- This report does not claim live Gravity, device, network or browser proof.
  Those and the new UI-specific cases are reported separately by integration QA.

## Evidence and repeatable commands

The audit folder retains raw failures, compatible-test adaptations, exact hashes
and detailed results. The compact entry points are:

- `raw-final-suites/summary.json`
- `structures/structures.json`
- `physics/summary.json`
- `replays/replay-equivalence.json`
- `final-effect-art/effect-art.json`
- `final-zero-bet/zero-bet-text.json`

From the workspace root, rerun:

```sh
node gravity-room-feedback/tools/test-preserved-structures.cjs
node gravity-room-feedback/tools/test-preserved-replays.cjs
node gravity-room-feedback/tools/run-preserved-physics.cjs
python3 gravity-room-feedback/tools/build-preserved-rule-baselines.py
```

The longer README records the full historical commands and fixture requirements.
The original raw batch intentionally exits nonzero for superseded assertions.
The physics runner reports old/new equivalence without turning its four
pre-existing failures into passes.
