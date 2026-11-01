# v12: 4 additional species candidate

21 selectable species, 22 internal including split-only slimelet. No base economy/10-round/actual-winner-left carry change. The next large-army/reinforcement/extension design is not implemented here.

## New roles
- Cricket: a hit delays the next attack by0.35s;3.5s reapplication immunity, no canceled already-resolved attacks. Cost2 after limited cost-only calibration.
- Mantis: one direct melee hit is reduced70%; projectile/explosion/poison do not consume it.
- Toad: a real attack emits a radius42 application puff. Ground targets take six2-damage half-second poison pulses over3s; no refresh/stack,1s post-expiry immunity. Source death does not cancel it. Cost4 after limited cost-only calibration.
- Treant: snapshot80px proximity grants25% projectile reduction, one strongest provider, no stacking. Not complete projectile blocking and not protection from poison/explosion/chain.

Unlocks are rounds4/4/5/6 respectively. The established right-side2-species at4 and3-species at7 remain. Existing17 combat stats are unchanged. New roles are not claimed globally balanced. Mixed-role cost-only heldout probes support cricket's fast-melee role and toad's swarm HP benefit; toad did not reverse the loss in that particular fixture. Both lose to ranged counters. See support-cost-calibration.

## Art/camera
Nine native poses per new species. Golem, drake and rider receive the separately reviewed visual-only pose polish; frame timing/palette/physics remain. Non-square atlas cells are supported by the renderer for future assets, but no next-three species are included.

Treant battles get a fixed initial whole-scene fit including sprite/HP overhang: scale0.805389, physical-arena area64.865% of the ordinary fit (35.135% reduction). Every unit retains relative size. The camera never follows survivors or changes fit mid-battle; manual zoom/pan/reset remain. Low-contrast moss background fills padding, no black blank.1–32 treant artificial formations and all body-boundary/pose-extents were checked mathematically. Real phone readability has not been visually verified.

## Replay / verification
New version v12-four-species-statusfx-v1,22roles/16FX,12-column row retained. Exact authoritative HP/status/event ticks; guests do not simulate poison or defenses. Poison pulses deliberately do not create impact sparks/sounds. Actual mixed64-initial stress produced109 entities/45children,2784ticks,271350B/46chunks (4.6s paced mock, not SDK throughput). Synthetic full60s256-created stress:1021776B/171chunks, below2MiB. Slow guests catch up to the shared host clock; failed viewing cannot cancel confirmed money.

Independent current generator checks:600 fixtures/all21 types/large bounds,100 rounds plus opposite-choice replay100, fresh ability reset on carry, ten-round completion. Left37/right63 in that seed set; right-side bias remains a known issue. Separate heldout60 showed left20/right40 and a constant-side BET10 strategy strongly favoring right. A future reinforced-left/dense-army generator is being studied; no runtime outcome selection is used.

The final UI-only change after combat audits is the field-fit/safe-area preparation described below. Physics/ledger/generator were unchanged by it. Corrected preview DOM/back/state tests passed.

## Native viewport and QA limits
Desktop static formation preview now shares live battlefield fit via a presentation-only data-field-view attribute. Source phase remains choose and returning restores comparison.

CSS can accept measured host top/bottom overlay insets and an optional viewport height; default values are zero and safe-area values are combined with max, never added twice. No official host geometry API/value was established. No74/98px heuristic is inserted. This is preparation, NOT a verified native-header fix; standalone layout remains the default. VisualViewport keyboard script was not adopted.

No v12 browser/render/native SDK/audio audition was performed by this integration process. All executable tests are headless/mock. Public visual/native verification is still needed.
