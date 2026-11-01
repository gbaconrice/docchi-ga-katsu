# v10 horizontal-axis physics audit

Intentional presentation/world-axis change: side0 starts left and advances +x; side1 starts right and advances −x. The field remains480×538. Unit stats, costs, damage, cooldowns, layer masks and entity caps were not changed.

## Source changes
- Forward direction derives from side, including units exactly at the center.
- Deterministic spawn spiral mirrors its x component, not y.
- Burrow targets the rearmost x coordinate, chooses nearby y among equal-depth targets, warns at the x-offset destination, and emerges once.
- Coincident body / movement / charge fallback normals use forward rather than fixed+1.
- X quantization keeps4096 precision but uses an odd tie rule about field center240. Absolute Math.round caused a one-quantum reflected-position difference when overlapping burrowers emerged in the32/team stress case. The symmetric rule and sub3e−11px tie tolerance remove it.

## Verified
`node v10-horizontal-physics-audit.cjs` passed7 suites:
- Left/right advance and centered fallback directions.
- Coincident body and charge x symmetry.
- Burrow rear targeting and warning-to-underground snapshot atomicity.
- Next-tick summon/split positions, pending children and parent death.
-40 mixed17-role seeds under x reflection, reversed lists, alternate prediction choices, buffered/no-hook/callback events; all physical outcomes and primitive event coordinates agree.
-32 initial units per team full battle: reflected final state matches; active+queued ≤32/team, records ≤128/team, all bodies within bounds.

The40-seed run observed all14 core event types. Exact source hash is retained in `v10-horizontal-physics-results.json`.

`expansion-tests/physics.js` is synchronized with `physics/physics.js`. Old vertical baseline goldens and the old vertical counter fixtures are historical data, not assertions that should remain numerically identical after changing the world axis. This audit does not claim unchanged vertical trajectories or mobile/browser performance.

No browser, renderer, SDK or publication was used in this work.
