# Enhanced original special-attack SFX candidate

Independent drop-in candidate for `gravity_v10_candidate`. It is not copied into or published with the shared build. All sound is synthesized from deterministic DSP code; there are no third-party samples, network requests, or audio dependencies.

## Included

- `battle-audio.js` — v10 audio module plus special-hit dispatch, ambience ducking, four original PCM voice designs, and the same trusted-gesture/mute/visibility/pause/recording gates, 6-voice cap, 48-node cap, and per-tick battle-key dedupe.
- `battle-audio.patch` — reviewable unified diff against the current v10 `audio/battle-audio.js` baseline (no shared file modified).
- `special-sfx-bank.js` — deterministic mono sample synthesis and lazy per-AudioContext `AudioBuffer` caching.
- `battle-audio.test.cjs` — fake-Web-Audio integration coverage, including one cue from actual special event records, replay dedupe, voice/node cap, ducking, and gesture/mute/pause gates.
- `special-sfx-bank.test.cjs` — deterministic PCM, distinctness, finite samples, peak/RMS, short tail, and lazy buffer cache checks.
- `generate-preview.cjs` plus `special-sfx-preview.wav` and individual `*-special-sfx.wav` clips.
- `waveform-qa.json` — numeric sample report.

## Cue/event contract

All cues trigger at the actual resolved simulation event, not at the art animation's approximate frame number. There is no speculative windup sound because the combat API does not emit a windup event.

| Event | Cue | Texture / duration |
|---|---|---|
| `golem_ground_contact` | `golem` | Low rounded stone impact, inharmonic rock body, brief grit/debris tail (~480 ms). |
| `chain_link` | `storm` | Narrow crack + three short electric arcs + fast fizz (~340 ms). All real links in the same fixed tick coalesce into one accent; subsequent ticks are separately rate-limited. |
| `bomb_explode` | `bomb` | Controlled low core, short crack, dusty/rumble tail (~560 ms); not a loud cinematic boom. |
| `resolved_hit` where `sourceKind === 'drake'` | `drake` | Wing/body rush into a dry scaled strike (~360 ms); no invented fire/breath cue. |

The engine's normal resolved hits retain their current cues. Golem contact outranks its same-tick ordinary resolved-hit notification; bomb and storm records likewise use one accent per tick. The ambience duck is a short independent gain envelope, so ordinary ambience and user mute are preserved.

Guest replay FX currently carry compact kind/tick metadata. Golem, storm, and bomb FX have unambiguous event-derived kinds. A generic `hit_spark` does not prove that its source was a drake; the enhanced adapter accepts `sourceKind`/`k` if replay payloads ever carry it, but it does **not** guess a drake sound from a generic spark. Host/live battle records do carry `resolved_hit.sourceKind`.

## Mix / waveform QA

Each rendered PCM clip is peak-limited to about -3.6 to -4.7 dBFS before the module's per-cue gain and existing master gain (0.42). Typical event strengths and cue gains yield an expected in-game peak of roughly -20.2 to -22.8 dBFS. The bomb has the lowest cue gain (0.36), a 560 ms tail, and no continuous loop; ambient duck depth is 0.72 for its 340 ms tail. `waveform-qa.json` records both raw PCM and expected in-game peak estimates.

`special-sfx-preview.wav` is a 3.39-second, 48 kHz mono PCM-16 source-level montage with 550 ms gaps between the four clips. It is intentionally the dry, audible preview source; in-game cue/master gain is lower as reported above. Separate source-level WAVs are also provided. Waveform tests confirm finite samples, hard-bounded peaks, short decay tails, and distinct deterministic timbres. **The preview has not been audibly auditioned**, so these metrics are not a substitute for listening QA on desktop and mobile.

## Integration

Load `special-sfx-bank.js` before this candidate's `battle-audio.js` in the standalone build. Replace only the audio module in a separate candidate copy; do not alter physics, economy, RNG, live event timing, or the existing mute control. The drop-in `createBattleAudio(...)` API is unchanged. Run:

```sh
node battle-audio.test.cjs
node special-sfx-bank.test.cjs
node generate-preview.cjs
```

No deployment or publication is authorized by this candidate.
