"""Isolated presentation-only patch. Never writes a source file on import.
Usage: python3 patch-copy.py INPUT_HTML OUTPUT_HTML
The caller may also compose patch(source) after the existing source build.
"""
from pathlib import Path
import sys

EDITS = [
    (
        "attackAriaLabel:'特殊能力の基準威力。多段、範囲、継続ダメージは能力ごとに調整'",
        "attackAriaLabel:'攻撃の基礎値。多段、範囲、継続ダメージは能力ごとに調整'",
    ),
    ("attackLabel:'基準威力'", "attackLabel:'攻撃'"),
    ("addStat(facts.attackLabel||'攻撃', facts.attackValue", "addStat('攻撃', facts.attackValue"),
    (
        "const s=assetProgress(),show=!!(s.pending||s.failed||s.optionalFailed),warn=!!(s.failed||s.late||s.optionalFailed);",
        "const s=assetProgress(),show=!!(s.failed||s.late||s.optionalFailed),warn=show;",
    ),
    (
        "s.optionalFailed&&!s.pending?'一部の演出画像を代替表示しています。':(id==='Choose'&&!multiSession?'対戦画像を読み込み中です。':'画像を読み込み中です。')",
        "s.optionalFailed?'一部の演出画像を代替表示しています。':''",
    ),
]

def patch(source):
    for before, after in EDITS:
        count = source.count(before)
        if count == 0 and source.count(after) == 1:
            continue
        assert count == 1, ('copy patch anchor', before, count)
        source = source.replace(before, after, 1)
    return source

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python3 patch-copy.py INPUT_HTML OUTPUT_HTML')
    source, target = map(Path, sys.argv[1:])
    if source.resolve() == target.resolve():
        raise SystemExit('Refusing to overwrite input; specify an isolated output path.')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(patch(source.read_text()))
