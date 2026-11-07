"""Restore the user's compact A1 header and in-art home audio placement.

Presentation and existing utility availability are restored without changing
combat, wallet, room deadlines, sender identity, or round validation.
Call patch(source) when composing the complete regression repair.
"""


def patch(s):
    if '/* reference-layout-restoration-20261107 */' in s:
        return s

    def edit(old, new):
        nonlocal s
        assert s.count(old) == 1, ('layout anchor', old[:100], s.count(old))
        s = s.replace(old, new, 1)

    edit(
        " const destination=document.querySelector(mode==='game'?'#gameTopline':'#menuAudioDock');\n if(menuDock)menuDock.hidden=mode==='game';",
        " const destination=document.querySelector(mode==='game'?'#gameTopline':mode==='home'?'#homeScreen':'#menuAudioDock');\n if(menuDock)menuDock.hidden=mode!=='room';",
    )
    edit(" if(next==='game')drawArmyPreviews();", " if(next==='game'){drawArmyPreviews();syncFlowControls();syncReactions();}")
    edit(
        '<p id="fieldStatus" class="field-status">地図未定</p>',
        '<p id="fieldStatus" class="field-status" tabindex="0" role="region" aria-label="地形と効果">地図未定</p>',
    )
    feedback = '          <div id="reaction-feedback" class="reaction-feedback" aria-live="polite" aria-atomic="true" hidden></div>\n'
    edit(feedback, '')
    edit('        <span id="battleChoice"', feedback + '        <span id="battleChoice"')
    edit(
        " return screenMode==='game'&&(state==='fight'||state==='result')&&!multiRecording&&!multiBusy;",
        " return screenMode==='game'&&['choose','fight','result'].includes(state)&&(!multiSession||state!=='choose'||multiSnapshot?.phase==='predict')&&!multiRecording&&!multiBusy;",
    )
    edit(
        " return flowControlsAvailable()&&(!multiSession||(state==='result'?['settle','result'].includes(s?.phase):s?.phase==='battle'&&!!multiPlayback));",
        " return flowControlsAvailable()&&(!multiSession||(state==='choose'?s?.phase==='predict':state==='result'?['settle','result'].includes(s?.phase):s?.phase==='battle'&&!!multiPlayback));",
    )
    edit("const isMulti=!!multiSession,isMenu=isMulti||state==='result';", "const isMulti=!!multiSession,isMenu=isMulti||state!=='fight';")
    edit(
        "(state==='result'?['settle','result'].includes(multiSnapshot?.phase):!!multiPlayback&&multiSnapshot?.phase==='battle')",
        "(state==='choose'?multiSnapshot?.phase==='predict':state==='result'?['settle','result'].includes(multiSnapshot?.phase):!!multiPlayback&&multiSnapshot?.phase==='battle')",
    )
    edit("context.phase === 'battle' && validRound(context.roundId) && !!memberIds(context);", "['predict', 'battle', 'settle', 'result'].includes(context.phase) && validRound(context.roundId) && !!memberIds(context);")

    # A later terrain-inline block had overridden the requested horizontal band.
    # Replace that block, rather than rolling back an older release or its logic.
    start = s.index('/* terrain-inline-20261106:')
    end = s.index('/* gold-full-amount-20261106:', start)
    s = s[:start] + '''/* reference-layout-restoration-20261107 */
/* A1 reference: terrain/effect, round, coin amount, then the final audio slot.
   One compact row. Exact long text remains horizontally scrollable in its slot. */
#app #gameScreen > #gameTopline.game-topline {
  grid-template-columns:minmax(0,1fr) max-content minmax(88px,1fr) 44px;
  grid-template-rows:44px;
  column-gap:6px;
  row-gap:0;
  align-items:center;
}
#app #gameScreen > #gameTopline #status {
  grid-column:2; grid-row:1; align-self:center;
}
#app #gameScreen > #gameTopline .wallet-pill {
  grid-column:3; grid-row:1; align-self:center; margin-block-start:0;
}
#app #gameScreen > #gameTopline > #soundToggle {
  grid-column:4; grid-row:1; align-self:center;
}
#app #gameScreen > #gameTopline #fieldStatus {
  grid-column:1; grid-row:1; align-self:center;
  display:block; width:100%; min-width:0; height:20px; max-height:20px;
  margin:0; padding:0; border:0;
  color:#f5e9ce; background:none; box-shadow:none; text-shadow:none;
  font-size:13px; font-weight:500; line-height:20px; letter-spacing:0;
  text-align:left; white-space:nowrap; overflow-wrap:normal;
  overflow-x:auto; overflow-y:hidden; scrollbar-width:none;
  touch-action:pan-x pinch-zoom;
}
/* The same compact utility area remains in prediction, battle and result.
   Keep all 44px controls and put prediction/clock in their own text column. */
#app #gameScreen > #gameToolbar {
  grid-template-columns:32px minmax(0,1fr) 44px 44px 44px;
  grid-template-rows:20px 20px;
  column-gap:4px; row-gap:4px;
  flex:0 0 44px; min-height:44px; height:44px;
  margin:0; padding:0 8px;
  background:none; border:0; outline:none; box-shadow:none;
}
#app #gameScreen > #gameToolbar > #battleChoice {
  grid-column:2; grid-row:1; justify-self:start; align-self:center;
  max-width:100%; width:max-content; overflow-x:auto;
}
#app #gameScreen > #gameToolbar > #battleClock {
  grid-column:2; grid-row:2; justify-self:start; align-self:center;
  max-width:100%; overflow-x:auto; text-align:left;
}
#app #gameScreen > #gameToolbar > #unitsToggle { grid-column:3; grid-row:1 / 3; }
#app #gameScreen > #gameToolbar > #reactionToggle { grid-column:4; grid-row:1 / 3; }
#app #gameScreen > #gameToolbar > #pause { grid-column:5; grid-row:1 / 3; }
#app #gameScreen > #gameToolbar > #reaction-feedback {
  position:static; inset:auto; grid-column:1; grid-row:1 / 3;
  width:32px; height:32px; align-self:center; justify-self:center;
  margin:0; padding:0; font-size:28px; line-height:1; pointer-events:none;
}
/* Solo reactions now use that existing utility space, not an empty extra row.
   The multiplayer portrait rail keeps its existing scrolling and dimensions. */
#app #gameScreen > #participantRailWrap[data-solo="true"] {
  display:none !important;
}
#app #gameScreen[data-personal-result="true"] #resultPanel,
#app #gameScreen[data-personal-result="true"][data-reaction-strip="solo"] #resultPanel {
  max-height:min(68%,calc(100% - 126px));
}
#app #gameScreen[data-personal-result="true"][data-participants="true"] #resultPanel {
  max-height:min(68%,calc(100% - 170px));
}
/* Home audio lives with the artwork beneath the two existing actions.
   Room mode retains the original dock; game mode retains upper-right audio. */
#app #homeScreen > #soundToggle {
  justify-self:center;
  margin:8px 0 0;
  padding:0;
  display:grid;
  place-items:center;
  color:#f4e6c7;
  background:#4d3927;
  border:1px solid #a88754;
  border-radius:3px;
  font-size:0;
}

''' + s[end:]
    edit(
        '/* gold-full-amount-20261106: use the free upper-row space for exact amounts.\n'
        '   The terrain still spans the same two columns. Keep the readable26px face,\n'
        '   and expose the existing scrollbar only when a genuinely long value needs it. */\n'
        '#app #gameScreen > #gameTopline.game-topline {\n'
        '  grid-template-columns:max-content minmax(0,1fr) 44px;\n'
        '}\n',
        '/* Exact gold keeps its readable26px face and an overflow scrollbar.\n'
        '   Do not override the four-column reference header above. */\n',
    )
    return s


if __name__ == '__main__':
    import sys
    from pathlib import Path
    assert len(sys.argv) == 3, 'Usage: patch-layout.py INPUT OUTPUT (distinct paths)'
    source, target = map(Path, sys.argv[1:])
    assert source.resolve() != target.resolve(), 'Write to a distinct candidate path'
    assert not target.exists(), 'Refuse to overwrite an existing candidate'
    target.write_text(patch(source.read_text()))
