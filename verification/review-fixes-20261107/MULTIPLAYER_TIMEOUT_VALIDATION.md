# Multiplayer timeout and same-room rematch validation

Baseline: verified Space v18 restoration source a6a179d7d9212b3c6269f86556593cc79c53081e32ac6f6f4280b921e0a804a8.

## Implemented

- Fixed host-authoritative 30-second choice deadline at every result from round 10 onward. Reconnect and client clock offsets do not reset it. Late continuation loses to the deadline.
- Undecided participants lock their current gold as decision-timeout cashouts. Existing continuers proceed; stopped participants spectate with frozen balances. No active participants returns everyone to the connected room lobby.
- Each client posts only its own canonical timeout score. Duplicate/unknown-acceptance attempts do not auto-repeat. Explicit retries retain separate inputs across multiple games.
- The host can start another game in the same native room. Fresh session identity isolates old wallet, score dedup, matchup history, messages, reactions, replay, and carry-over state. A bounded offer/confirmation handshake admits prior room members before the new start control enables. Heartbeats resend lost offers.
- The handshake carries the final validated receipt before replacing the old session. Same-host host-timeout recovery is allowed; unrelated stop reasons remain blocked. Pending manual cashout is observed before UI reset. Delayed send failure from an old session cannot stop its replacement.

## New tests

- multiplayer-decision-timeout.cjs: 12 protocol/score scenarios.
- multiplayer-decision-timeout-ui.cjs: 6 UI callback scenarios.
- multiplayer-rematch-sdk.cjs: 7 SDK-mock scenario groups, including missed offer/receipt, host timeout, delayed send failure, stale/forged messages, new discovery, repeated games, and distinct score dedup.
- multiplayer-rematch-ui.cjs: 5 UI scenario groups, including fresh round 1, reset winner/history/carry state, previous-game failed-score retry, participant confirmation guard, and pending manual-cashout recovery.

The existing multi-countdown-regression, multi-status-ui, and result-multi-wait assertions were narrowly updated from unlimited extension waiting to the approved timeout. Existing host-cashout 14/14, reconnect, timer, bankruptcy, score preflight/retry/storage, reaction protocol, and native-layout contract suites passed. The integration worker must run the complete combined suite and regenerate the content revision.

## Verification boundary

These are deterministic protocol, SDK-mock, and full-script DOM-stub tests, not physical-device or live SDK/network evidence. The ranking bridge remains {type: gameOver, score} and provides no acceptance receipt. Zero gold and values above JavaScript's safe integer range retain their existing no-send safeguards. No host election was added. Native room operations are not invoked during rematch, only its existing message channel. No remote files were published by this worker.

Final isolated source SHA256: bd9c724f098694dd666903e44067f9ccb088d3e5cd560838c90e49d78abfd277
