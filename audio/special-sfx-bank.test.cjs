const assert = require('node:assert/strict');
const {
  CUES, DURATIONS, TARGET_PEAK, synthesizeOriginalSpecialSfx,
  createOriginalSpecialSfxBank
} = require('./special-sfx-bank.js');

function stats(samples) {
  let peak = 0, sum = 0, nonFinite = 0;
  for (const x of samples) {
    if (!Number.isFinite(x)) { nonFinite++; continue; }
    peak = Math.max(peak, Math.abs(x)); sum += x * x;
  }
  return { peak, rms: Math.sqrt(sum / samples.length), nonFinite };
}

function tailRms(samples, sampleRate, fromSeconds) {
  const start = Math.floor(fromSeconds * sampleRate);
  let sum = 0;
  for (let i = start; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length - start));
}

for (const cue of CUES) {
  const a = synthesizeOriginalSpecialSfx(cue, 48000);
  const b = synthesizeOriginalSpecialSfx(cue, 48000);
  assert.equal(a.length, Math.round(DURATIONS[cue] * 48000));
  assert.deepEqual(a, b, `${cue} must be deterministic`);
  const q = stats(a);
  assert.equal(q.nonFinite, 0, `${cue} must contain only finite samples`);
  assert.ok(q.peak >= TARGET_PEAK[cue] - 0.0001 && q.peak <= 0.83,
    `${cue} peak ${q.peak} should be deliberate and safely bounded`);
  assert.ok(q.rms > 0.012 && q.rms < 0.30, `${cue} RMS ${q.rms} outside safe/useful range`);
  assert.ok(tailRms(a, 48000, DURATIONS[cue] * 0.78) < q.rms * 0.8,
    `${cue} tail should resolve, not loop or drone`);
}

const cues = CUES.map(name => synthesizeOriginalSpecialSfx(name, 22050));
for (let i = 0; i < cues.length; i++) for (let j = i + 1; j < cues.length; j++) {
  const a = cues[i], b = cues[j], len = Math.min(a.length, b.length);
  let dot = 0, aa = 0, bb = 0;
  for (let k = 0; k < len; k++) { dot += a[k] * b[k]; aa += a[k] ** 2; bb += b[k] ** 2; }
  const corr = dot / Math.sqrt(aa * bb);
  assert.ok(corr < 0.8, `${CUES[i]}/${CUES[j]} are too similar (r=${corr})`);
}

// One PCM buffer per cue/context, created lazily after the audio context exists.
const context = {
  sampleRate: 44100, made: [],
  createBuffer(channels, length, rate) {
    const channel = new Float32Array(length);
    const buffer = { channels, length, sampleRate: rate, duration: length / rate,
      getChannelData(index) { assert.equal(index, 0); return channel; } };
    this.made.push(buffer); return buffer;
  }
};
const bank = createOriginalSpecialSfxBank(context);
assert.ok(bank);
assert.equal(context.made.length, 0, 'bank constructor performs no synthesis');
const first = bank.getBuffer('bomb');
assert.strictEqual(first, bank.getBuffer('bomb'));
assert.equal(context.made.length, 1);
assert.equal(first.sampleRate, 44100);
assert.ok(Math.abs(first.duration - DURATIONS.bomb) < 1 / first.sampleRate);
assert.ok(stats(first.getChannelData(0)).peak <= 0.83);
console.log('special SFX bank tests passed');
