"""Verify the final source is exactly the requested patch composition and seal."""
import hashlib
from pathlib import Path
import re
import runpy
import sys

here = Path(__file__).resolve().parent
candidate, base = map(Path, sys.argv[1:3])
before, after = base.read_text(), candidate.read_text()
builder = runpy.run_path(str(here / 'build-source.py'))
assert hashlib.sha256(before.encode()).hexdigest() == builder['BASE_SHA']
expected = runpy.run_path(str(here / 'patch-terrain-emote.py'))['patch'](before)
expected, _ = builder['seal'](expected)
assert hashlib.sha256(expected.encode()).hexdigest() == '9b412ae06ac9c37ba58a6ef7e104b705a277eaf2ed6c5f396930ba44ee2372a5'
for name in ['patch-lobby-copy.py', 'patch-redundant-match-labels.py']:
    module = runpy.run_path(str(here / name))
    next_source = module['patch'](expected)
    assert module['patch'](next_source) == next_source, name + ' is not idempotent'
    if 'unpatch' in module:
        assert module['unpatch'](next_source) == expected
    expected = next_source
expected, revision = builder['seal'](expected)
assert expected == after, 'Final source contains changes outside the explicit patch composition'
assert '/* crystal-hit-art-v1:' not in after and 'refinedContactBodyFrame' not in after
def character_renderer(value):
    start = value.index('function drawSprite(u){')
    end = value.index('\n// Preserve visible elapsed time;', start)
    return value[start:end]
assert character_renderer(before) == character_renderer(after), 'Original character rendering must remain unchanged'
images = lambda value: re.findall(r'data:image/[^;\s]+;base64,[A-Za-z0-9+/=]+', value)
assert images(before) == images(after), 'Original embedded image bytes changed'
assert len(re.findall(r'<script\b', before, re.I)) == len(re.findall(r'<script\b', after, re.I)) == 5
print('PASS exact declared patch composition, idempotence, image-byte equality, five-script structure, and exact content seal')
print('Source SHA256', hashlib.sha256(after.encode()).hexdigest())
print('Content seal', revision)
