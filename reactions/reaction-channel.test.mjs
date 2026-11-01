import test from 'node:test';
import assert from 'node:assert/strict';
import {createReactionChannel, REACTIONS, REACTION_PROTOCOL, REACTION_MODE} from './reaction-channel.mjs';

function fixture({members = ['host', 'guest'], roomId = 'room-1', sessionId = 'session-1', userId = 'host', limits = {}} = {}) {
  let time = 1000;
  const sent = [];
  const changes = [];
  const channel = createReactionChannel({roomId, sessionId, userId, getMembers: () => members,
    now: () => time, limits, onChange: value => changes.push(value), send: wire => {sent.push(wire);}});
  return {channel, sent, changes, setTime: value => {time = value;}, members};
}

function event(overrides = {}) {
  return JSON.stringify({protocol: REACTION_PROTOCOL, version: 1, mode: REACTION_MODE,
    roomId: 'room-1', sessionId: 'session-1', type: 'reaction', roundId: 1, emoji: 'cheer', seq: 1,
    ...overrides});
}

test('four short stamps are an optional lane and do nothing before an active round', () => {
  const {channel, sent, setTime} = fixture();
  assert.deepEqual(Object.keys(REACTIONS), ['wow', 'cheer', 'frustrated', 'applause']);
  assert.equal(channel.react('cheer'), false);
  assert.equal(sent.length, 0);
  channel.setRound(1);
  for (const [i, id] of Object.keys(REACTIONS).entries()) {
    setTime(1000 + i * 1000);
    assert.equal(channel.react(id), true);
  }
  assert.equal(sent.length, 4);
  assert.equal(channel.getFeed().length, 3, 'expired local stamp drops from the short overlay');
});

test('outgoing event is compact, protocol-tagged, and never carries actor or game-state data', () => {
  const {channel, sent} = fixture();
  channel.setRound(3);
  assert.equal(channel.react('wow'), true);
  const message = JSON.parse(sent[0]);
  assert.deepEqual(message, {protocol: REACTION_PROTOCOL, version: 1, mode: REACTION_MODE,
    roomId: 'room-1', sessionId: 'session-1', type: 'reaction', roundId: 3, emoji: 'wow', seq: 1});
  assert.equal('sender' in message, false);
  assert.equal('wallet' in message, false);
  assert.equal('side' in message, false);
  assert.ok(new TextEncoder().encode(sent[0]).length < 512);
});

test('button taps are rate-limited and invalid reactions never send', () => {
  const {channel, sent, setTime} = fixture();
  channel.setRound(1);
  assert.equal(channel.react('heart'), false);
  assert.equal(channel.react('cheer'), true);
  assert.equal(channel.react('cheer'), false);
  setTime(1999);
  assert.equal(channel.react('wow'), false);
  setTime(2000);
  assert.equal(channel.react('wow'), true);
  for (let n = 3; n <= 5; n++) { setTime(1000 + n * 1000); assert.equal(channel.react('applause'), true); }
  setTime(7000);
  assert.equal(channel.react('frustrated'), false, 'five per rolling ten-second window');
  setTime(12000);
  assert.equal(channel.react('frustrated'), true, 'window eventually expires');
  assert.equal(sent.length, 6);
});

test('receive trusts only callback sender, verified membership, valid scope and whitelisted stamp', () => {
  const {channel} = fixture();
  channel.setRound(1);
  assert.equal(channel.receive('outsider', event()), false);
  assert.equal(channel.receive('host', event()), false, 'does not echo the local user');
  assert.equal(channel.receive('guest', event()), true);
  assert.deepEqual(channel.getFeed().map(x => ({sender: x.sender, emoji: x.emoji, local: x.local})),
    [{sender: 'guest', emoji: 'cheer', local: false}]);
  assert.equal(channel.receive('guest', event({seq: 2, sender: 'host'})), false, 'sender field is forbidden, never trusted');
});

test('rejects stale round, wrong room/session/protocol/mode, malformed, unknown or oversized event', () => {
  const {channel} = fixture();
  channel.setRound(1);
  for (const wire of [
    event({roundId: 2}), event({roomId: 'other'}), event({sessionId: 'other'}),
    event({protocol: 'other'}), event({mode: 'OTHER'}), event({emoji: 'hack'}),
    event({seq: 0}), '{bad json', 'x'.repeat(513)
  ]) assert.equal(channel.receive('guest', wire), false);
});

test('old-round and duplicate/out-of-order messages cannot replay; sequence remains monotonic across rounds', () => {
  const {channel, setTime} = fixture();
  channel.setRound(1);
  assert.equal(channel.receive('guest', event({seq: 2})), true);
  assert.equal(channel.receive('guest', event({seq: 2})), false);
  assert.equal(channel.receive('guest', event({seq: 1})), false);
  channel.setRound(2);
  assert.equal(channel.receive('guest', event({roundId: 1, seq: 3})), false, 'late old round');
  assert.equal(channel.receive('guest', event({roundId: 2, seq: 2})), false, 'duplicate sequence stays rejected');
  setTime(1180);
  assert.equal(channel.receive('guest', event({roundId: 2, seq: 3})), true);
});

test('per-sender receive throttle blocks floods, even when seq keeps increasing', () => {
  const {channel, setTime} = fixture();
  channel.setRound(1);
  assert.equal(channel.receive('guest', event({seq: 1})), true);
  setTime(1100);
  assert.equal(channel.receive('guest', event({seq: 2})), false);
  setTime(1180);
  assert.equal(channel.receive('guest', event({seq: 2})), true);
  assert.equal(channel.receive('host', event({seq: 1})), false, 'local self is not echoed');
});

test('incoming rolling-window cap also applies per verified sender', () => {
  const {channel, setTime} = fixture();
  channel.setRound(1);
  for (let seq = 1; seq <= 8; seq++) {
    setTime(1000 + seq * 200);
    assert.equal(channel.receive('guest', event({seq})), true);
  }
  setTime(2800);
  assert.equal(channel.receive('guest', event({seq: 9})), false, 'eighth accepted event fills ten-second budget');
  setTime(12000);
  assert.equal(channel.receive('guest', event({seq: 9})), true, 'budget recovers after the rolling window');
});

test('feed has a hard four-item display bound and expires quickly', () => {
  const multi = fixture({members: ['host', 'a', 'b', 'c', 'd']});
  multi.channel.setRound(1);
  for (const [i, who] of ['a', 'b', 'c', 'd', 'a'].entries()) {
    multi.setTime(1000 + i * 200);
    assert.equal(multi.channel.receive(who, event({seq: i + 1})), true);
  }
  assert.equal(multi.channel.getFeed().length, 4);
  multi.setTime(5000);
  assert.equal(multi.channel.getFeed().length, 0);
});

test('round switch clears overlay; invalid round rejected; close permanently disables sends and receives', () => {
  const {channel, sent} = fixture();
  assert.throws(() => channel.setRound(11), /roundId/);
  channel.setRound(1);
  assert.equal(channel.react('cheer'), true);
  assert.equal(channel.setRound(2), true);
  assert.equal(channel.getFeed().length, 0);
  assert.equal(channel.receive('guest', event({roundId: 2})), true);
  assert.equal(channel.close(), true);
  assert.equal(channel.close(), false);
  assert.equal(channel.react('wow'), false);
  assert.equal(channel.receive('guest', event({roundId: 2, seq: 2})), false);
  assert.equal(sent.length, 1);
});

test('transport exceptions do not consume a sequence or update the game', () => {
  let fail = true;
  let reject = false;
  const wires = [];
  const channel = createReactionChannel({roomId: 'room-1', sessionId: 'session-1', userId: 'host',
    getMembers: () => ['host'], now: () => 5000,
    send: wire => {if (fail) throw Error('offline'); if (reject) return false; wires.push(wire);}});
  channel.setRound(1);
  assert.equal(channel.react('wow'), false);
  fail = false;
  reject = true;
  assert.equal(channel.react('wow'), false);
  assert.equal(channel.getFeed().length, 0);
  reject = false;
  assert.equal(channel.react('wow'), true);
  assert.equal(JSON.parse(wires[0]).seq, 1);
});

test('clock moving backwards cannot reopen the rate-limit window', () => {
  const {channel, sent, setTime} = fixture();
  channel.setRound(1);
  assert.equal(channel.react('wow'), true);
  setTime(500);
  assert.equal(channel.react('cheer'), false);
  setTime(2000);
  assert.equal(channel.react('cheer'), true);
  assert.equal(sent.length, 2);
});
