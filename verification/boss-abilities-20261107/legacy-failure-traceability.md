# Historical regression traceability

Source SHA256: `649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7`.

**Canonical:149/173 passed;24 failed. Original test files preserved.** Each failure below links to passing current-contract tests and states any remaining coverage limit.

Test paths use the reconstructed working tree: `tests/` is supplied by `tools/boss-abilities/tests/`. The copied machine reports are in this verification directory. Original test files remain in `tools/review-fixes/input-suite/tests/`.

## Results

### 1. ability-integration-cross.cjs
Original assertion: line34: assert(r.scale>1)

Six unchanged integration cases retained. Replaced obsolete one-tick rhino hit/3x with production direct-hit exposure once; periodic/secondary exclusions tested.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — retained ability-integration-cross (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — new boss direct damage receives exposure exactly once, DoT is not amplified (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 2. attack-role-damage.cjs
Original assertion: line19 inside evaluated harness: attackValue equals first resolved hit; later fixed72/96 and30/84 checks

Wolf7/projectile, three exact repair reflection/heal roles, no type mutation retained. Shockplate decay/armor and gauntlet throw collateral replace old72/96 and30/84 combos. Boss numeric label now reference power.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — ordinary wolf and three repair roles retain real hit/heal/display semantics (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — shockplate chain hops with falloff and armor reduces damage (reports/public-final-649a36/reports/fidelity-mechanics.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — gauntlet throw changes position and damages landing cluster (reports/public-final-649a36/reports/fidelity-mechanics.json).
- PASS: `tests/legacy-equivalents.test.cjs` — all600 cards retain numerical columns, compact copy, roles and no type mutation (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 3. boss-display-values.cjs
Original assertion: first remaining failure: poison.f.traits.includes(毒12/秒・3秒)

300 cloned comparisons safe; source-only damage scaling for synthetic explosion/charge, unscaled healing; ordinary peer groups/highlights; new poison fog and thorn root/damage replace old poison12/s/counter15.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — 300 safe facts,49 compact cards, explicit role/reference power and retained airborne markers (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — synthetic explosion charge and healing retain damage-only scaling (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — comparison legibility retains ordinary mechanics, highlights, CSS contrast and narrow widths (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — poison fog expands into previously unhit ground target (reports/public-final-649a36/reports/fidelity-mechanics.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — thornback pins and damages enemies all around (reports/public-final-649a36/reports/fidelity-mechanics.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 4. capacity-disclosure-reimplemented.cjs
Original assertion: line31: sha(run(expression)) === fixture.hashes[expression], first JSON.stringify(TYPES)

All7 original substantive groups run beyond obsolete TYPES/combatStep hashes:300 scores,72 pinned choices,160 generated cases,32 reservation cap, carry immutability, live64/created512 constants, model and price hashes.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — capacity/model regression: preserved hashes,300 scores,72 generation fixtures and reservation boundaries (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — all301 type records change only approved ability metadata and retired legacy passives (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — all costs, base HP/radius/layers, roster, names, assets and model remain exact baseline (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 5. comparison-air-priority.cjs
Original assertion: line19 rollback: assert(original.includes(e.after), e.name), explicit action-tone mapping

Only installer anchor updated in memory. All300 fact comparisons and8 actual side/air/fallback priority cases pass.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — retained comparison-air-priority (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 6. comparison-attack-stats.cjs
Original assertion: golem source-scaled first-hit damage: actual67.5, expected50

Explicit attackable booleans and reference-power labels replace obsolete source-damage formula on49; ordinary numerical stats, support roles, peer emphasis and600 two-column cards pass.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — 300 safe facts,49 compact cards, explicit role/reference power and retained airborne markers (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — all600 cards retain numerical columns, compact copy, roles and no type mutation (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — ordinary wolf and three repair roles retain real hit/heal/display semantics (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — comparison legibility retains ordinary mechanics, highlights, CSS contrast and narrow widths (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 7. comparison-legibility.cjs
Original assertion: line8: if(t.twoHitTicks/highSecondTicks) f.value === 2連撃

All ordinary combo/micro-timing, peer groups, multiple highlights, support emphasis, contrast>=4.5 and280–430px arithmetic retained;49 new ability names replace old two-hit strings. No browser pixel claim.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — comparison legibility retains ordinary mechanics, highlights, CSS contrast and narrow widths (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — all600 cards retain numerical columns, compact copy, roles and no type mutation (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 8. comparison-short-features.cjs
Original assertion: silverarm_vanguard detailed parameter leaked: 倍返しの銀腕

All49 new feature sets <=18 characters and unique, full descriptions retained, flying markers preserved; all600 rendered traits <=18. Old fixed ability strings replaced; 倍 in the named ability is not a numeric parameter.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — 300 safe facts,49 compact cards, explicit role/reference power and retained airborne markers (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — all600 cards retain numerical columns, compact copy, roles and no type mutation (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — comparison legibility retains ordinary mechanics, highlights, CSS contrast and narrow widths (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 9. current-manifest.cjs
Original assertion: line7: actual === c.candidateIndexSHA256

Final package index hash, release-manifest hash,5 transformed script hashes, source SHA and content revision checked. Old copied candidate metadata is not used as final provenance.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — current packaged manifest and release scripts match final source provenance (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/current-contract.test.cjs` — source fingerprint and incompatible-client rejection (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 10. guard-corner-final.cjs
Original assertion: line10: counts.guard_contact+counts.pillar_release>0

Wizard retains4 original corner winner/death/event assertions; two changed bosses retain8 original corner victory/HP invariants with real resolved-hit events replacing removed guard/pillar event names.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — unchanged spectralhand_wizard guard-corner-final (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current boss guard-corner-final geometry, damage and mirrored contacts (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 11. guard-crowd-drift.cjs
Original assertion: line10: counts.guard_contact+counts.pillar_release>0 and mirrored counts

All18 original crowd geometries retained, with exact mirrored contact counts. Zero/eight ally fixtures require damage; changed boss event categories updated.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — unchanged spectralhand_wizard guard-crowd-drift (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current boss guard-crowd-drift geometry, damage and mirrored contacts (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: The original two-ally fixture explicitly did not assert target damage. The equivalent preserves that limitation; it tests mirrored event counts but does not claim two-ally reachability.

### 12. guard-description-actual.cjs
Original assertion: line9: 30-tick guard warning, dmg*.10, 3-second cooldown and old pillar-priority prose

Wizard exact30tick warning,7 damage,3sec cooldown and prose preserved. New column first contact75/74.75/stun; uppercut49/55.68,landing91/24.36/airborne; descriptions match actual current ability definitions.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — unchanged spectralhand_wizard guard-description-actual (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current pillar and uppercut description matches independent timing/damage/status expectations (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — light pillars progress forward and do not double-hit (reports/public-final-649a36/reports/fidelity-mechanics.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — uppercut disables target then landing damages neighbours (reports/public-final-649a36/reports/fidelity-mechanics.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 13. guard-priority-drift.cjs
Original assertion: line9: guardAction injected, no guard contact, pillar_action_start targets far

Wizard still cancels contact guard in favor of newly available pillar target. New bosses retain acquired cast target and cannot hit before due tick or duplicate first contact; source-death windups cancel. Removed guard-to-pillar arbitration is not imposed on new mechanics.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — unchanged spectralhand_wizard guard-priority-drift (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current boss target arrival during windup does not bypass cast or duplicate first contact (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/integrated-bosses.cjs` — all49 windups cancel after source death (reports/public-final-649a36/reports/integration-combat.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 14. integrated-revision.cjs
Original assertion: line7: SHA256(docchi-integrated-candidate-v1\0 + normalized source) equals CONTENT_REVISION

New versioned normalized-source fingerprint, package source/release hashes and rejection of prior-revision peers replace obsolete prefix/provenance constants.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — source fingerprint and incompatible-client rejection (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current packaged manifest and release scripts match final source provenance (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 15. large-body-presentation.cjs
Original assertion: line9: all301 TYPES unchanged except approved44 names

Exact47 sprite draw/crop/scale/HP/tap cases,184 corner camera bounds, unchanged asset/large-body metadata and ordinary combat preserved. New boss combat cannot equal obsolete baseline;49 production/replay scenarios substitute.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — all301 type records change only approved ability metadata and retired legacy passives (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — all costs, base HP/radius/layers, roster, names, assets and model remain exact baseline (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — 47 baseline sprite crops/scales, HP anchors and tap selection preserved (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — all184 boss corner camera bounds retain complete sprite framing (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/integrated-bosses.cjs` — ordinary sword/shield/archer/healer combat numerically matches baseline (reports/public-final-649a36/reports/integration-combat.json).
- PASS: `tests/integrated-bosses.cjs` — all49 actual production effects and flags roundtrip replay codec (reports/public-final-649a36/reports/integration-combat.json).

Remaining limits: The historical four random mixed-roster seeds are not asserted byte-equal to old combat because they can contain intentionally changed bosses. Exact ordinary-team equivalence and49 new production scenarios cover the intended separation.

### 16. melee-combo-transition.cjs
Original assertion: line8 final loop: started via comboActionToken, no hit before that token, move/death/knock cancellation

New independent-head damage and burn replace comboActionToken. Target death, moved-out-of-range target, caster displacement and both horizontal directions tested. Source death covered for all49.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — current skullflare target death cancels windup without damage to corpse (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/legacy-equivalents.test.cjs` — current skullflare target movement and caster displacement revalidate contact range in both directions (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/fidelity-mechanics.test.cjs` — skullflare selects three different enemies and burn ticks (reports/public-final-649a36/reports/fidelity-mechanics.json).
- PASS: `tests/integrated-bosses.cjs` — all49 windups cancel after source death (reports/public-final-649a36/reports/integration-combat.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 17. names-katakana.cjs
Original assertion: line1: assert.equal(x.bossDamageScale,3,x.id), first golem

Every type/name/ID compared to preserved baseline; only explicit49 metadata/passive changes allowed. All prices, HP enlargement, armor/layers/roster unchanged; 3x is deliberately replaced1x.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — all301 type records change only approved ability metadata and retired legacy passives (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — all costs, base HP/radius/layers, roster, names, assets and model remain exact baseline (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — exact approved49 registration and bounded descendant exception (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 18. new-ability-boundaries.cjs
Original assertion: line35: /validFlags[^\n]*<=65535/.test(html)

All53 original behavioral groups run; only obsolete global65535 regex updated to extended current-version ceiling plus legacy gate check. Prior engines reject high boss flags/effects.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — retained new-ability-boundaries (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — real replay validator accepts prior plain frames and rejects boss extensions under older versions (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 19. new-ability-preservation.cjs
Original assertion: line17 all301 TYPES equality; line20 boss values unchanged

Exact301 records use explicit49 change allowlist, ordinary252 unchanged. Costs, original46 boss membership, growth catalog and previous recovered revival/death-burst/exposure/wraith semantics preserved.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — all301 type records change only approved ability metadata and retired legacy passives (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — all costs, base HP/radius/layers, roster, names, assets and model remain exact baseline (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — retained new-ability-boundaries (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — retained ability-integration-cross (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 20. readability-preservation.cjs
Original assertion: line6: exact equality of BATTLE_LOG_CATALOG keys; No event category removed or added

All107 previous catalog entries, source/target bindings, recorded payload bytes, readable phase endings and visible count rules retained; boss_ability is the sole intentional extra category.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — retained readability-preservation (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 21. root-summon.cjs
Original assertion: line8: unconditional lich skeleton by tick130, summonMoveFactor1.8, timed expiry

Natural corpse replaces free batch fixture. Actual scorpion root in shallow ford, owner death,1x modifier and720tick expiry pass; exact no voluntary motion and replay lifecycle checked separately.

Replacement evidence:
- PASS: `tests/legacy-equivalents.test.cjs` — corpse-triggered lich child is rooted by actual scorpion and expires in shallow ford after owner death (reports/public-final-649a36/reports/legacy-equivalents.json).
- PASS: `tests/current-contract.test.cjs` — real lich corpse spawn: HP65, bounded3, unique identity, root, expiry after parent death, replay seek (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 22. semantic-tone-cascade.cjs
Original assertion: line39: baseline.split(e.after).length-1 ===1, explicit action-tone mapping installed once

Only neutral boss_ability installer anchor changes. Full color cascade/contrast, rollback/reapply/idempotence, unsafe-anchor rejection, unrelated catalog preservation and unchanged combat checks pass.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — retained semantic-tone-cascade (reports/public-final-649a36/reports/current-contract.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 23. summoner-capacity-suite.cjs
Original assertion: suite line1: cap63 count1, dead-late active/expired6

Eligible corpse fixtures test live63=>one/live64=>none, pending counts, max3 live/max6 lifetime, deduplicated physical tokens, invalid corpse exclusions, blocked-placement preservation of lifetime budget, owner death before corpse, and survival/expiry after owner death.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — lich maximum3 and living cap64 versus63 with eligible enemy corpse (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — lich reserves at most3 concurrent across repeated ticks and stops after6 lifetime corpses (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — lich concurrent cap deduplicates same token present in live and pending lists (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — lich requires new natural nearby corpse, rejects stale/friendly/owned/far bodies (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — real lich corpse spawn: HP65, bounded3, unique identity, root, expiry after parent death, replay seek (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/legacy-equivalents.test.cjs` — lich blocked placement spends no lifetime count and dead owner cannot convert later corpse (reports/public-final-649a36/reports/legacy-equivalents.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

### 24. summoner-intrinsic-replay.cjs
Original assertion: line8: tick130 has6 ashbone_swordsman, expired by721, fresh playback equality

Actual corpse-driven skeleton birth/720tick expiry and sequential-versus-fresh seek equality replace empty-free-batch tick130/721 expectation. Boss effects/status roundtrip across49 scenarios and prior schema gates pass.

Replacement evidence:
- PASS: `tests/current-contract.test.cjs` — real lich corpse spawn: HP65, bounded3, unique identity, root, expiry after parent death, replay seek (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/current-contract.test.cjs` — real replay validator accepts prior plain frames and rejects boss extensions under older versions (reports/public-final-649a36/reports/current-contract.json).
- PASS: `tests/integrated-bosses.cjs` — all49 actual production effects and flags roundtrip replay codec (reports/public-final-649a36/reports/integration-combat.json).

Remaining limits: No additional later assertion gap identified beyond the intentionally replaced behavior and general VM limitations.

## Scope

- Supplementary tests do not turn the preserved canonical149/173 into173/173.
- The recorded results apply to the stated source SHA.
- Browser pixels and real-network behavior are not established by these VM tests.

## Fresh public reproduction

All five stages completed successfully on the stated source:187/187 Node runner entries,66/66 production integration checks,32 entry-loader cases and7 release-loader cases. Separate nested reports include34 status interoperability checks and2 round-lifecycle checks. Nested counts are not added to the Node runner total. Evidence: reports/public-final-649a36/composite-validation.json.
