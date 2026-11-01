# Optional reaction lane (integration contract)

`reaction-channel.mjs` is a framework-free, ephemeral controller for four
quick reactions. Its stable IDs are `wow`, `cheer`, `frustrated`, `applause`;
each has a short Japanese text stamp and accessible label. The separate
`reaction-sdk-bridge.mjs` is a mock-verified adapter seam; both are wired through the candidate SDK adapter and optional UI. Real SDK delivery is unverified.

## UI contract

- Add only a small optional row of four buttons with container ID
  **`reaction-bar`**. Give each button `data-reaction="wow|cheer|frustrated|applause"`.
- Render the short-lived stamps into **`reaction-feedback`**, outside the
  prediction/bet controls and stats. Keep four visible max, then remove within
  2.6 seconds. No dialog, confirmation, or required extra step.
- Call `channel.setRound(roundId)` only while a battle is active; pass `null`
  when the battle is not active. On each click call `channel.react(id)` once;
  the return value is `false` during cooldown or if invalid.
- Rerender from `onChange` and/or `channel.getFeed()`; call `getFeed()` after
  the TTL so expired stamps disappear even if no new event arrives.

Example wiring (host UI owns the actual DOM):

```js
const channel = createReactionChannel({
  roomId, sessionId, userId,
  send: wire => sdk.room.sendMessage({message: wire}),
  getMembers: () => {
    const state = session?.getState();
    return state ? [...state.participants, ...state.spectators] : [];
  },
  onChange: renderReactionFeedback
});

// In the battle UI lifecycle:
channel.setRound(activeBattle ? state.roundId : null);
reactionBar.addEventListener('click', event => {
  const id = event.target.closest('[data-reaction]')?.dataset.reaction;
  if (id) channel.react(id);
});
```

## Network boundary

Outgoing messages are small independent `type: "reaction"` protocol-tagged
events with only `{roomId, sessionId, roundId, emoji, seq}`. They do not contain
player IDs, bets, results, scores, or wallet data. Do not include reactions in
snapshots, replay files, bets, settlement, analytics, or RNG input.

Only route `receive(sender, wire)` from the existing SDK room receive callback,
after checking the current room and `aitools_game_sendmsg` event. Supply `sender`
from the SDK's envelope `data.user_id`, and derive membership from the current
verified session state. Never read an actor identity from the reaction JSON.
Reaction events are a side channel; they must not be sent to or handled by the
game-state transition function. Wrong room/session/round, unknown members,
unknown reactions, duplicates, out-of-order sequences, and oversized payloads
are rejected. The channel rate-limits both directions and keeps only a bounded
volatile overlay.

## Minimal multiplayer adapter seam

`createReactionSdkBridge` accepts a getter for the live session context, an
SDK-only `sendSdk(wire)` callback, and an `onReaction(sender, wire)` callback.
The context must be derived from the real adapter/session, not message fields:

```js
{
  joined: nativeJoined,
  roomId,
  sessionId,
  userId,
  protocol: PROTOCOL,
  mode: state.mode,
  phase: state.phase,
  roundId: state.roundId,
  participants: state.participants,
  spectators: state.spectators
}
```

The smallest intended adapter delta is:

```js
let reactionHandler = () => false;
const reactionBridge = createReactionSdkBridge({
  getContext: () => {
    const state = session?.getState();
    return state && sessionId && roomId ? {
      joined: nativeJoined, roomId, sessionId, userId,
      protocol: PROTOCOL, mode: state.mode, phase: state.phase,
      roundId: state.roundId, participants: state.participants,
      spectators: state.spectators
    } : null;
  },
  // Use a reactions-only transport call. Do not reuse the game `send` closure,
  // which closes the session on transport failure.
  sendSdk: wire => sdk.room.sendMessage({message: wire}),
  onReaction: (sender, wire) => reactionHandler(sender, wire)
});

sdk.room.receiveMessage(payload => {
  const sideChannel = reactionBridge.receive(payload); // before protocol.decode
  if (sideChannel.handled) return;                      // never call session.receive
  // Existing discovery / confirmation / session handling remains unchanged.
});

return Object.freeze({
  // ...existing adapter methods...
  sendReaction: reactionBridge.send,
  setReactionHandler(handler) {
    if (typeof handler !== 'function') throw new TypeError('handler required');
    reactionHandler = handler;
  }
});
```

`sendReaction` only transmits an exact small reaction wire for the currently
joined room/session/active battle/current round and current local member; it is
not a general SDK send API. The bridge consumes any recognized `type:"reaction"`
event before the FSM, including malformed/stale events, and calls the handler
only after strict protocol/mode/room/session/round checks plus explicit SDK
envelope `room_id`, `user_id`, and current participant/spectator membership
checks. It never reads the actor from JSON. The `reaction-channel` performs its
additional allowlist, per-sender sequence/rate, and overlay checks.

The candidate adapter and UI are connected and verified using mocked SDK callbacks only. No real SDK traffic has been sent. The code examples above document the generic seam; the enclosing sdk-adapter implements it with an install-time onReaction callback.

## Tests

```sh
node --test reactions/reaction-channel.test.mjs reactions/reaction-sdk-bridge.test.mjs
```
