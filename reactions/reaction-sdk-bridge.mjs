import {parseReactionWire, REACTION_MODE, REACTION_PROTOCOL, REACTION_TYPE} from './reaction-channel.mjs';

const SDK_SEND_TYPE = 'aitools_game_sendmsg';
const MAX_PROTOCOL_WIRE_BYTES = 48000;
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const validRound = value => Number.isSafeInteger(value) && value >= 1 && value <= 10;
const byteLength = value => new TextEncoder().encode(value).length;

function getContext(source) {
  try { return source(); } catch { return null; }
}
function memberIds(context) {
  const participants = context?.participants;
  const spectators = context?.spectators;
  if (!Array.isArray(participants) || !Array.isArray(spectators)) return null;
  return new Set([...participants, ...spectators].filter(validId));
}
function isActive(context) {
  return !!context && context.joined === true &&
    validId(context.roomId) && validId(context.sessionId) && validId(context.userId) &&
    context.protocol === REACTION_PROTOCOL && context.mode === REACTION_MODE &&
    context.phase === 'battle' && validRound(context.roundId) && !!memberIds(context);
}
function isContextMember(context, actor) {
  return !!memberIds(context)?.has(actor);
}
function isSameRoomSession(event, context) {
  return event.roomId === context.roomId && event.sessionId === context.sessionId && event.roundId === context.roundId;
}
function sdkActorId(value) {
  if (typeof value === 'string') return value;
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  return '';
}

// Identify a reaction before strict validation so even a malformed/stale reaction
// is consumed by the side channel and never forwarded into the battle FSM.
function peekType(wire) {
  if (typeof wire !== 'string' || byteLength(wire) > MAX_PROTOCOL_WIRE_BYTES) return null;
  try {
    const value = JSON.parse(wire);
    return value && typeof value === 'object' && !Array.isArray(value) && value.type === REACTION_TYPE
      ? REACTION_TYPE : null;
  } catch { return null; }
}

/**
 * Minimal SDK-adapter seam for optional reactions. The host adapter supplies a
 * live context derived from its session and the native SDK send function. This
 * bridge never calls the session/FSM; caller must route `handled` messages away
 * from `session.receive`.
 *
 * Context shape:
 * {joined, roomId, sessionId, userId, protocol, mode, phase, roundId,
 *  participants: string[], spectators: string[]}
 *
 * SDK receive shape: {type:'aitools_game_sendmsg', data:{room_id,user_id,msg_data}}
 */
export function createReactionSdkBridge({getContext: contextSource, sendSdk, onReaction = () => {}}) {
  if (typeof contextSource !== 'function' || typeof sendSdk !== 'function' || typeof onReaction !== 'function') {
    throw new TypeError('getContext, sendSdk, and onReaction callbacks are required');
  }

  function send(wire) {
    const context = getContext(contextSource);
    const event = parseReactionWire(wire);
    if (!isActive(context) || !event || !isSameRoomSession(event, context) ||
        !isContextMember(context, context.userId)) return false;
    try {
      const result = sendSdk(wire);
      if (result?.then) return result.then(value => value?.errno !== undefined && value.errno !== 0 ? false : value,
        () => false);
      if (result?.errno !== undefined && result.errno !== 0) return false;
      return result ?? true;
    } catch { return false; }
  }

  function receive(payload) {
    if (payload?.type !== SDK_SEND_TYPE) return Object.freeze({handled: false, accepted: false});
    const data = payload?.data;
    const rawWire = data?.msg_data;
    if (!peekType(rawWire)) return Object.freeze({handled: false, accepted: false});

    // Once recognized as a reaction, never forward it to the session handler,
    // regardless of whether its protocol/session/member validation succeeds.
    const ignore = () => Object.freeze({handled: true, accepted: false});
    const context = getContext(contextSource);
    if (!isActive(context) || data.room_id === undefined || String(data.room_id) !== context.roomId) return ignore();
    const sender = sdkActorId(data.user_id);
    if (!validId(sender) || sender === context.userId || !isContextMember(context, sender)) return ignore();
    const event = parseReactionWire(rawWire);
    if (!event || !isSameRoomSession(event, context)) return ignore();
    try {
      const delivered = onReaction(sender, rawWire, {...event}) !== false;
      return Object.freeze({handled: true, accepted: delivered});
    } catch { return ignore(); }
  }

  return Object.freeze({send, receive});
}
