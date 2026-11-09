#!/usr/bin/env python3
"""Copy an approved modular release into this isolated test build only."""
import argparse
import hashlib
import html
import json
import pathlib
import re
import shutil

p = argparse.ArgumentParser()
p.add_argument('release', type=pathlib.Path)
p.add_argument('--commit', default='unpublished-integrated-candidate')
a = p.parse_args()
root = pathlib.Path(__file__).resolve().parent
source = a.release.resolve()
manifest = json.loads((source / 'manifest.json').read_text())
names = [*manifest['loadOrder'], manifest['css']['file'], 'manifest.json']
for name in names:
    if pathlib.PurePosixPath(name).name != name:
        raise ValueError('Only top-level release files are supported')
    if not (source / name).is_file():
        raise FileNotFoundError(source / name)
baseline = root / 'baseline'
baseline.mkdir(exist_ok=True)
for name in names:
    shutil.copyfile(source / name, baseline / name)
head = '<!doctype html><html lang="ja" data-host-shell="standalone"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>CPUテスト専用</title>'
head += '<link rel="stylesheet" href="baseline/' + html.escape(manifest['css']['file'], quote=True) + '"></head><body>\n'
for name in manifest['loadOrder']:
    head += '<script src="baseline/' + html.escape(name, quote=True) + '"></script>\n'
for name in ['cpu-room.js', 'test-harness.js']:
    digest = hashlib.sha256((root / name).read_bytes()).hexdigest()[:20]
    head += '<script src="' + name + '?v=' + digest + '"></script>\n'
head += '</body></html>\n'
(root / 'game.html').write_text(head)
game_revision = hashlib.sha256((root / 'game.html').read_bytes()).hexdigest()[:20]
wrapper_path = root / 'index.html'
wrapper, count = re.subn(r'(<iframe\b[^>]*\bsrc=")game\.html(?:\?[^"<>]*)?("[^>]*>)', lambda m: m[1] + 'game.html?rev=' + game_revision + m[2], wrapper_path.read_text())
if count != 1:
    raise ValueError('Expected exactly one game iframe in test wrapper')
wrapper_path.write_text(wrapper)
(root / 'BASELINE.json').write_text(json.dumps({'published_commit': a.commit, 'sourceSha256': manifest.get('sourceSha256'), 'files': {name: hashlib.sha256((baseline / name).read_bytes()).hexdigest() for name in names}}, ensure_ascii=False, indent=2) + '\n')
print('Updated isolated test baseline. Production files were not modified. Rerun tests before delivery.')
