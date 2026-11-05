// Run only on the local candidate after opening the solo comparison screen.
// It replaces a preview in memory; reload to restore normal play. Never run on a live room.
(function () {
  if (multiSession) throw new Error('Use a fresh local solo preview, not a multiplayer room.');
  if (screenMode !== 'game' || state !== 'choose') throw new Error('Open the solo comparison screen first.');
  const groups = [
    ['crimson_mender', 'shield', 'gauntlet_combo_guard'],
    ['siege_crab', 'frostmage', 'bone_crown_lich']
  ];
  const template = units[0];
  units = groups.flatMap((kinds,side) => kinds.map((k,i) => ({...template, id:100+side*10+i, k, side, dead:false, hp:TYPES[k].hp, x:side?700:100, y:120+i*100})));
  initialUnits = units.map(u => ({...u}));
  initialKinds = groups;
  selectedSide = null;
  fillUnitStats();
  drawArmyPreviews();
  update();
  return 'Preview fixture: healing, defense, combo, high HP/damage/range, control, summon. Reload afterward.';
})();
