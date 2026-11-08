"""Remove only unsolicited multiplayer display labels; preserve recovery.

The immutable input stays untouched. Each edit is an exact, invertible UI-only
fragment. No room, prediction, replay, settlement, or next-round logic changes.
"""

BASE_SHA = "9b412ae06ac9c37ba58a6ef7e104b705a277eaf2ed6c5f396930ba44ee2372a5"
MARKER = "redundant-match-labels-20261108"
REPLACEMENTS = (
    (
        "  const complete=s.participants.every(id=>s.roundResults.some(row=>row.playerId===id)||s.wallets?.some(row=>row.playerId===id&&(row.cashedOut===true||row.terminalReason==='bankrupt')));\n  return complete?'的中なし':'';",
        "  return '';",
    ),
    (
        "  node.hidden=false;\n  node.textContent=side==='A'?'予想：左':side==='B'?'予想：右':state==='choose'?'予想：未選択':'予想：なし';",
        "  node.hidden=side!=='A'&&side!=='B'&&state!=='choose';\n  node.textContent=side==='A'?'予想：左':side==='B'?'予想：右':state==='choose'?'予想：未選択':'';",
    ),
    (
        "  const inRoom=screenMode==='room',status=q('#multiStatusRow'),dock=q('#roomLobbyStatusDock');",
        "  // redundant-match-labels-20261108: routine game chrome is omitted; real failures keep the existing recovery controls.\n  const inRoom=screenMode==='room',status=q('#multiStatusRow'),dock=q('#roomLobbyStatusDock');\n  const gameRecovery=joined&&screenMode==='game'&&!!(multiError||s?.replayError||multiUnavailableRound!==null&&multiUnavailableRound===s?.roundId||q('#roomStatus').textContent.startsWith('退出失敗：'));",
    ),
    (
        "  q('#multiSummary').hidden=inRoom&&lobby;\n  status.hidden=screenMode==='home'||(screenMode==='game'&&!joined)||inRoom&&!lobby&&!q('#roomStatus').textContent&&!q('#roomScoreStatus').textContent&&!roomEntryPending;",
        "  q('#multiSummary').hidden=screenMode==='game'||inRoom&&lobby;if(screenMode==='game')q('#multiSummary').textContent='';\n  status.hidden=screenMode==='home'||screenMode==='game'&&!gameRecovery||inRoom&&!lobby&&!q('#roomStatus').textContent&&!q('#roomScoreStatus').textContent&&!roomEntryPending;",
    ),
    (
        "  const exit=q('#exitRoom');exit.hidden=!occupied;exit.disabled=roomExitPending||roomEntryPending;exit.textContent=roomExitPending?'退出中…':inRoom?'退出してホームへ':'退出';",
        "  const exit=q('#exitRoom');exit.hidden=!occupied||screenMode==='game'&&!gameRecovery;exit.disabled=roomExitPending||roomEntryPending;exit.textContent=roomExitPending?'退出中…':inRoom?'退出してホームへ':'退出';",
    ),
    (
        "  document.querySelector('#multiStatusRow').hidden=next==='home'||(next==='game'&&!multiSession);",
        "  document.querySelector('#multiStatusRow').hidden=next==='home'||next==='game';",
    ),
    (
        "  const label=awaitingEntry?'':ownEntry?.correct===true?'':ownEntry?.correct===false?'':outcome==='draw'?'引き分け':outcome==='invalid'?'無効':'予想なし';",
        "  const label=awaitingEntry?'':ownEntry?.correct===true?'':ownEntry?.correct===false?'':outcome==='draw'?'引き分け':outcome==='invalid'?'無効':'';",
    ),
)
# Production controller uses one-space indentation.
REPLACEMENTS = tuple((before.replace('\n  ', '\n ').removeprefix(' '),
                      after.replace('\n  ', '\n ').removeprefix(' '))
                     for before, after in REPLACEMENTS)


def patch(source):
    if MARKER in source:
        return source
    result = source
    for before, after in REPLACEMENTS:
        if result.count(before) != 1:
            raise ValueError("Expected one UI fragment: " + before[:100])
        result = result.replace(before, after, 1)
    return result


def unpatch(source):
    result = source
    for before, after in reversed(REPLACEMENTS):
        # The result fallback shares its return spelling elsewhere. Its exact
        # enclosing function is the anchor for inverse comparison.
        if after == " return '';":
            anchor = " if(names.length)return '的中：'+names.join('、');\n" + after + "\n}"
            assert result.count(anchor) == 1
            result = result.replace(anchor, " if(names.length)return '的中：'+names.join('、');\n" + before + "\n}", 1)
        else:
            assert result.count(after) == 1, after[:100]
            result = result.replace(after, before, 1)
    return result


if __name__ == '__main__':
    from pathlib import Path
    import hashlib
    import sys
    assert len(sys.argv) == 3, 'Usage: patch-redundant-match-labels.py INPUT OUTPUT'
    source, output = map(Path, sys.argv[1:])
    assert source.resolve() != output.resolve(), 'Input must remain immutable'
    assert hashlib.sha256(source.read_bytes()).hexdigest() == BASE_SHA
    result = patch(source.read_text())
    assert unpatch(result) == source.read_text()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result)
    print('Applied seven exact display-only edits; immutable input unchanged.')
