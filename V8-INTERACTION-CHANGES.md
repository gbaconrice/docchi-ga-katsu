# v8 interaction changes

The reference game's observed interaction is stake selection, army tap immediately starts the battle, automatic result dismissal, and optional UNITS inspection. This version preserves the existing independent 20-round economy: 100 G start, free correct prediction +10 G, optional fixed 0/10/25/50 G stake bounded by balance, all players continue, no bailout and no percentage betting/bankruptcy ending.

- Army tap commits immediately. Hidden confirm hook is inert.
- Solo results stay for 3 visible seconds before the next uncommitted prediction. **3 seconds is a provisional mobile design, not a measured reference-game duration.** Result hold pauses this countdown; home/background reset the reading interval. Round 20 requires an explicit final action.
- Each next prediction resets side to none and stake to zero. No timed or implicit bet is made.
- Multi army taps submit only the local player's prediction; existing host authority, lock, replay and manual host next-round flow remain. This is not claimed to match the original's multiplayer behavior.
- Winner carry-over is deliberately unchanged: observed same-side/same-count continuation does not establish individual HP, corpses or summoned entity persistence. A future design must distinguish roster regeneration from entity continuation before implementation.
- Includes the preserved tick-start target-layer/body snapshot bugfix; no stat/cost changes.

Verification: full emitted inline HTML run in VM with actual DOM IDs and registered handlers, 20-round completion, duplicate tap, stake, hold/home interruption and final stop. No browser rendering performed by integration agent; no real SDK actions or score messages.

## Additional presentation behavior
- UNITS pauses solo only if it was running; closing restores the original pause state. In multiplayer, simulation/replay timing remains authoritative and is not paused by a local overlay.
- Comparison and UNITS show counts, total current/max HP, damage and cooldown seconds, plus existing short role notes (not long species prose).
- Zoom is a read-only canvas camera at 1/1.25/1.5/2x following the current living-unit centroid; it never changes world positions. Speed controls remain the existing 1x/2x; multiplayer speed changes remain disabled.
- `flow-interaction-test.cjs` replaces old confirmation/manual-next UI assumptions for v8. Older UI scripts asserting a required confirm or stopping indefinitely at round-one result are obsolete expectations, not evidence of current flow regressions.
- Existing local two-client and delayed/skewed-clock replay UI tests pass (1,222 same-scene comparisons; simulated 3.2s transfer delay and 7s clock skew).

New shell/CSS and new control bindings are integrated. Full inline 20-round flow, no-TextEncoder solo, local multi and delayed clock tests pass. Physics snapshot audit passes; 30 replay battles / 25,854 ticks match. Actual screen and mobile visual QA is planned after publication; it has not been completed at package preparation time.
