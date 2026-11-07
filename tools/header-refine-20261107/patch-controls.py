#!/usr/bin/env python3
"""Narrow presentation patch; never overwrites its input. Import apply_patch(text)."""
from pathlib import Path
import argparse
import hashlib

BASE_SHA256 = 'fef9176e59383910de20f077882565c3ef44f35ca32147bf95b219647c727adf'

def apply_patch(source):
    def replace(old, new):
        nonlocal source
        if source.count(old) != 1:
            raise ValueError(f'Expected exactly one patch anchor: {old[:100]!r}; got {source.count(old)}')
        source = source.replace(old, new, 1)

    replace("mode==='game'?'#gameTopline':mode==='home'", "mode==='game'?'#gameToolbar':mode==='home'")
    # Retain the original control and its programmatic handlers for compatibility,
    # but never expose the obsolete information button in any game phase.
    replace('<button id="unitsToggle" class=', '<button id="unitsToggle" hidden class=')
    replace('unitsButton.hidden=false;unitsButton.disabled=!flowControlsAvailable();', 'unitsButton.hidden=true;unitsButton.disabled=!flowControlsAvailable();')
    replace("for(const id of ['#battleClock','#unitsToggle'])if(q(id))q(id).hidden=false;", "for(const id of ['#battleClock'])if(q(id))q(id).hidden=false;")
    replace("for(const id of ['#unitsToggle','#reactionToggle','#pause'])if(q(id)){q(id).hidden=false;", "for(const id of ['#unitsToggle','#reactionToggle','#pause'])if(q(id)){q(id).hidden=id==='#unitsToggle';")
    replace('<p id="fieldStatus" class=', '<p id="fieldStatus" data-field="none" class=')
    replace('fieldStatus.textContent=inlineFieldLabel(battleEnvironment);', "fieldStatus.textContent=inlineFieldLabel(battleEnvironment);fieldStatus.setAttribute?.('data-field',battleEnvironment?.fieldId||'none');")
    replace("const isMulti=!!multiSession,isMenu=isMulti||state!=='fight';document.querySelector('#pauseTitle').textContent=isMenu?'メニュー':'一時停止';document.querySelector('#pauseResume').textContent=isMenu?'閉じる':'再開';document.querySelector('#multiPauseNotice').hidden=!isMulti;",
        "const isMulti=!!multiSession,isChoose=state==='choose',isMenu=isMulti||state!=='fight';const title=document.querySelector('#pauseTitle');title.textContent=isChoose?'一時停止':isMenu?'メニュー':'一時停止';title.hidden=isChoose;document.querySelector('#pauseResume').textContent=isMenu?'閉じる':'再開';document.querySelector('#pauseExit').textContent=isChoose?'ゲームを終了する':'終了';document.querySelector('#multiPauseNotice').hidden=isChoose||!isMulti;")
    return source

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--require-base-sha', action='store_true')
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error('Output must differ from input; base source is immutable.')
    if args.output.exists():
        parser.error('Output exists; use a fresh candidate path.')
    raw = args.input.read_bytes()
    if args.require_base_sha and hashlib.sha256(raw).hexdigest() != BASE_SHA256:
        parser.error('Base source SHA256 mismatch.')
    result = apply_patch(raw.decode('utf-8'))
    args.output.write_text(result, encoding='utf-8')
    print(f'Patched candidate: {args.output}\nSHA256: {hashlib.sha256(result.encode()).hexdigest()}')

if __name__ == '__main__':
    main()
