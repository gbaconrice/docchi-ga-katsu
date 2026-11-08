"""Remove the requested lobby sentence and redundant self-role suffix only.

Import patch(source) to compose with other presentation patches, or run this file
with SOURCE OUTPUT to create an isolated candidate. Existing status messages,
profile names, avatars, membership, controls and game logic are preserved.
"""

CHANGES = (
    (
        '<p id="roomLobbyWait" class="room-lobby-wait" role="status" aria-live="polite"></p>',
        '<p id="roomLobbyWait" class="room-lobby-wait" role="status" aria-live="polite" hidden></p>',
    ),
    (
        "role.className='room-lobby-role';role.textContent=[row.id===hostId?'ホスト':row.spectator?'観戦':'参加中',row.id===multiUser?'あなた':''].filter(Boolean).join(' · ');",
        "role.className='room-lobby-role';role.textContent=row.id===hostId?'ホスト':row.spectator?'観戦':'参加中';",
    ),
    (
        "else if(s?.phase==='lobby')wait=multiHost?(s.roundId===null?'参加者がそろったら、対戦を始められます。':'もう一度遊ぶと、新しい対戦を準備します。'):'ホストが対戦を始めるまでお待ちください。';",
        "else if(s?.phase==='lobby')wait=multiHost?(s.roundId===null?'':'もう一度遊ぶと、新しい対戦を準備します。'):'ホストが対戦を始めるまでお待ちください。';",
    ),
    (
        "q('#roomLobbyWait').textContent=wait;",
        "q('#roomLobbyWait').textContent=wait;q('#roomLobbyWait').hidden=!wait;",
    ),
)


def patch(source):
    # Normalize a completely applied patch for idempotent composition. Reject
    # partial or unknown input rather than silently replacing ambiguous text.
    if all(source.count(new) == 1 for _, new in CHANGES):
        return source
    for old, new in CHANGES:
        if source.count(old) != 1 or new in source:
            raise ValueError('expected unique unpatched lobby anchor: ' + old)
    for old, new in CHANGES:
        source = source.replace(old, new, 1)
    return source


if __name__ == '__main__':
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error('write an isolated candidate, not the immutable source')
    result = patch(args.source.read_text(encoding='utf-8'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding='utf-8')
