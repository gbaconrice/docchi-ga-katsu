# Formation centering and extension bankruptcy correction

Separate minimal patch on published v15. No new UI theme/art/species is included.

## Initial formation
The shelf packer previously returned y=10-aligned rows. After packing, the full army is translated vertically so its sprite/HP occupied bounds center on world y269, clamped to existing physical y10..528. Relative spacing, x positions, roster, costs, fit admission, estimator decisions and RNG/cooldown/priority/token values are unchanged. Both sides follow the same rule. Initial positions intentionally change, therefore old battle winners are not claimed identical.

Visual extents are from v15 artwork, not the upcoming licensed replacement art. Existing camera padding remains. Dense armies may reach the physical clamp before exact visual centering. In desktop field view, existing units/sound/reaction controls move to the outside-field right rail; the field is not shrunk. Reaction popup is right-aligned to avoid viewport overflow and is still a temporary overlay. Mobile layout is unchanged. Static geometry is not rendered/device QA.

Evidence:1000 generated plans,40 estimator/typed plans,2241 fit cases; exact non-position values, rigid translation,64-unit nonoverlap, old rejected large cases unchanged. Actual-inline generator/module100case agreement and preview world/draft/wallet immutability pass.

## Extension bankruptcy
First10 reward/recovery unchanged. At round10 balance0, extension is unavailable. At settlement in rounds11+, balance0 is terminal, even mid-way through a chosen +5/+10. No auto-next or additional extension. The scheduled maxRounds is not rewritten to fabricate completion. Positive balance with negative profit can continue.

Finish reports only the actual signed personal score once; a new run alone restores100G. Invalid negative balance is defensively blocked, not clamped/refunded. Standard stake<=balance and ledger safety prevent legitimate negative balances. Multiplayer remains quick10 and is unchanged.

Tests cover zero at10,11,12,13,14; no auto-next; Finish/new100G session; positive25G/net−75G continuation; score once; quick10 unchanged. Native score submission is mocked only. No paid GRAVITY action, sound/device rendering or real native SDK verification was performed.

Centering can materially change outcomes: the fixed50goblin/12golem replay fixture changed from2982ticks/B winner to1618ticks/A winner (143600bytes). This is not a solver/stat change; both formations now face around the same vertical center rather than retaining unequal top-aligned occupied bands. Historical heldout balance percentages in growth validation describe the previous placement baseline and are not a post-centering guarantee. No runtime outcome search or wager-conditioned generation is introduced.
