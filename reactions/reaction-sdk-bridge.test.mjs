import test from 'node:test';
import assert from 'node:assert/strict';
import {createReactionSdkBridge} from './reaction-sdk-bridge.mjs';
import {createReactionChannel, REACTION_MODE, REACTION_PROTOCOL} from './reaction-channel.mjs';

function context(overrides = {}) {
  return {joined: true, roomId: 'room-1', sessionId: 'session-1', userId: 'host',
    protocol: REACTION_PROTOCOL, mode: REACTION_MODE, phase: 'battle', roundId: 2,
    participants: ['host', 'guest'], spectators: [], ...overrides};
}
function wire(overrides = {}) {
  return JSON.stringify({protocol: REACTION_PROTOCOL, version: 1, mode: REACTION_MODE,
    roomId: 'room-1', sessionId: 'session-1', type: 'reaction', roundId: 2, emoji: 'cheer', seq: 1,
    ...overrides});
}
function payload({sender = 'guest', roomId = 'room-1', type = 'aitools_game_sendmsg', msg = wire()} = {}) {
  return {type, data: {room_id: roomId, user_id: sender, msg_data: msg}};
}

function mockHarness(initial = context()) {
  let live = initial;
  const sdkSent = [];
  const reactions = [];
  const fsmReceived = [];
  const bridge = createReactionSdkBridge({
    getContext: () => live,
    sendSdk: message => {sdkSent.push(message); return {errno: 0};},
    onReaction: (sender, raw, event) => {reactions.push({sender, raw, event}); return true;}
  });
  // This models the adapter's required routing order around its existing FSM.
  const deliver = message => {
    const route = bridge.receive(message);
    if (!route.handled) fsmReceived.push(message?.data?.msg_data);
    return route;
  };
  return {bridge, sdkSent, reactions, fsmReceived, setContext: value => {live = value;}, deliver};
}

test('reaction message is consumed by side channel and never enters session.receive', () => {
  const h = mockHarness();
  assert.deepEqual(h.deliver(payload()), {handled: true, accepted: true});
  assert.equal(h.reactions.length, 1);
  assert.equal(h.reactions[0].sender, 'guest', 'sender comes from SDK data.user_id');
  assert.equal(h.reactions[0].event.emoji, 'cheer');
  assert.equal(h.fsmReceived.length, 0);
});

test('only reaction messages are intercepted; all other protocol messages stay on old path', () => {
  const h = mockHarness();
  const bet = wire({type: 'bet'});
  assert.deepEqual(h.deliver(payload({msg: bet})), {handled: false, accepted: false});
  assert.equal(h.fsmReceived.length, 1);
  assert.equal(h.reactions.length, 0);
});

test('SDK envelope room ID is mandatory and must match, even when inner wire matches', () => {
  const h = mockHarness();
  const missingRoom = {type: 'aitools_game_sendmsg', data: {user_id: 'guest', msg_data: wire()}};
  assert.deepEqual(h.deliver(missingRoom), {handled: true, accepted: false});
  assert.deepEqual(h.deliver(payload({roomId: 'old-room'})), {handled: true, accepted: false});
  assert.equal(h.reactions.length, 0);
  assert.equal(h.fsmReceived.length, 0);
});

test('sender identity is the verified SDK user_id and must be an active participant or spectator', () => {
  const h = mockHarness();
  assert.deepEqual(h.deliver(payload({sender: 'outsider'})), {handled: true, accepted: false});
  assert.deepEqual(h.deliver(payload({sender: 'host'})), {handled: true, accepted: false}, 'no local echo');
  assert.deepEqual(h.deliver(payload({sender: ''})), {handled: true, accepted: false});
  assert.deepEqual(h.deliver(payload({sender: 'guest', msg: wire({playerId: 'host'})})),
    {handled: true, accepted: false}, 'wire may not carry actor identity');
  assert.equal(h.reactions.length, 0);
  assert.equal(h.fsmReceived.length, 0);
});

test('numeric SDK user IDs are normalized from the SDK envelope, not from message JSON', () => {
  const h = mockHarness(context({participants: ['host', '1002']}));
  assert.deepEqual(h.deliver(payload({sender: 1002})), {handled: true, accepted: true});
  assert.equal(h.reactions[0].sender, '1002');
});

test('side channel rejects wrong protocol/mode/room/session/round and out-of-battle events', () => {
  const h = mockHarness();
  for (const msg of [
    wire({protocol: 'old-protocol'}), wire({mode: 'OLD_MODE'}), wire({roomId: 'wrong-room'}),
    wire({sessionId: 'old-session'}), wire({roundId: 1}), wire({emoji: 'unknown'})
  ]) assert.deepEqual(h.deliver(payload({msg})), {handled: true, accepted: false});
  h.setContext(context({phase: 'result'}));
  assert.deepEqual(h.deliver(payload({msg: wire({seq: 2})})), {handled: true, accepted: false});
  h.setContext(context({joined: false}));
  assert.deepEqual(h.deliver(payload({msg: wire({seq: 3})})), {handled: true, accepted: false});
  assert.equal(h.reactions.length, 0);
  assert.equal(h.fsmReceived.length, 0);
});

test('well-formed reaction kind with malformed fields is consumed, not routed to the FSM', () => {
  const h = mockHarness();
  const hostile = wire({playerId: 'host'});
  assert.deepEqual(h.deliver(payload({msg: hostile})), {handled: true, accepted: false});
  assert.deepEqual(h.deliver(payload({msg: JSON.stringify({type: 'reaction', roomId: 'room-1'})})),
    {handled: true, accepted: false});
  assert.equal(h.reactions.length, 0);
  assert.equal(h.fsmReceived.length, 0);
});

test('send only authorizes compact current-round reaction wires while battle is active', () => {
  const h = mockHarness();
  const sendWire = wire();
  assert.deepEqual(h.bridge.send(sendWire), {errno: 0});
  assert.deepEqual(h.sdkSent, [sendWire]);
  for (const bad of [wire({type: 'bet'}), wire({roundId: 1}), wire({roomId: 'wrong'}),
    wire({sessionId: 'old'}), wire({playerId: 'host'})]) assert.equal(h.bridge.send(bad), false);
  h.setContext(context({phase: 'predict'}));
  assert.equal(h.bridge.send(wire({seq: 2})), false);
  h.setContext(context({participants: ['guest']}));
  assert.equal(h.bridge.send(wire({seq: 2})), false, 'local user must be a current member');
  assert.deepEqual(h.sdkSent, [sendWire]);
});

test('send transport failure is contained and does not alter the supplied game context', async () => {
  const live = context();
  const bridge = createReactionSdkBridge({getContext: () => context(),
    sendSdk: () => Promise.reject(new Error('mock transport unavailable')),
    onReaction: () => true});
  assert.equal(await bridge.send(wire()), false);
  assert.equal(live.phase, 'battle');
  assert.equal(live.roundId, 2);
});

test('real channel mock host/guest flow uses SDK-envelope identity and dynamic roster without native SDK', () => {
  const guestWires = [];
  let now = 1000;
  const guest = createReactionChannel({roomId: 'room-1', sessionId: 'session-1', userId: 'guest',
    getMembers: () => ['host', 'guest'], now: () => now, send: value => {guestWires.push(value);}});
  guest.setRound(2);
  assert.equal(guest.react('applause'), true);
  let memberList = ['host', 'guest'];
  const host = createReactionChannel({roomId: 'room-1', sessionId: 'session-1', userId: 'host',
    getMembers: () => memberList, now: () => now, send: () => {}});
  host.setRound(2);
  let state = context();
  const bridge = createReactionSdkBridge({getContext: () => state, sendSdk: () => ({errno: 0}),
    onReaction: (sender, raw) => host.receive(sender, raw)});
  assert.deepEqual(bridge.receive(payload({sender: 'guest', msg: guestWires[0]})), {handled: true, accepted: true});
  assert.equal(host.getFeed()[0].sender, 'guest');

  state = context({participants: ['host'], spectators: []});
  now = 2500;
  assert.deepEqual(bridge.receive(payload({sender: 'guest', msg: wire({roundId: 2, seq: 2})})),
    {handled: true, accepted: false});
  assert.equal(host.getFeed().length, 1, 'unverified departed member is not displayed');
});
