#!/usr/bin/env python3
"""Patch only the final multiplayer room-result presentation; input/output paths required."""
from pathlib import Path
import sys

root=Path(__file__).resolve().parent
source=Path(sys.argv[1]).read_text()
if 'const MultiFinalResults=' in source:
    raise SystemExit('Final-results patch already applied')

def replace(old,new):
    global source
    assert source.count(old)==1, f'Expected one anchor: {old[:100]}'
    source=source.replace(old,new,1)

replace('/* waiting-room-lobby-20261108: entry and established room are distinct views. */',
        (root/'final-results.css').read_text()+'\n/* waiting-room-lobby-20261108: entry and established room are distinct views. */')
replace('      <div class="room-lobby-heading"><h3>参加者</h3><span id="roomLobbyCount"></span></div>',
        '      <section id="roomFinalResults" hidden aria-labelledby="roomFinalResultsTitle">\n'
        '        <h3 id="roomFinalResultsTitle">リザルト</h3>\n'
        '        <ol id="roomFinalResultsList" aria-label="最終順位"></ol>\n'
        '      </section>\n'
        '      <div id="roomLobbyHeading" class="room-lobby-heading"><h3>参加者</h3><span id="roomLobbyCount"></span></div>')
replace('function renderMultiRoomLobby(){', (root/'final-results.js').read_text()+'\nfunction renderMultiRoomLobby(){')
replace(" root.setAttribute('data-room-view',lobby?'lobby':'entry');entry.hidden=lobby;panel.hidden=!lobby;",
        " root.setAttribute('data-room-view',lobby?'lobby':'entry');entry.hidden=lobby;panel.hidden=!lobby;\n renderMultiFinalResults(joined?s:null);")
old=" if(q('#resultRanking')){const finals=multiSession?MoneyUI.rankedByBalance((multiSnapshot.wallets||[]).filter(p=>p.cashedOut===true&&p.cashoutAmount!==null)):[];q('#resultRanking').hidden=!finals.length;q('#resultRanking').textContent=finals.map(p=>(p.playerId===multiUser?'あなた':p.playerId)+' '+MoneyUI.balanceText(p.cashoutAmount)).join(' · ');}"
replace(old," if(q('#resultRanking')){q('#resultRanking').hidden=true;q('#resultRanking').textContent='';} // Final standings appear once, in the room lobby after everyone finishes.")
Path(sys.argv[2]).parent.mkdir(parents=True,exist_ok=True)
Path(sys.argv[2]).write_text(source)
print(sys.argv[2])
