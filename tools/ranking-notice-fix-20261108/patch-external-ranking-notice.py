"""Remove only the standalone external-ranking notice, with no replacement.

Import patch(source) for composition, or run with SOURCE OUTPUT to create an
isolated candidate. Score transport, eligibility and retry logic stay intact.
"""

BASE_SHA = 'ff7862a0193b266463bf699edc8844b7ce30b7c9fb03e283462542f6d0f4985f'
NOTICE = '外部ランキングには送信していません'
OLD = "result.status==='standalone'?'" + NOTICE + "'"
NEW = "result.status==='standalone'?''"


def patch(source):
    if source.count(NEW) == 1 and OLD not in source and NOTICE not in source:
        return source
    if source.count(OLD) != 1 or source.count(NOTICE) != 1 or NEW in source:
        raise ValueError('expected one exact standalone-status notice anchor')
    return source.replace(OLD, NEW, 1)


def unpatch(source):
    if source.count(NEW) != 1 or OLD in source or NOTICE in source:
        raise ValueError('expected one exact patched standalone-status anchor')
    return source.replace(NEW, OLD, 1)


if __name__ == '__main__':
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error('write an isolated candidate, not the immutable source')
    result = patch(args.source.read_bytes().decode('utf-8')).encode('utf-8')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(result)
