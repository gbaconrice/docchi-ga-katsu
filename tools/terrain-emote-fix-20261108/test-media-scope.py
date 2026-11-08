"""Prove the final media changes are only one GIF and the invertible added claw renderer."""
import base64
import hashlib
from pathlib import Path
import re
import runpy
import sys

here = Path(__file__).resolve().parent
candidate, ui = map(Path, sys.argv[1:3])
before, after = ui.read_text(), candidate.read_text()
sha = lambda value: hashlib.sha256(value).hexdigest()
assert sha(before.encode()) == 'b296d5d85653c7d3906d807f7c74cce087c60fa2692a5f6e51b542a6c0c49be0'
gif_pattern = re.compile(r'data:image/gif;base64,([A-Za-z0-9+/]+={0,2})')
old, new = gif_pattern.findall(before), gif_pattern.findall(after)
assert len(old) == len(new) == 1
assert sha(base64.b64decode(old[0])) == 'c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae'
assert sha(base64.b64decode(new[0])) == 'f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084'
gif_only = before.replace('data:image/gif;base64,' + old[0], 'data:image/gif;base64,' + new[0])
module = runpy.run_path(str(here / 'patch-dark-claw-art.py'))
patched = module['patch'](gif_only)
assert module['unpatch'](patched) == gif_only
assert module['patch'](patched) == patched
expected, revision = runpy.run_path(str(here / 'build-source.py'))['seal'](patched)
assert expected == after, 'Changes outside the specified GIF, claw renderer and seal'
normalize = lambda value: re.sub(r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)', lambda match: match[1] + '0' * 64 + match[2], value)
assert normalize(module['unpatch'](after)) == normalize(gif_only)
def sprite(value):
    start = value.index('function drawSprite(u){')
    end = value.index('\n// Preserve visible elapsed time;', start)
    return value[start:end]
assert sprite(before) == sprite(after), 'Original character image rendering changed'
assert '/* crystal-hit-art-v1:' not in after and 'refinedContactBodyFrame' not in after
assets = lambda value: re.findall(r'data:(?!image/gif)[^;\s"\'<>]+;base64,[A-Za-z0-9+/=]+', value)
assert assets(before) == assets(after), 'An original non-GIF asset changed'
print('PASS exact GIF replacement, invertible claw-only renderer, original character frames/assets, and exact seal')
print('Source SHA256', sha(after.encode()))
print('Content seal', revision)
