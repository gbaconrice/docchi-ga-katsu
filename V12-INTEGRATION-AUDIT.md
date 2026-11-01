<!-- Updated after the cost2/4 + safe-slot final-inline rerun; exact hashes in result JSON. -->
# v12 independent final-inline integration audit

`node integration-audit.cjs` passed against the built `game-runtime` in index.html. It uses an inert DOM/canvas and blocks unexpected network/DOM creation. No production code was modified; index, physics and template SHA-256 remained identical before and after.

## Passed
- 600 deterministic generated formations over all10 rounds. All21 selectable kinds appeared. New unlock rounds4/4/5/6 were respected. Right composition remained1/2/3 kinds; costs matched actual rosters and stayed within planned budgets.
- Every initial body was in the480×538 field and had no same-layer overlap. Explicit treant carry counts1,8,9,16,24,32 covered the enlarged54px spacing branch.
- 10 complete sessions /100 battles used the real prediction/start/next handlers. Every battle was independently rerun with the opposite prediction choice; winner, ticks, HP, coordinates and relevant old/new combat status matched exactly.
- Actual winners' starting compositions carried as fresh units. Each completed battle was deliberately contaminated with poison/cadence/parry fields before advancing; none appeared in the next initial roster. Summoned children were not initial candidates.
- Free-prediction accounting remained100 initial G +10 per correct result. Round10 completed normally and next reset to a fresh round1/session, rather than generating round11.
- Result:37 left wins,63 right wins,0 draws; normal-session maximum active-plus-pending24/team. This observed maximum does not replace the separate physics32/team stress coverage.

## Descriptive counter probes, not calibration
Each new unit's pure roster faced sword and archer rosters with a nominal30-cost ceiling using current cost2/4 (floor counts, so treant spends27 and toad28 versus30). One deterministic fixture each:
- Mantis beat sword and lost to archer.
- Cricket, toad and treant lost to both sword and archer.
- All five new actual-event types were observed in these fixtures.

Thus these probes found no obvious new pure-roster constant winner, but do **not** establish the three support units' usefulness, equal-budget balance, mixed-team synergy or general counters. The cost-only mixed-team train/heldout follow-up is in [support-cost-calibration/README.md](support-cost-calibration/README.md); the broad roster remains incompletely calibrated. No stats were changed based on these outcomes.

`integration-audit-results.json` contains complete:true, all rows, frequencies, probe ticks/events and exact audited source hashes. Frequency counts cover600 generation samples +6 large-treant fixtures +100 session rounds, not just the100 simulated rounds. This audit does not claim real-browser visuals, compact replay wire verification, device performance or SDK operation.

## Release preflight regression closure
Publisher's legacy six-event test caught missing slow/burrow presentation bits. The host status adapter had preserved stale low bits instead of deriving them from mechanics. It now derives slow/burrow/charge every tick from slowUntil/burrowStage/chargeReady plus current movement; expired bits clear. Both solo and canonical recorder call the same reader. Six actual-event UI fixtures, new-four status/expiry/poison traces, all 22-role codec/schema and dynamic256 replay tests pass. Physics/PRNG/ledger unchanged. This is presentation-only and has not yet had visual QA.
