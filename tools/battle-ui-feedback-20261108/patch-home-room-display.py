"""Apply only the requested home background, room status and room audio changes."""
import re

CSS = r'''
/* requested-home-room-display-20261108 */
/* The existing home painting fills the same app surface as the room backdrop.
   Content retains its existing width and OS/Gravity safe-area padding. */
#app:has(#homeScreen:not([hidden])) { position:relative; }
#app #homeScreen.home-screen { position:static; isolation:auto; background-image:none; }
/* The shared sound button is still moved back to the in-game toolbar. */
#app > #menuAudioDock { display:none !important; }
/* No empty status panel for routine connection/preparation notices. Errors,
   score retry, room decisions and exit remain in the existing panel. */
#app > #multiStatusRow:not(:has(#multiSummary:not(:empty), #roomStatus:not(:empty), #roomScoreStatus:not([hidden]):not(:empty), #roomScoreRetry:not([hidden]), #exitRoom:not([hidden]))) {
  display:none !important;
}
'''

def once(source, old, new):
    assert source.count(old) == 1, 'Expected one patch target: ' + old[:120]
    return source.replace(old, new, 1)

def patch(source):
    assert 'requested-home-room-display-20261108' not in source, 'Already patched'
    # Move the one existing data URI; never duplicate or replace the artwork.
    source = once(source,
        '#homeScreen.home-screen { background-image:url(',
        '#app:has(#homeScreen:not([hidden])) { background-image:url(')
    source = once(source, '</style>', CSS + '\n</style>')
    # Home ambience uses the very same cover rectangle as the relocated art.
    source = once(source,
        "  const home = doc.getElementById('homeScreen');\n  const layer",
        "  const home = doc.getElementById('homeScreen');\n  const backdrop = doc.getElementById('app') || home;\n  const layer")
    source = once(source, 'const width = home.clientWidth, height = home.clientHeight;',
        'const width = backdrop.clientWidth, height = backdrop.clientHeight;')
    source = once(source, '    resize.observe(home);',
        '    resize.observe(home);\n    if (backdrop !== home) resize.observe(backdrop);')
    # Keep errors and consequential notices, not protocol/connection chatter.
    routine = re.search(r"^ q\('#roomStatus'\)\.textContent=\(mockGuest\?.*;$", source, re.M)
    assert routine, 'Missing routine room status assignment'
    source = once(source, routine.group(0),
        " q('#roomStatus').textContent=[s.departedIds?.length&&s.roundId<TOTAL_ROUNDS?'離脱者は10戦後に終了':'',multiError||'',s.replayError?'観戦記録の転送障害（確定結果は維持）':''].filter(Boolean).join(' / ');")
    source = once(source,
        "q('#roomStatus').textContent+=' / '+(clock.ready?'共有時刻で再生（推定誤差±'+Math.round(clock.uncertaintyMs||0)+'ms）':'時計または記録の確認待ち');",
        '')
    for message in ['部屋へ接続しています…', '対戦準備中…']:
        source = once(source, "document.querySelector('#roomStatus').textContent='" + message + "';",
            "document.querySelector('#roomStatus').textContent='';")
    source = once(source,
        "document.querySelector('#roomStatus').textContent='オフライン・ひとり用';",
        "document.querySelector('#roomStatus').textContent='';document.querySelector('#multiSummary').textContent='';")
    return source
