"""Requested header/control layout only. Compose after patch-controls.py."""
CSS = '''
/* requested-header-balance-20261107 */
/* Equal flexible tracks separate the rendered terrain, round and wallet.
   Long terrain/gold stay independently scrollable, never ellipsized. */
#app #gameScreen > #gameTopline.game-topline {
  grid-template-columns:minmax(0,max-content) minmax(8px,1fr) max-content minmax(8px,1fr) max-content;
  column-gap:0;
}
#app #gameScreen > #gameTopline #fieldStatus {
  grid-column:1;
  width:max-content; max-width:100%;
  color:#f5e9ce;
}
#app #gameScreen > #gameTopline #status {
  grid-column:3; justify-self:center;
  font-weight:700;
}
#app #gameScreen > #gameTopline .wallet-pill {
  grid-column:5; justify-self:end;
  width:max-content; max-width:min(36vw,160px);
}
#app #gameScreen > #gameTopline #fieldStatus[data-field="grassland"] { color:#c4e69a; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="shallow_ford"] { color:#a9dcf5; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="crosswind_ridge"] { color:#b9e6dc; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="desert"] { color:#f4d28b; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="icefield"] { color:#c4e9ff; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="highland"] { color:#d2dcaa; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="rockfield"] { color:#dccbb4; }
#app #gameScreen > #gameTopline #fieldStatus[data-field="volcano"] { color:#ffb3a0; }
#app #gameScreen > #gameToolbar > #unitsToggle { display:none !important; }
#app #gameScreen > #gameToolbar > #reactionToggle { grid-column:3; grid-row:1 / 3; }
#app #gameScreen > #gameToolbar > #soundToggle { grid-column:4; grid-row:1 / 3; align-self:center; }
/* Prediction aligns with the terrain edge and the utility buttons' center.
   Reserve only the transient feedback's own space; multiplayer rail is unchanged. */
#app #gameScreen[data-phase="choose"] > #gameToolbar > #battleChoice {
  grid-column:1 / 3; grid-row:1 / 3; align-self:center;
  max-width:calc(100% - 36px);
}
#app #gameScreen[data-phase="choose"] > #gameToolbar > #reaction-feedback {
  grid-column:2; justify-self:end;
}

'''

def patch(s):
    if '/* requested-header-balance-20261107 */' in s:
        return s
    assert s.count('</style>') == 1
    return s.replace('</style>', CSS + '\n</style>', 1)

if __name__ == '__main__':
    import sys
    from pathlib import Path
    src,dst=map(Path,sys.argv[1:])
    assert src.resolve()!=dst.resolve()
    dst.write_text(patch(src.read_text()))
