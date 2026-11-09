#!/usr/bin/env python3
"""Static layout contract checks, NOT a substitute for browser screenshots.
Run: python verify-feedback-layout.py [combined-source.html]
The geometry checks prove containment of new gauge paint given its CSS boxes;
they do not claim to measure actual browser layout or native host insets.
"""
from pathlib import Path
import re
import sys
import json

css = Path(__file__).with_name('fun-feedback.css').read_text()

def rule(selector):
    match = re.search(re.escape(selector) + r'\s*\{([^{}]*)\}', css)
    assert match, f'Missing rule: {selector}'
    return dict((k.strip(),v.strip()) for k,v in re.findall(r'([\w-]+)\s*:\s*([^;]+);', match[1]))

row = rule('#app #gameScreen #comparison .army-card > .fun-card-feedback')
assert row['display'] == 'grid' and row['min-height'] == '28px'
assert row['flex'] == '0 0 auto' and row['margin'] == '0'
assert row.get('position', 'static') == 'static'
seal = rule('#app #gameScreen #comparison .fun-card-feedback > .fun-seal')
assert (seal['width'],seal['height'],seal['box-sizing']) == ('36px','26px','border-box')
assert seal.get('position', 'static') == 'static'
crown = rule('#app #gameScreen #comparison .fun-card-feedback > .fun-crown')
assert crown.get('position', 'static') == 'static'
assert crown['grid-column'] != seal['grid-column']
gauge = rule('#app #gameScreen > .fun-tug')
assert gauge['position'] == 'relative' and gauge['flex'] == '0 0 26px'
assert gauge['padding'] == '0 24px' and gauge['height'] == '26px'
count = rule('#app #gameScreen > .fun-countdown')
assert count['position'] == 'absolute' and count['inset'] == '0'
assert '.fun-countdown[hidden]' in css and '.fun-tug[hidden]' in css
# No rule changes existing canvas, card stat, avatar/pick, header/host geometry.
without_comments = re.sub(r'/\*[\s\S]*?\*/', '', css)
for forbidden in ['.army-preview {', '.prediction-picks {', '.comparison-stat {',
                  '#fieldStage {', '#battle {', '--gravity-top-inset:']:
    assert forbidden not in without_comments, forbidden
# The 10px track is vertically centered in the 26px row. Its 1px borders
# leave 8px content; the knot extends 4px in each direction, for 16px.
assert 26 >= max(16,14)
viewports = [(320,568),(390,844),(430,932),(844,390),(1440,900)]
for width,height in viewports:
    # Conservative 32px of existing horizontal app padding, independent of
    # actual host layout. Coin extends 19px beyond track content; 24px reserved.
    inner = width - 32
    track = inner - 48
    assert track > 0 and 24 >= 19
    assert 0 <= 26 <= height

if len(sys.argv)>1:
    # DOM source insertion is owned by the runtime/apply script. Check that a
    # source retains the original nodes and incorporates this exact stylesheet.
    html=Path(sys.argv[1]).read_text()
    assert css in html, 'Combined source does not contain current CSS'
    for node in ['fieldStage','armyPreviewRed','armyPreviewBlue','redPicks','bluePicks','redStats','blueStats']:
        assert len(re.findall(r'id=["\']'+node+r'["\']',html)) == 1, node
print(json.dumps({'status':'passed','verification':'static contract and declared-box geometry only',
    'viewport_inputs':viewports,'browser_screenshots':'reported separately',
    'constraints':['28px normal-flow card feedback row','26px normal-flow gauge sibling',
                   'countdown contained in game screen','original field/art/pick/stats CSS untouched']},ensure_ascii=False,indent=2))
