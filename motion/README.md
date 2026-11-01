# v9 battle motion module (presentation-only)

`motion-ui.js` is zero-dependency and does not touch game state, RNG, physics, timer, wallet, or ledger. It reacts only to explicit caller events and animates existing DOM nodes with WAAPI. If `Element.animate` is absent, the page is hidden, or reduced motion is requested, calls are harmless no-ops. The caller should also invoke `cancel()` when entering Home, pause/units overlays, or formation preview; the module automatically cancels on tab hide and when reduced motion becomes active.

## Integration

Load the file after the page's existing scripts, then create one instance:

```js
const motion = createBattleMotion({ document });
```

Call after the corresponding render/state update so the referenced element is visible and `aria-pressed` is current:

```js
motion.enterPrediction(sessionId + ':' + round); // once when draft/comparison opens
motion.selectSide('red');                        // after #red aria-pressed becomes true
motion.startBattle(sessionId + ':' + round);     // after #field becomes visible (solo after #confirm; multiplayer when playback begins)
motion.showResult(sessionId + ':' + round, { delta: ledgerDelta }); // after #resultPanel is visible and text is final
motion.cancel();                                  // preview, pause/units, home, hidden panels
motion.destroy();                                 // teardown only
```

`selectSide` accepts `red`/`blue`, `left`/`right`, `A`/`B`, or `0`/`1`. `key` should be stable per round (`sessionId:roundId`). Repeated keys are deduped. Changing round key cancels any earlier transition. Result numbers are intentionally not rewritten or counted: the ledger and visible accounting remain authoritative; the result title receives a short stamp and the already-rendered breakdown a subtle 150ms reveal.

## Motion budget

- Draft cards: 170ms each, 50ms stagger (220ms total).
- Check selection: 120ms; animates existing `::after` checkmark when supported, otherwise a tiny card pop.
- Battle field entrance: 160ms.
- Result title: 170ms; breakdown: 150ms + 35ms delay.
- No particles, blur, glow, timers, or input-blocking overlays.
