const assert = require('node:assert/strict');
require('./special-sfx-bank.js');
const { createBattleAudio, MAX_VOICES, MAX_NODES } = require('./battle-audio.js');

class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exp', value, time]); }
  setTargetAtTime(value, time, glide) { this.value = value; this.events.push(['target', value, time, glide]); }
  cancelScheduledValues() {}
}

class FakeNode {
  constructor(ctx, kind) {
    this.ctx = ctx; this.kind = kind; this.connections = [];
    this.gain = new Param(); this.frequency = new Param(); this.playbackRate = new Param(1);
    this.stopped = false; this.started = false;
    ctx.nodes.push(this);
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeContext {
  static instances = [];
  constructor() {
    this.state = 'running'; this.currentTime = 1; this.sampleRate = 22050;
    this.destination = { kind: 'destination' }; this.nodes = []; this.buffers = [];
    FakeContext.instances.push(this);
  }
  createGain() { return new FakeNode(this, 'gain'); }
  createOscillator() { return new FakeNode(this, 'oscillator'); }
  createBufferSource() { return new FakeNode(this, 'bufferSource'); }
  createBiquadFilter() { return new FakeNode(this, 'filter'); }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    const buffer = { channels, length, sampleRate, duration: length / sampleRate, getChannelData: channel => data[channel] };
    this.buffers.push(buffer); return buffer;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

class DeferredContext extends FakeContext {
  constructor() { super(); this.state = 'suspended'; }
  resume() {
    return new Promise(resolve => {
      this.finishResume = () => { this.state = 'running'; resolve(); this.onstatechange?.(); };
    });
  }
}

function fakeButton() {
  const listeners = new Map();
  return {
    textContent: '', attrs: {},
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    setAttribute(name, value) { this.attrs[name] = value; },
    click(isTrusted = true) { listeners.get('click')?.({ isTrusted }); }
  };
}

function fakeDocument() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    changeVisibility(hidden) { this.hidden = hidden; listeners.get('visibilitychange')?.(); }
  };
}

function finishVoices(ctx) {
  for (const node of [...ctx.nodes]) if (typeof node.onended === 'function') node.onended();
}

async function main() {
  // Construction and synthetic/non-user events must not create/resume WebAudio.
  FakeContext.instances.length = 0;
  const doc = fakeDocument(), button = fakeButton();
  const audio = createBattleAudio({ AudioContext: FakeContext, document: doc, muteButton: button });
  assert.equal(audio.unlocked, false);
  assert.equal(audio.playSelection({ isTrusted: false }), false);
  assert.equal(audio.unlockFromGesture({ isTrusted: false }), false);
  assert.equal(FakeContext.instances.length, 0);
  assert.equal(button.textContent, '音');
  assert.equal(button.attrs['aria-pressed'], 'false');

  const gesture = { isTrusted: true };
  assert.equal(audio.playSelection(gesture), true, 'real click can unlock and play a soft select');
  assert.equal(audio.unlocked, true);
  const ctx = FakeContext.instances[0];
  assert.ok(ctx.nodes.some(n => n.kind === 'oscillator'));

  assert.equal(audio.beginBattle('room-abc:round-1', gesture), true);
  assert.equal(audio.phase, 'battle');
  assert.equal(audio.ambientLevel, 1, 'ambience follows a live battle');
  assert.equal(audio.beginBattle('room-abc:round-1'), false, 'reconnect/start duplicate is silent');
  assert.equal(audio.ingestCombatEvents([], { battleId: 'room-abc:round-1', tick: 1 }), 0);
  assert.equal(audio.ingestCombatEvents([{ type: 'projectile_release', k: 'cannon' }], { tick: 2 }), 0,
    'projectile intent alone is not an impact');
  assert.equal(audio.ingestCombatEvents([{ type: 'resolved_hit', sourceKind: 'archer', amount: 4 }], {
    battleId: 'room-abc:round-1', tick: 3
  }), 1, 'only resolved hit creates an impact cue');
  assert.equal(audio.ingestCombatEvents([{ type: 'resolved_hit', sourceKind: 'archer', amount: 4 }], {
    battleId: 'room-abc:round-1', tick: 3
  }), 0, 'replayed combat tick is deduplicated');
  assert.equal(audio.ingestCombatEvents([{ type: 'resolved_hit', amount: 4 }], {
    battleId: 'old-room:round-1', tick: 4
  }), 0, 'stale/reconnected room cannot feed another battle');
  finishVoices(ctx);

  // Enhanced special cues are selected only from their real combat-event kinds.
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestCombatEvents([
    { type: 'resolved_hit', sourceKind: 'golem', amount: 50 },
    { type: 'golem_ground_contact', sourceToken: 'golem:1' }
  ], { battleId: 'room-abc:round-1', tick: 41 }), 1);
  assert.ok(ctx.buffers.some(b => Math.abs(b.duration - 0.48) < 1 / b.sampleRate), 'golem receives the original stone-body sample');
  assert.ok(ctx.nodes.filter(n => n.kind === 'gain').some(n => n.gain.events.some(ev => ev[0] === 'linear' && ev[1] === 1)),
    'special impacts briefly duck and release the ambience bus');
  finishVoices(ctx);
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestCombatEvents([
    { type: 'chain_link', index: 0 }, { type: 'chain_link', index: 1 }, { type: 'chain_link', index: 2 }
  ], { battleId: 'room-abc:round-1', tick: 42 }), 1, 'multiple actual links coalesce to one tick accent');
  assert.ok(ctx.buffers.some(b => Math.abs(b.duration - 0.34) < 1 / b.sampleRate), 'storm chain uses the electric sample');
  finishVoices(ctx);
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode', sourceToken: 'bomb:1' }], {
    battleId: 'room-abc:round-1', tick: 43
  }), 1);
  assert.ok(ctx.buffers.some(b => Math.abs(b.duration - 0.56) < 1 / b.sampleRate), 'bomb uses the contained core + debris sample');
  finishVoices(ctx);
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestCombatEvents([{ type: 'resolved_hit', sourceKind: 'drake', amount: 25 }], {
    battleId: 'room-abc:round-1', tick: 44
  }), 1);
  assert.ok(ctx.buffers.some(b => Math.abs(b.duration - 0.36) < 1 / b.sampleRate), 'drake bite/wing impact has no fire cue');
  finishVoices(ctx);

  // Severity/meaning distinctions are synthesized without files or network.
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestCombatEvents([
    { type: 'resolved_hit', amount: 50, sourceKind: 'goblin' },
    { type: 'bomb_explode', sourceToken: 'b:2' }
  ], { battleId: 'room-abc:round-1', tick: 5 }), 1, 'one higher-priority cue per tick, with blast preferred');
  ctx.currentTime += 0.3;
  assert.equal(audio.ingestReplayEffects([{ kind: 'chain_arc' }], {
    battleId: 'room-abc:round-1', tick: 6
  }), 1, 'recorded actual-event effect has a guest adapter');

  // One mute control exposes accessible state and gates effects/ambience.
  button.click(true);
  assert.equal(audio.muted, true);
  assert.equal(button.textContent, '音');
  assert.equal(button.attrs['aria-pressed'], 'true');
  ctx.currentTime += 0.4;
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode' }], { tick: 7 }), 0);
  button.click(true);
  assert.equal(audio.muted, false);

  // Pausing, hidden tab, and recorder suppression all block audible events.
  audio.setPaused(true);
  assert.equal(audio.ambientLevel, 0);
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode' }], { tick: 8 }), 0);
  audio.setPaused(false, gesture);
  doc.changeVisibility(true);
  assert.equal(audio.ambientLevel, 0);
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode' }], { tick: 9 }), 0);
  doc.changeVisibility(false);
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode' }], { tick: 10 }), 0,
    'visibility restore alone does not resume WebAudio');
  audio.unlockFromGesture(gesture);
  assert.equal(audio.ambientLevel, 1);
  audio.setSuppressed(true);
  assert.equal(audio.ambientLevel, 0);
  assert.equal(ctx.nodes.find(n => n.kind === 'gain').gain.value, 0,
    'recorder suppression silences the entire master bus immediately');
  assert.equal(audio.ingestCombatEvents([{ type: 'bomb_explode' }], { tick: 11 }), 0);
  audio.setSuppressed(false);
  assert.equal(audio.ambientLevel, 1);
  assert.equal(ctx.nodes.find(n => n.kind === 'gain').gain.value, 0.42);

  // Hundreds of resolved impacts cannot exceed the hard concurrent voice/node caps.
  for (let i = 0; i < 80; i++) {
    ctx.currentTime += 0.13;
    audio.ingestCombatEvents([{ type: 'resolved_hit', sourceKind: 'goblin', amount: 3 }], {
      battleId: 'room-abc:round-1', tick: 100 + i
    });
    assert.ok(audio.activeVoiceCount <= MAX_VOICES);
    assert.ok(audio.activeNodeCount <= MAX_NODES);
  }

  // Simulate the browser firing scheduled source `ended` events before result.
  finishVoices(ctx);
  assert.equal(audio.activeVoiceCount, 0);

  // Results are one-shot per canonical battle key; replay cannot re-award audio.
  ctx.currentTime += 0.4;
  assert.equal(audio.finishBattleForChoice('room-abc:round-1', true), true);
  assert.equal(audio.phase, 'result');
  assert.equal(audio.ambientLevel, 0);
  assert.equal(audio.finishBattleForChoice('room-abc:round-1', true), false);
  assert.equal(audio.beginBattle('room-abc:round-1'), false);
  assert.equal(audio.phase, 'result', 'repeated start snapshot cannot restart a finished round');
  assert.equal(audio.finishBattleForChoice('room-abc:round-2', false), false);

  // Voice and all explicitly tracked nodes remain capped under dense event input.
  assert.ok(audio.activeVoiceCount <= MAX_VOICES);
  assert.ok(audio.activeNodeCount <= MAX_NODES,
    `tracked nodes ${audio.activeNodeCount} exceed cap ${MAX_NODES}`);
  assert.ok(audio.activeNodeCount > 0);
  audio.destroy();
  assert.equal(audio.unlocked, false);
  assert.equal(audio.activeNodeCount, 0);

  // Missing WebAudio API is a no-op, not a gameplay failure.
  const unavailable = createBattleAudio({ document: fakeDocument(), AudioContext: null });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.unlockFromGesture(gesture), false);
  assert.equal(unavailable.beginBattle('offline:1', gesture), true);
  assert.equal(unavailable.ingestCombatEvents([{ type: 'resolved_hit', amount: 1 }], { tick: 1 }), 0);
  unavailable.destroy();

  // Some mobile browsers resolve `resume()` asynchronously on the first tap.
  const deferred = createBattleAudio({ AudioContext: DeferredContext, document: fakeDocument() });
  assert.equal(deferred.playSelection(gesture), true, 'initial click cue waits briefly for context resume');
  assert.equal(deferred.activeVoiceCount, 0, 'nothing is started in a suspended context');
  assert.equal(deferred.beginBattle('slow-audio:1'), true);
  const delayedCtx = FakeContext.instances.at(-1);
  delayedCtx.finishResume();
  await Promise.resolve(); await Promise.resolve();
  assert.ok(deferred.activeVoiceCount >= 1, 'queued user-triggered cues play after successful resume');
  deferred.destroy();

  console.log('battle audio tests passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
