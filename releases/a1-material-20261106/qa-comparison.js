/* Development-only visual QA fixture. Load after the game scripts in qa-entry
 * only. Never ship this file or reference it from the production entry.
 * Click the ordinary solo-start button before calling comparison(pair).
 * No eval, service/API communication, storage write or combat-type mutation.
 * The existing asset loader only loads the selected characters as usual.
 */
window.DocchiQa = Object.assign(window.DocchiQa || {}, {
  comparison(pair) {
    if (screenMode !== 'game' || multiSession) {
      throw new Error('QA fixture requires an open solo game. Click the solo-start button first.');
    }
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(kind => typeof kind !== 'string' || !CONTENT_ROSTER.selectable.includes(kind))) {
      throw new Error('comparison(pair) requires exactly two selectable species IDs.');
    }
    units = pair.map((k, side) => ({
      k, side, id: side + 1, token: 'qa-display:' + side,
      x: side ? 360 : 120, y: 269, hp: TYPES[k].hp, cd: 0,
      priority: .1 + side * .1, dead: false, originForward: side ? -1 : 1
    }));
    initialUnits = units.map(unit => ({...unit}));
    initialKinds = pair.map(kind => [kind]);
    shots = [];
    pendingSummons = [];
    combatEvents = [];
    elapsed = 0;
    winner = null;
    state = 'choose';
    selectedSide = 1;
    beginLicensedOpening(units);
    update();
    fillUnitStats();
    drawArmyPreviews();
    return {
      pair: pair.slice(),
      facts: pair.map(kind => ({kind, ...buildUnitComparisonFacts(TYPES[kind])})),
      assets: assetProgress()
    };
  }
});
