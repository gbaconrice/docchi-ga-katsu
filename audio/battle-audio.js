/*
 * どっちが勝つ？ — original, synthesized battle audio.
 * No samples, network requests, or game/simulation dependencies.
 *
 * The host must call unlockFromGesture(event) synchronously from a trusted
 * user click/keyboard activation. Merely constructing this module is silent.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.createBattleAudio = api.createBattleAudio;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_VOICES = 6;
  const MAX_NODES = 48;
  const MAX_BATCHES = 256;
  const MAX_BATTLE_KEYS = 64;
  const NOISE_SECONDS = 0.08;

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const keyOf = value => value == null ? '' : String(value);

  function trusted(event) {
    return !!event && event.isTrusted === true;
  }

  function createBattleAudio(options = {}) {
    const doc = options.document || (typeof document !== 'undefined' ? document : null);
    const muteButton = options.muteButton || null;
    const Context = options.AudioContext ||
      (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
      (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext)) || null;

    let context = null;
    let resumePending = false;
    let resumePromise = null;
    let resumeGeneration = 0;
    let master = null;
    let noiseBuffer = null;
    let ambientGain = null;
    let ambientDuckGain = null;
    let specialSfx = null;
    let ambientNodes = [];
    let ambientLevel = 0;
    let muted = false;
    let paused = false;
    let suppressed = false;
    let visible = !doc || doc.hidden !== true;
    let phase = 'idle';
    let currentBattle = '';
    let selectionLastAt = -Infinity;
    let lastHitAt = -Infinity;
    let lastSpecialAt = -Infinity;
    let lastHealAt = -Infinity;
    let lastDuckAt = -Infinity;
    let nodes = new Set();
    let voices = new Set();
    let queuedCues = [];
    const started = new Set();
    const finished = new Set();
    const batches = new Set();
    const batchOrder = [];
    const startedOrder = [];
    const finishedOrder = [];

    function remember(set, order, value, cap) {
      if (set.has(value)) return false;
      set.add(value);
      order.push(value);
      while (order.length > cap) set.delete(order.shift());
      return true;
    }

    function now() { return context ? context.currentTime : 0; }
    function wallNow() {
      try { return typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000; }
      catch (_) { return Date.now() / 1000; }
    }

    function nodeCount() { return nodes.size; }

    function managed(node) {
      nodes.add(node);
      return node;
    }

    function releaseNode(node) {
      if (!node) return;
      try { node.disconnect(); } catch (_) { /* already disconnected */ }
      nodes.delete(node);
    }

    function safeResume() {
      if (!context) return Promise.resolve(false);
      if (context.state === 'running') {
        if (resumePending) { resumeGeneration++; resumePending = false; resumePromise = null; drainCueQueue(); }
        return Promise.resolve(true);
      }
      if (resumePromise) return resumePromise;
      try {
        const p = context.resume();
        const generation = ++resumeGeneration;
        resumePending = true;
        resumePromise = Promise.resolve(p).then(() => {
          if (generation !== resumeGeneration) return false;
          resumePending = false; resumePromise = null;
          if (context?.state === 'running') { syncAmbient(); drainCueQueue(); return true; }
          return false;
        }, () => {
          if (generation === resumeGeneration) { resumePending = false; resumePromise = null; queuedCues = []; }
          return false;
        });
        return resumePromise;
      } catch (_) { resumeGeneration++; resumePending = false; resumePromise = null; queuedCues = []; return Promise.resolve(false); }
    }

    function ensureContext(event) {
      if (!trusted(event)) return false;
      if (context) {
        safeResume();
        syncAmbient();
        return true;
      }
      if (typeof Context !== 'function') return false;
      try {
        context = new Context();
        specialSfx = typeof globalThis.createOriginalSpecialSfxBank === 'function'
          ? globalThis.createOriginalSpecialSfxBank(context) : null;
        master = managed(context.createGain());
        master.gain.value = muted || suppressed ? 0 : 0.42;
        master.connect(context.destination);

        // Fixed private pseudo-noise is intentionally independent of Math.random
        // and the game's seeded simulation stream.
        const length = Math.max(128, Math.floor(context.sampleRate * NOISE_SECONDS));
        noiseBuffer = context.createBuffer(1, length, context.sampleRate);
        const channel = noiseBuffer.getChannelData(0);
        let seed = 0x6d2b79f5;
        for (let i = 0; i < length; i++) {
          seed = (Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) | 0;
          const white = ((seed >>> 0) / 2147483648) - 1;
          channel[i] = white * (0.72 + 0.28 * Math.cos(2 * Math.PI * i / length));
        }
        context.onstatechange = () => {
          if (context && context.state === 'running') { syncAmbient(); drainCueQueue(); }
        };
        safeResume();
        syncAmbient();
        return true;
      } catch (_) {
        disposeContext();
        return false;
      }
    }

    function disposeContext() {
      for (const voice of Array.from(voices)) stopVoice(voice);
      for (const n of ambientNodes) releaseNode(n);
      ambientNodes = [];
      ambientGain = null;
      ambientDuckGain = null;
      specialSfx = null;
      if (master) releaseNode(master);
      master = null;
      try { context?.close?.(); } catch (_) { /* unavailable/closed */ }
      context = null;
      noiseBuffer = null;
      resumeGeneration++; resumePending = false; resumePromise = null; queuedCues = [];
    }

    function setParam(param, value, time, glide = 0.035) {
      if (!param) return;
      try {
        param.cancelScheduledValues(time);
        param.setTargetAtTime(value, time, glide);
      } catch (_) { try { param.value = value; } catch (_) { /* no-op */ } }
    }

    function setImmediately(param, value, time = now()) {
      if (!param) return;
      try {
        param.cancelScheduledValues(time);
        param.setValueAtTime(value, time);
      } catch (_) { try { param.value = value; } catch (_) { /* no-op */ } }
    }

    function updateMuteButton() {
      if (!muteButton) return;
      try {
        // Keep the visual control minimal; state and action remain accessible.
        muteButton.textContent = '音';
        muteButton.setAttribute('aria-label', muted ? 'サウンドをオンにする' : 'サウンドをミュート');
        muteButton.setAttribute('aria-pressed', String(muted));
        muteButton.setAttribute('title', muted ? 'サウンドをオン' : 'サウンドをミュート');
      } catch (_) { /* tolerate simple test doubles */ }
    }

    function setMuted(value, event) {
      const next = !!value;
      if (next === muted) {
        if (!next && trusted(event)) ensureContext(event);
        return muted;
      }
      if (!next && trusted(event)) ensureContext(event);
      muted = next;
      if (muted) queuedCues = [];
      if (master) setParam(master.gain, muted || suppressed ? 0 : 0.42, now(), 0.018);
      syncAmbient();
      updateMuteButton();
      return muted;
    }

    function toggleMuted(event) {
      setMuted(!muted, event);
      return muted;
    }

    function enabled() {
      return !!context && context.state === 'running' && !muted && visible && !paused && !suppressed;
    }

    function mayPlayOrQueue() {
      return !!context && !muted && visible && !paused && !suppressed;
    }

    function ambienceWanted() {
      return !!context && phase === 'battle' && !muted && visible && !paused && !suppressed;
    }

    function makeAmbient() {
      if (!context || ambientGain || nodeCount() + 8 > MAX_NODES) return;
      try {
        ambientGain = managed(context.createGain());
        ambientGain.gain.value = 0;
        ambientDuckGain = managed(context.createGain());
        ambientDuckGain.gain.value = 1;
        ambientGain.connect(ambientDuckGain);
        ambientDuckGain.connect(master);
        ambientNodes.push(ambientGain, ambientDuckGain);
        // A quiet two-note fifth with no beat loop or external asset: a soft
        // room-tone bed, not another foreground melody.
        for (const [hz, amp] of [[55, 0.013], [82.41, 0.0075], [110, 0.0025]]) {
          const osc = managed(context.createOscillator());
          const level = managed(context.createGain());
          osc.type = 'sine';
          osc.frequency.value = hz;
          level.gain.value = amp;
          osc.connect(level); level.connect(ambientGain); osc.start();
          ambientNodes.push(osc, level);
        }
      } catch (_) {
        for (const n of ambientNodes) releaseNode(n);
        ambientNodes = [];
        ambientGain = null;
        ambientDuckGain = null;
      }
    }

    function syncAmbient() {
      if (!context) return;
      makeAmbient();
      if (!ambientGain) return;
      const wanted = ambienceWanted() && context.state === 'running';
      ambientLevel = wanted ? 1 : 0;
      setParam(ambientGain.gain, wanted ? 1 : 0, now(), wanted ? 0.65 : 0.18);
    }

    function unlockFromGesture(event) {
      const ok = ensureContext(event);
      if (ok) syncAmbient();
      return ok;
    }

    function duckAmbient(depth = 0.76, duration = 0.28) {
      if (!enabled() || !ambientDuckGain) return;
      const t = now();
      if (t - lastDuckAt < 0.045) return;
      lastDuckAt = t;
      try {
        const p = ambientDuckGain.gain;
        p.cancelScheduledValues(t);
        p.setValueAtTime(depth, t);
        p.linearRampToValueAtTime(1, t + duration);
      } catch (_) { /* absent automation is non-fatal */ }
    }

    function startVoice(duration) {
      if (!enabled() || voices.size >= MAX_VOICES || nodeCount() + 2 > MAX_NODES) return null;
      let bus;
      try {
        bus = managed(context.createGain());
        bus.gain.value = 0;
        bus.connect(master);
      } catch (_) { if (bus) releaseNode(bus); return null; }
      const voice = { bus, pending: 0, stopped: false, nodes: new Set() };
      voices.add(voice);
      const t = now() + 0.006;
      try {
        bus.gain.setValueAtTime(0.0001, t);
        bus.gain.linearRampToValueAtTime(0.9, t + 0.008);
        bus.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.025, duration));
      } catch (_) { bus.gain.value = 0.5; }
      return voice;
    }

    function endVoice(voice) {
      if (!voice || voice.stopped || voice.pending > 0) return;
      voice.stopped = true;
      for (const node of voice.nodes) releaseNode(node);
      releaseNode(voice.bus);
      voices.delete(voice);
    }

    function stopVoice(voice) {
      if (!voice || voice.stopped) return;
      voice.stopped = true;
      for (const node of voice.nodes) {
        try { node.stop(); } catch (_) { /* ended already */ }
        releaseNode(node);
      }
      releaseNode(voice.bus);
      voices.delete(voice);
    }

    function attachSource(voice, source, delay, duration, stopTail = 0.02, output = voice?.bus) {
      if (!voice || !source) return false;
      let counted = false;
      try {
        managed(source);
        voice.nodes.add(source);
        source.onended = () => {
          if (!counted) return;
          voice.pending--;
          releaseNode(source);
          voice.nodes.delete(source);
          endVoice(voice);
        };
        const at = now() + 0.008 + delay;
        source.connect(output);
        source.start(at);
        source.stop(at + duration + stopTail);
        voice.pending++;
        counted = true;
        return true;
      } catch (_) {
        if (counted) voice.pending--;
        try { source.stop(); } catch (_) { /* start may not have happened */ }
        releaseNode(source);
        voice.nodes.delete(source);
        endVoice(voice);
        return false;
      }
    }

    function addTone(voice, freq, duration, amplitude, type = 'triangle', delay = 0, bend = 0) {
      if (!voice || nodeCount() + 2 > MAX_NODES) return;
      let osc = null, level = null;
      try {
        osc = managed(context.createOscillator());
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now() + 0.008 + delay);
        if (bend) osc.frequency.linearRampToValueAtTime(bend, now() + 0.008 + delay + duration);
        // Keep partial levels independent but within the single voice envelope.
        level = managed(context.createGain());
        level.gain.value = amplitude;
        level.connect(voice.bus);
        // Track the intermediate level node and release it with the source.
        voice.nodes.add(level);
        if (!attachSource(voice, osc, delay, duration, 0.02, level)) {
          releaseNode(level); voice.nodes.delete(level);
        }
        else {
          const prior = osc.onended;
          osc.onended = () => { try { prior?.(); } finally { releaseNode(level); voice.nodes.delete(level); } };
        }
      } catch (_) {
        if (osc) { releaseNode(osc); voice.nodes.delete(osc); }
        if (level) { releaseNode(level); voice.nodes.delete(level); }
      }
    }

    function addNoise(voice, duration, amplitude, cutoff = 1400, delay = 0) {
      if (!voice || !noiseBuffer || nodeCount() + 3 > MAX_NODES) return;
      let source = null, filter = null, level = null;
      try {
        source = managed(context.createBufferSource());
        source.buffer = noiseBuffer;
        filter = managed(context.createBiquadFilter());
        filter.type = 'lowpass'; filter.frequency.value = cutoff;
        level = managed(context.createGain()); level.gain.value = amplitude;
        filter.connect(level); level.connect(voice.bus);
        voice.nodes.add(filter); voice.nodes.add(level);
        if (!attachSource(voice, source, delay, duration, 0.005, filter)) {
          releaseNode(filter); releaseNode(level); voice.nodes.delete(filter); voice.nodes.delete(level);
        } else {
          const prior = source.onended;
          source.onended = () => { try { prior?.(); } finally {
            releaseNode(filter); releaseNode(level); voice.nodes.delete(filter); voice.nodes.delete(level);
          } };
        }
      } catch (_) {
        for (const n of [source, filter, level]) if (n) { releaseNode(n); voice.nodes.delete(n); }
      }
    }

    function drainCueQueue() {
      if (!enabled()) { queuedCues = []; return; }
      const pending = queuedCues.splice(0);
      const t = wallNow();
      for (const cue of pending) {
        if (t - cue.queuedAt > 0.7) continue;
        if (cue.guard?.battleId && cue.guard.battleId !== currentBattle) continue;
        if (cue.guard?.phase && cue.guard.phase !== phase) continue;
        playCue(cue.kind, cue.intensity, cue.guard, true);
      }
    }

    function playCue(kind, intensity = 1, guard = null, fromQueue = false) {
      const special = { golem: 'heavy', storm: 'zap', bomb: 'blast', drake: 'metal' };
      if (special[kind]) {
        if (specialSfx) return playSpecialCue(kind, intensity);
        kind = special[kind]; // graceful fallback if the bank did not load
      }
      const specs = {
        select: { duration: 0.065, tones: [[620, 0.17, 0.024, 'triangle', 0, 455]], noise: [0.024, 0.18, 2200] },
        start:  { duration: 0.19, tones: [[146.8, 0.16, 0.025, 'triangle'], [220, 0.15, 0.012, 'sine', 0.035]], noise: [0.075, 0.13, 680] },
        hit:    { duration: 0.105, tones: [[96, 0.10, 0.028, 'triangle']], noise: [0.06, 0.26, 1250] },
        metal:  { duration: 0.09, tones: [[390, 0.075, 0.019, 'triangle', 0, 260]], noise: [0.045, 0.17, 2450] },
        magic:  { duration: 0.13, tones: [[440, 0.11, 0.018, 'sine', 0, 370], [660, 0.10, 0.008, 'sine', 0.018]], noise: [0.035, 0.06, 3400] },
        heavy:  { duration: 0.16, tones: [[72, 0.15, 0.034, 'triangle', 0, 54]], noise: [0.095, 0.30, 760] },
        blast:  { duration: 0.22, tones: [[58, 0.20, 0.04, 'sine', 0, 43], [117, 0.13, 0.013, 'triangle']], noise: [0.14, 0.34, 620] },
        zap:    { duration: 0.14, tones: [[740, 0.05, 0.011, 'sine'], [988, 0.045, 0.009, 'sine', 0.05], [587, 0.065, 0.007, 'triangle', 0.095]] },
        heal:   { duration: 0.30, tones: [[523.25, 0.25, 0.009, 'sine'], [659.25, 0.22, 0.007, 'sine', 0.045], [783.99, 0.19, 0.005, 'sine', 0.09]] },
        emerge: { duration: 0.12, tones: [[82, 0.11, 0.018, 'triangle', 0, 115]], noise: [0.06, 0.13, 520] },
        win:    { duration: 0.48, tones: [[392, 0.40, 0.012, 'sine'], [493.88, 0.38, 0.010, 'sine', 0.045], [587.33, 0.34, 0.009, 'sine', 0.09]] },
        loss:   { duration: 0.38, tones: [[392, 0.18, 0.010, 'sine', 0, 329.63], [293.66, 0.24, 0.009, 'sine', 0.12, 246.94]] },
        draw:   { duration: 0.25, tones: [[392, 0.20, 0.008, 'sine'], [392, 0.20, 0.006, 'sine', 0.07]] }
      };
      const spec = specs[kind];
      if (!spec || !mayPlayOrQueue()) return false;
      if (!enabled()) {
        if (!fromQueue && resumePending && queuedCues.length < 4) {
          queuedCues.push({ kind, intensity, guard, queuedAt: wallNow() });
          return true;
        }
        return false;
      }
      const volume = clamp(intensity, 0.48, 1);
      const voice = startVoice(spec.duration);
      if (!voice) return false;
      // Foreground sounds stay quiet under the ambient master bus.
      try { voice.bus.gain.setValueAtTime(0.0001, now() + 0.006); } catch (_) { /* fallback below */ }
      for (const [freq, dur, amp, type, delay, bend] of (spec.tones || []))
        addTone(voice, freq, dur, amp * volume, type, delay || 0, bend || 0);
      if (spec.noise) addNoise(voice, spec.noise[0], spec.noise[1] * volume, spec.noise[2], spec.noise[3] || 0);
      if (voice.pending === 0) endVoice(voice);
      return true;
    }

    function playSpecialCue(kind, intensity = 1) {
      if (!specialSfx || !enabled() || voices.size >= MAX_VOICES || nodeCount() + 2 > MAX_NODES) return false;
      let buffer;
      try { buffer = specialSfx.getBuffer(kind); } catch (_) { return false; }
      if (!buffer || !(buffer.duration > 0)) return false;
      const voice = startVoice(buffer.duration);
      if (!voice) return false;
      const t = now() + 0.008;
      const amplitude = ({ golem: 0.40, storm: 0.38, bomb: 0.36, drake: 0.37 })[kind] * clamp(intensity, 0.55, 1);
      try {
        voice.bus.gain.cancelScheduledValues(t);
        voice.bus.gain.setValueAtTime(amplitude, t);
      } catch (_) { voice.bus.gain.value = amplitude; }
      try {
        const source = managed(context.createBufferSource());
        source.buffer = buffer;
        if (!attachSource(voice, source, 0, buffer.duration, 0.02)) return false;
      } catch (_) { endVoice(voice); return false; }
      if (voice.pending === 0) endVoice(voice);
      duckAmbient(kind === 'bomb' ? 0.72 : 0.77, kind === 'bomb' ? 0.34 : 0.25);
      return true;
    }

    function playSelection(event) {
      if (trusted(event)) unlockFromGesture(event);
      if (!mayPlayOrQueue()) return false;
      const t = wallNow();
      if (t - selectionLastAt < 0.12) return false;
      selectionLastAt = t;
      return playCue('select', 0.8);
    }

    function beginBattle(battleId, event) {
      const key = keyOf(battleId);
      if (!key) return false;
      if (trusted(event)) unlockFromGesture(event);
      if (currentBattle === key) {
        if (finished.has(key)) return false;
        phase = 'battle'; syncAmbient();
        return false; // duplicate transition/reconnect: never replay the start cue
      }
      currentBattle = key;
      phase = 'battle'; paused = false;
      const isNew = remember(started, startedOrder, key, MAX_BATTLE_KEYS);
      syncAmbient();
      if (isNew) playCue('start', 1, { battleId: key, phase: 'battle' });
      return isNew;
    }

    function finishBattle(battleId, winner) {
      const key = keyOf(battleId);
      if (!key || key !== currentBattle || finished.has(key)) return false;
      remember(finished, finishedOrder, key, MAX_BATTLE_KEYS);
      phase = 'result';
      syncAmbient();
      // `winner` is a presentation result (0/1/null), not an input to combat.
      playCue(winner === null || winner === undefined ? 'draw' : 'win', 1, { battleId: key, phase: 'result' });
      return true;
    }

    function finishBattleForChoice(battleId, won) {
      const key = keyOf(battleId);
      if (!key || key !== currentBattle || finished.has(key)) return false;
      remember(finished, finishedOrder, key, MAX_BATTLE_KEYS);
      phase = 'result';
      syncAmbient();
      playCue(won === null || won === undefined ? 'draw' : (won ? 'win' : 'loss'), 1, { battleId: key, phase: 'result' });
      return true;
    }

    function hitCue(sourceKind) {
      const k = String(sourceKind || '').toLowerCase();
      if (k === 'cannon' || k === 'archer') return 'metal';
      if (k.includes('mage') || k === 'wraith' || k === 'healer') return 'magic';
      if (k === 'golem' || k === 'boar' || k === 'bombbug') return 'heavy';
      return 'hit';
    }

    function ingestCombatEvents(events, meta = {}) {
      const key = keyOf(meta.battleId || currentBattle);
      if (!key || key !== currentBattle || phase !== 'battle' || !enabled()) return 0;
      if (meta.tick !== undefined && meta.tick !== null) {
        const batchKey = key + ':' + String(meta.tick);
        if (!remember(batches, batchOrder, batchKey, MAX_BATCHES)) return 0;
      }
      let best = null;
      for (const event of events || []) {
        if (!event || typeof event.type !== 'string') continue;
        let candidate = null;
        switch (event.type) {
          case 'bomb_explode': candidate = { cue: 'bomb', rank: 8, source: event.sourceToken }; break;
          case 'charge_impact': candidate = { cue: 'heavy', rank: 7, source: event.sourceToken }; break;
          case 'golem_ground_contact': candidate = { cue: 'golem', rank: 6, source: event.sourceToken }; break;
          case 'chain_link':
            candidate = { cue: 'storm', rank: 5, source: event.sourceToken };
            break;
          case 'heal':
            if (Number(event.actualAmount) > 0) candidate = { cue: 'heal', rank: 4, source: event.sourceToken };
            break;
          case 'burrow_emerge': candidate = { cue: 'emerge', rank: 3, source: event.sourceToken }; break;
          case 'slow_applied': candidate = { cue: 'magic', rank: 2, source: event.sourceToken }; break;
          case 'resolved_hit':
            if (Number(event.amount) > 0) candidate = { cue: String(event.sourceKind || '').toLowerCase() === 'drake' ? 'drake' : hitCue(event.sourceKind), rank: 1, source: event.sourceToken, amount: Number(event.amount) };
            break;
        }
        if (candidate && (!best || candidate.rank > best.rank ||
            (candidate.rank === best.rank && (candidate.amount || 0) > (best.amount || 0)))) best = candidate;
      }
      if (!best) return 0;
      const t = now();
      const isSpecial = best.rank > 1;
      if (isSpecial) {
        if (t - lastSpecialAt < (best.cue === 'zap' ? 0.23 : 0.12)) return 0;
        lastSpecialAt = t;
      } else {
        if (t - lastHitAt < 0.12) return 0;
        lastHitAt = t;
      }
      if (best.cue === 'heal') {
        if (t - lastHealAt < 0.52) return 0;
        lastHealAt = t;
      }
      const strength = best.cue === 'blast' || best.cue === 'heavy' || best.cue === 'golem' || best.cue === 'bomb' ? 0.88 :
        best.cue === 'storm' ? 0.78 :
        best.cue === 'magic' || best.cue === 'heal' || best.cue === 'zap' ? 0.66 :
          clamp(0.55 + (best.amount || 1) / 45, 0.55, 0.86);
      return playCue(best.cue, strength, { battleId: key, phase: 'battle' }) ? 1 : 0;
    }

    function ingestReplayEffects(effects, meta = {}) {
      // The recorder stores short effects that were created only by resolved
      // simulation events. Reconstruct only cues with a clear event meaning.
      const mapped = [];
      const source = Array.isArray(effects) ? effects : [];
      for (const effect of source) {
        switch (effect?.kind) {
          case 'hit_spark': mapped.push({ type: 'resolved_hit', sourceKind: effect.sourceKind || effect.k || 'goblin', amount: 1 }); break;
          case 'charge_trail': mapped.push({ type: 'charge_impact' }); break;
          case 'bomb_explosion': mapped.push({ type: 'bomb_explode' }); break;
          case 'ground_slam': mapped.push({ type: 'golem_ground_contact' }); break;
          case 'chain_arc': mapped.push({ type: 'chain_link', index: 0 }); break;
          case 'frost_hit': mapped.push({ type: 'slow_applied' }); break;
          case 'burrow_emerge': mapped.push({ type: 'burrow_emerge' }); break;
          case 'magic_sparkle': mapped.push({ type: 'heal', actualAmount: 1 }); break;
        }
      }
      return ingestCombatEvents(mapped, meta);
    }

    function setPaused(value, event) {
      paused = !!value;
      if (paused) queuedCues = [];
      if (!paused && trusted(event)) unlockFromGesture(event);
      syncAmbient();
      if (context && paused) {
        resumeGeneration++; resumePending = false; resumePromise = null;
        try { context.suspend(); } catch (_) { /* some implementations omit suspend */ }
      }
      return paused;
    }

    function setPhase(next) {
      const allowed = ['idle', 'battle', 'result'];
      if (!allowed.includes(next)) return phase;
      phase = next;
      syncAmbient();
      return phase;
    }

    function setSuppressed(value) {
      suppressed = !!value;
      if (suppressed) queuedCues = [];
      if (suppressed) {
        // Deterministic replay construction must be fully silent, not merely
        // faded down; do not leave a quiet drone audible during the recording.
        setImmediately(master?.gain, 0);
        ambientLevel = 0;
        setImmediately(ambientGain?.gain, 0);
      } else {
        setParam(master?.gain, muted || suppressed ? 0 : 0.42, now(), 0.025);
        syncAmbient();
      }
      return suppressed;
    }

    function onVisibilityChange() {
      visible = !doc || doc.hidden !== true;
      if (!visible && context) {
        queuedCues = [];
        resumeGeneration++; resumePending = false; resumePromise = null;
        syncAmbient();
        try { context.suspend(); } catch (_) { /* safe when unavailable */ }
      } else if (visible) {
        // Do not resume from this non-gesture callback. The next genuine input
        // invokes unlockFromGesture and resumes if the browser suspended us.
        syncAmbient();
      }
    }

    function onMuteClick(event) { toggleMuted(event); }
    function destroy() {
      try { muteButton?.removeEventListener?.('click', onMuteClick); } catch (_) { /* no-op */ }
      try { doc?.removeEventListener?.('visibilitychange', onVisibilityChange); } catch (_) { /* no-op */ }
      disposeContext();
      phase = 'idle'; currentBattle = '';
    }

    if (muteButton?.addEventListener) muteButton.addEventListener('click', onMuteClick);
    if (doc?.addEventListener) doc.addEventListener('visibilitychange', onVisibilityChange);
    updateMuteButton();

    return Object.freeze({
      unlockFromGesture,
      playSelection,
      beginBattle,
      finishBattle,
      finishBattleForChoice,
      ingestCombatEvents,
      ingestReplayEffects,
      setPaused,
      setSuppressed,
      setPhase,
      setMuted,
      toggleMuted,
      destroy,
      get muted() { return muted; },
      get phase() { return phase; },
      get battleId() { return currentBattle; },
      get activeVoiceCount() { return voices.size; },
      get activeNodeCount() { return nodeCount(); },
      get unlocked() { return !!context; },
      get available() { return typeof Context === 'function'; },
      get ambientLevel() { return ambientLevel; }
    });
  }

  return { createBattleAudio, MAX_VOICES, MAX_NODES };
});
