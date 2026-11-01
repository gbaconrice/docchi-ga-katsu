/**
 * Optional, ephemeral reaction lane for GRAVITY Quick 10. This module never
 * calls the game session, prediction, settlement, wallet, timer, or RNG APIs.
 *
 * IMPORTANT transport contract: `receive(sender, wire)` must be called only
 * from the already-verified SDK room callback. `sender` is the SDK envelope's
 * user_id, never a JSON field. `send(wire)` must use that same authorized SDK
 * room transport. The emitted wire is a small, separate `type: reaction` event.
 */
export const REACTION_PROTOCOL = 'gravity-prediction-battle-quick10-v1';
export const REACTION_MODE = 'GRAVITY_QUICK10_V1';
export const REACTION_TYPE = 'reaction';

// Text-first tiny stamps, not emoji-only UI. An art pass may replace their
// presentation without changing the stable wire IDs below.
export const REACTIONS = Object.freeze({
  wow: Object.freeze({label: '!?', accessibleLabel: 'びっくり'}),
  cheer: Object.freeze({label: 'いけー！', accessibleLabel: '応援'}),
  frustrated: Object.freeze({label: 'ぐぬ…', accessibleLabel: 'くやしい'}),
  applause: Object.freeze({label: 'ぱちぱち', accessibleLabel: '拍手'})
});

export const REACTION_LIMITS = Object.freeze({
  sendCooldownMs: 1000,
  sendWindowMs: 10000,
  sendWindowMax: 5,
  receiveCooldownMs: 180,
  receiveWindowMs: 10000,
  receiveWindowMax: 8,
  visibleTtlMs: 2600,
  visibleMax: 4,
  maxWireBytes: 512
});

const reactionIds = new Set(Object.keys(REACTIONS));
const validId = value => typeof value === 'string' && /^[\w.:-]{1,128}$/.test(value);
const validRound = value => Number.isSafeInteger(value) && value >= 1 && value <= 10;
const validSeq = value => Number.isSafeInteger(value) && value >= 1;
const utf8Length = value => new TextEncoder().encode(value).length;
const copyEvent = value => ({...value});

function encodeEvent(event, maxBytes) {
  const wire = JSON.stringify({
    protocol: REACTION_PROTOCOL,
    version: 1,
    mode: REACTION_MODE,
    roomId: event.roomId,
    sessionId: event.sessionId,
    type: REACTION_TYPE,
    roundId: event.roundId,
    emoji: event.emoji,
    seq: event.seq
  });
  if (utf8Length(wire) > maxBytes) throw new RangeError('reaction-wire-cap-exceeded');
  return wire;
}

function decodeEvent(wire, maxBytes) {
  if (typeof wire !== 'string' || utf8Length(wire) > maxBytes) return null;
  let event;
  try { event = JSON.parse(wire); } catch { return null; }
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const keys = Object.keys(event).sort();
  const expected = ['emoji', 'mode', 'protocol', 'roomId', 'roundId', 'seq', 'sessionId', 'type', 'version'].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return null;
  if (event.protocol !== REACTION_PROTOCOL || event.version !== 1 || event.mode !== REACTION_MODE ||
      event.type !== REACTION_TYPE || !validId(event.roomId) || !validId(event.sessionId) ||
      !validRound(event.roundId) || !validSeq(event.seq) || !reactionIds.has(event.emoji)) return null;
  return event;
}

/** Strict, read-only parser for adapter side-channel guards. */
export function parseReactionWire(wire) {
  const event = decodeEvent(wire, REACTION_LIMITS.maxWireBytes);
  return event ? {...event} : null;
}

/**
 * `getMembers()` must return the current SDK-verified participants/spectators.
 * `setRound(roundId)` both scopes events and clears all visible old-round UI.
 * At most four short-lived stamps are kept; no reaction history is persisted.
 */
export function createReactionChannel({
  roomId, sessionId, userId, send,
  getMembers = () => [],
  now = Date.now,
  onChange = () => {},
  limits = {}
}) {
  if (![roomId, sessionId, userId].every(validId) || typeof send !== 'function') {
    throw new TypeError('room/session/user identity and send are required');
  }
  if (typeof getMembers !== 'function' || typeof now !== 'function' || typeof onChange !== 'function') {
    throw new TypeError('invalid reaction channel callbacks');
  }
  const caps = {...REACTION_LIMITS, ...limits};
  for (const [key, value] of Object.entries(caps)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`invalid ${key}`);
  }

  let roundId = null;
  let seq = 0;
  let lastMonotonicTime = 0;
  let lastSentAt = -Infinity;
  const sentTimes = [];
  const receivedTimes = new Map();
  const receivedSeq = new Map();
  let feed = [];
  let closed = false;

  function currentTime() {
    const t = now();
    if (!Number.isFinite(t) || t < 0) return null;
    lastMonotonicTime = Math.max(lastMonotonicTime, t);
    return lastMonotonicTime;
  }
  function publish() {
    const timestamp = currentTime();
    feed = timestamp === null ? [] : feed.filter(item => item.roundId === roundId && item.expiresAt > timestamp);
    feed = feed.slice(-caps.visibleMax);
    onChange(feed.map(copyEvent));
  }
  function isAllowedMember(id) {
    let roster;
    try { roster = getMembers(); } catch { return false; }
    return (Array.isArray(roster) || roster instanceof Set) && [...roster].includes(id);
  }
  function admitRate(map, actor, timestamp, cooldownMs, windowMs, maxInWindow) {
    const history = (map.get(actor) || []).filter(t => timestamp - t < windowMs);
    if (history.length >= maxInWindow || (history.length && timestamp - history[history.length - 1] < cooldownMs)) {
      map.set(actor, history);
      return false;
    }
    history.push(timestamp);
    map.set(actor, history);
    return true;
  }
  function addFeed(event) {
    feed.push(event);
    publish();
  }

  function setRound(id) {
    if (id !== null && !validRound(id)) throw new TypeError('roundId must be null or 1..10');
    if (roundId === id) return false;
    roundId = id;
    feed = [];
    publish();
    return true;
  }

  function react(emoji) {
    if (closed || roundId === null || !reactionIds.has(emoji)) return false;
    const timestamp = currentTime();
    if (timestamp === null || timestamp - lastSentAt < caps.sendCooldownMs) return false;
    while (sentTimes.length && timestamp - sentTimes[0] >= caps.sendWindowMs) sentTimes.shift();
    if (sentTimes.length >= caps.sendWindowMax) return false;
    const event = {roomId, sessionId, roundId, emoji, seq: seq + 1};
    let wire;
    try { wire = encodeEvent(event, caps.maxWireBytes); } catch { return false; }
    try {
      const result = send(wire);
      if (result === false) return false;
      if (result?.then) result.catch(() => {});
    } catch { return false; }
    seq = event.seq;
    lastSentAt = timestamp;
    sentTimes.push(timestamp);
    addFeed({...event, sender: userId, local: true, receivedAt: timestamp,
      expiresAt: timestamp + caps.visibleTtlMs});
    return true;
  }

  function receive(sender, wire) {
    if (closed || roundId === null || !validId(sender) || sender === userId || !isAllowedMember(sender)) return false;
    const event = decodeEvent(wire, caps.maxWireBytes);
    if (!event || event.roomId !== roomId || event.sessionId !== sessionId || event.roundId !== roundId) return false;
    // SDK callback identity is authoritative; fields in event are never treated as actor IDs.
    if (event.seq <= (receivedSeq.get(sender) || 0)) return false;
    const timestamp = currentTime();
    if (timestamp === null || !admitRate(receivedTimes, sender, timestamp,
      caps.receiveCooldownMs, caps.receiveWindowMs, caps.receiveWindowMax)) return false;
    receivedSeq.set(sender, event.seq);
    addFeed({...event, sender, local: false, receivedAt: timestamp,
      expiresAt: timestamp + caps.visibleTtlMs});
    return true;
  }

  function getFeed() {
    publish();
    return feed.map(copyEvent);
  }
  function close() {
    if (closed) return false;
    closed = true; roundId = null; feed = [];
    publish(); receivedTimes.clear(); receivedSeq.clear(); sentTimes.length = 0;
    return true;
  }

  return Object.freeze({setRound, react, receive, getFeed, close,
    getRound: () => roundId,
    isClosed: () => closed});
}
