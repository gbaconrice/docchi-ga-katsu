# Battle audio module

An original, dependency-free Web Audio module for the browser prediction autobattler. It synthesizes all cues at runtime; there are no sample files, network requests, paid sources, or imported assets. The module does not write to combat state, wallet state, `Math.random`, or the seeded simulation RNG.

## Integration contract

Include `battle-audio.js` in the standalone build before UI hooks, then construct one instance after the page DOM exists:

```js
const battleAudio = createBattleAudio({
  muteButton: document.querySelector('#soundToggle')
});
```

The UI owner should add only one compact mute button (`#soundToggle`). The module keeps its visible label at the minimal `音` and updates accessible `aria-label` / `aria-pressed` state. If there is no `AudioContext`/`webkitAudioContext`, the button remains harmless and gameplay continues silently.

Important: call `unlockFromGesture(event)` or the gesture-taking APIs below *synchronously inside a trusted user input handler*. No context or audio node is created during page load. A synthetic event, timer, websocket callback, animation frame, or page visibility event cannot unlock audio.

### Suggested call sites

- Accepted army-card draft selection only: `playSelection(event)` (selection is a soft, double-tap-gated tick). Pass the original trusted click event through the valid-action handler; do not play for rejected/duplicate submissions.
- Once on actual live battle start: `beginBattle(battleKey, event?)`. `battleKey` must be stable for one canonical battle, e.g. `local-session-uuid:round` or `room-id:round`. A duplicate start/reconnect for the same key is silent.
- Immediately after the effect adapter consumes a *live* simulation tick: `ingestCombatEvents(combatEvents, { battleId: battleKey, tick: simTick })`. Feed only resolved combat event batches. It chooses at most one cue per tick, prefers actual special impacts, rate-limits ordinary hits, and deduplicates re-sent ticks. Projectile launch alone does not sound as a hit.
- If a guest is rendering canonical replay FX (not running combat), use `ingestReplayEffects(frame.effects, { battleId: battleKey, tick })`. This maps only replay effect kinds that originate in resolved events. Do not also feed the host's live combat events into the same playback.
- Once on the actual result transition, call `finishBattleForChoice(battleKey, true|false|null)`. `true` gives a gentle ascending chord, `false` a soft descending cadence, and `null` a neutral draw cue. Use `finishBattle(battleKey, winnerSideOrNull)` only when the screen is celebrating which side won rather than a player's prediction. Calling either again for the same key does nothing; do not call from every render/snapshot.
- On pause/resume, call `setPaused(true)` / `setPaused(false, event)`; on hidden documents the module suspends context and never resumes until a later real user gesture.
- Wrap deterministic replay/recording work such as v9 `multiRecording` with `setSuppressed(true)` / `setSuppressed(false)` in `try/finally`. This forcibly silences both cues and ambience during canonical replay generation. Also ensure the live event consumer is not called during that recording path.
- `setPhase('idle'|'result')` can fade the ambience; use `finishBattle...` for the one-shot result cue. `destroy()` disconnects and closes all managed nodes.

Keep the key stable across reconnects so a replayed snapshot cannot repeat the opening/result sound. Never call `beginBattle` or `finishBattle...` with only a round number shared across separate runs; include a session/room ID. The module retains a bounded recent-key window sized beyond the 20-round match.

## Sound design

- A restrained, non-rhythmic low sine fifth quietly fades in during a live battle and out at result/pause/mute. It is a synthesized room-tone bed, not a loud looping track.
- Selection and start use short rounded percussion plus a small tonal lift.
- Resolved hits have a low, filtered impact; archers/cannon have a lighter metallic edge; mages/wraiths a small glassy tone; boar/golem impacts are deeper. Charge, bomb blast, chain lightning, successful heal/slow and burrow emerge have distinct, quieter accents.
- Hit clustering is deliberately sparse: one cue per simulation tick at most, ordinary hits at most roughly eight per second, heal chimes no more than every 0.52 seconds, and only the first link of each chain. Six simultaneous voices and 48 managed nodes are hard caps.
- Win/loss/draw sounds are a one-time result cadence, not a repeated coin/reward sound.

## Verification

Run `node battle-audio.test.cjs` from this directory. The harness uses a fake Web Audio implementation to check gesture gating, no-API fallback, sound routing, duplicate/replayed ticks and results, mute accessibility, pause/visibility/suppression, ambience, and caps. This is deterministic API QA; it does not substitute for a listening test on actual mobile devices.
