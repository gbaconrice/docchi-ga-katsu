/* Deterministic, original PCM one-shots for special monster attacks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.createOriginalSpecialSfxBank = api.createOriginalSpecialSfxBank;
  if (root) root.synthesizeOriginalSpecialSfx = api.synthesizeOriginalSpecialSfx;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CUES = Object.freeze(['golem', 'storm', 'bomb', 'drake']);
  const DURATIONS = Object.freeze({ golem: 0.48, storm: 0.34, bomb: 0.56, drake: 0.36 });
  const TARGET_PEAK = Object.freeze({ golem: 0.66, storm: 0.58, bomb: 0.64, drake: 0.60 });
  const bufferCache = new WeakMap();

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function envelope(t, attack, decay, hold = 0) {
    if (t < 0) return 0;
    const a = attack <= 0 ? 1 : smooth(t / attack);
    return a * Math.exp(-Math.max(0, t - hold) * decay);
  }
  function xorshift32(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) / 2147483648) - 1;
    };
  }
  function makeNoise(length, seed) {
    const next = xorshift32(seed), out = new Float32Array(length);
    for (let i = 0; i < length; i++) out[i] = next();
    return out;
  }
  function lowpass(input, sampleRate, cutoff) {
    const out = new Float32Array(input.length);
    const alpha = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, sampleRate * 0.45) / sampleRate);
    let y = 0;
    for (let i = 0; i < input.length; i++) { y += alpha * (input[i] - y); out[i] = y; }
    return out;
  }
  function bandpass(input, sampleRate, low, high) {
    const lo = lowpass(input, sampleRate, low);
    const hi = lowpass(input, sampleRate, high);
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = hi[i] - lo[i];
    return out;
  }
  function addTone(out, sampleRate, { start = 0, duration, f0, f1 = f0, gain = 0.1, shape = 'sine', attack = 0.002, decay = 12, hold = 0 }) {
    const begin = Math.max(0, Math.floor(start * sampleRate));
    const end = Math.min(out.length, Math.ceil((start + duration) * sampleRate));
    let phase = 0;
    for (let i = begin; i < end; i++) {
      const local = i / sampleRate - start;
      const p = clamp(local / Math.max(0.001, duration), 0, 1);
      const freq = f1 + (f0 - f1) * Math.exp(-5.4 * p);
      phase += 2 * Math.PI * freq / sampleRate;
      const fundamental = Math.sin(phase);
      const wave = shape === 'triangle' ? (2 / Math.PI) * Math.asin(fundamental) : fundamental;
      out[i] += wave * gain * envelope(local, attack, decay, hold);
    }
  }
  function addNoise(out, sampleRate, seed, { start = 0, duration, gain = 0.1, low = 150, high = 4200, attack = 0.002, decay = 16, hold = 0, tilt = 0 }) {
    const begin = Math.max(0, Math.floor(start * sampleRate));
    const end = Math.min(out.length, Math.ceil((start + duration) * sampleRate));
    const noise = makeNoise(end - begin, seed);
    const shaped = bandpass(noise, sampleRate, low, high);
    for (let i = begin; i < end; i++) {
      const local = i / sampleRate - start;
      const brightness = 1 + tilt * (local / duration - 0.5);
      out[i] += shaped[i - begin] * gain * envelope(local, attack, decay, hold) * brightness;
    }
  }

  function synthesizeOriginalSpecialSfx(name, sampleRate = 48000) {
    if (!CUES.includes(name)) throw new RangeError('unknown-special-sfx');
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new RangeError('invalid-sample-rate');
    const length = Math.round(DURATIONS[name] * sampleRate);
    const out = new Float32Array(length);

    if (name === 'golem') {
      // Inharmonic stone body + a low, rounded impact + short grit/debris tail.
      addTone(out, sampleRate, { duration: 0.20, f0: 132, f1: 48, gain: 0.31, attack: 0.0015, decay: 14, shape: 'triangle' });
      addTone(out, sampleRate, { start: 0.015, duration: 0.29, f0: 176, f1: 126, gain: 0.12, attack: 0.002, decay: 10.5, shape: 'sine' });
      addTone(out, sampleRate, { start: 0.008, duration: 0.35, f0: 263, f1: 211, gain: 0.055, attack: 0.004, decay: 9.2, shape: 'sine' });
      addNoise(out, sampleRate, 0x71a03, { duration: 0.21, gain: 0.29, low: 260, high: 3400, attack: 0.001, decay: 17, tilt: -0.18 });
      addNoise(out, sampleRate, 0x4d218, { start: 0.035, duration: 0.37, gain: 0.105, low: 130, high: 1050, attack: 0.008, decay: 8.8, tilt: -0.2 });
      for (const [start, f] of [[0.052, 111], [0.117, 82], [0.205, 68]])
        addTone(out, sampleRate, { start, duration: 0.035, f0: f, f1: f * 0.72, gain: 0.10, attack: 0.0008, decay: 54 });
    } else if (name === 'storm') {
      // One coalesced chain accent. Tiny arcs are inside the clip; callers still
      // trigger only once per simulation tick from actual chain_link records.
      addTone(out, sampleRate, { duration: 0.15, f0: 154, f1: 74, gain: 0.13, attack: 0.001, decay: 20 });
      for (const [start, f0, f1, gain] of [[0.000, 2450, 910, 0.20], [0.045, 1820, 690, 0.14], [0.094, 1310, 540, 0.095]])
        addTone(out, sampleRate, { start, duration: 0.052, f0, f1, gain, attack: 0.0005, decay: 55 });
      addNoise(out, sampleRate, 0x8a5c1, { duration: 0.075, gain: 0.24, low: 720, high: 7400, attack: 0.0007, decay: 45 });
      addNoise(out, sampleRate, 0x9bd77, { start: 0.03, duration: 0.29, gain: 0.105, low: 850, high: 5600, attack: 0.002, decay: 12, tilt: 0.18 });
    } else if (name === 'bomb') {
      // One contained core boom with low-frequency body, crunchy crack and dust.
      addTone(out, sampleRate, { duration: 0.26, f0: 104, f1: 39, gain: 0.38, attack: 0.0012, decay: 10, shape: 'triangle' });
      addTone(out, sampleRate, { start: 0.028, duration: 0.31, f0: 69, f1: 47, gain: 0.18, attack: 0.002, decay: 6.7, shape: 'sine' });
      addNoise(out, sampleRate, 0xb0b614, { duration: 0.095, gain: 0.36, low: 340, high: 5200, attack: 0.0007, decay: 26, tilt: 0.22 });
      addNoise(out, sampleRate, 0x27fc19, { duration: 0.52, gain: 0.15, low: 65, high: 680, attack: 0.006, decay: 5.6, tilt: -0.3 });
      addNoise(out, sampleRate, 0xbad021, { start: 0.045, duration: 0.34, gain: 0.13, low: 1150, high: 7000, attack: 0.002, decay: 10, tilt: -0.08 });
      addTone(out, sampleRate, { start: 0.082, duration: 0.12, f0: 56, f1: 42, gain: 0.14, attack: 0.001, decay: 17, shape: 'triangle' });
    } else if (name === 'drake') {
      // Wing/scale rush into a dry talon/bite impact; deliberately no flame cue.
      addNoise(out, sampleRate, 0xd4a6e, { duration: 0.22, gain: 0.24, low: 350, high: 3100, attack: 0.072, decay: 12, hold: 0.06, tilt: -0.12 });
      addTone(out, sampleRate, { duration: 0.16, f0: 119, f1: 64, gain: 0.22, attack: 0.002, decay: 15, shape: 'triangle' });
      addNoise(out, sampleRate, 0xd8a4e, { start: 0.006, duration: 0.115, gain: 0.21, low: 1250, high: 5800, attack: 0.001, decay: 30 });
      addTone(out, sampleRate, { start: 0.018, duration: 0.17, f0: 520, f1: 205, gain: 0.072, attack: 0.001, decay: 20 });
      addNoise(out, sampleRate, 0x3d2e1, { start: 0.065, duration: 0.24, gain: 0.09, low: 240, high: 1500, attack: 0.004, decay: 10, tilt: -0.16 });
    }

    let peak = 0;
    for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (!(peak > 0)) return out;
    const scale = TARGET_PEAK[name] / peak;
    for (let i = 0; i < out.length; i++) {
      // Soft knee only catches summed partial overs; rendered peaks stay bounded.
      const x = out[i] * scale;
      out[i] = Math.abs(x) < 0.72 ? x : Math.sign(x) * (0.72 + 0.10 * Math.tanh((Math.abs(x) - 0.72) / 0.10));
    }
    return out;
  }

  function createOriginalSpecialSfxBank(context) {
    if (!context || typeof context.createBuffer !== 'function') return null;
    let cache = bufferCache.get(context);
    if (!cache) { cache = new Map(); bufferCache.set(context, cache); }
    function getBuffer(name) {
      if (!CUES.includes(name)) return null;
      if (!cache.has(name)) {
        const rate = clamp(Math.round(context.sampleRate || 44100), 22050, 96000);
        const samples = synthesizeOriginalSpecialSfx(name, rate);
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.getChannelData(0).set(samples);
        cache.set(name, buffer);
      }
      return cache.get(name);
    }
    return Object.freeze({ getBuffer, names: CUES });
  }

  return { CUES, DURATIONS, TARGET_PEAK, synthesizeOriginalSpecialSfx, createOriginalSpecialSfxBank };
});
