"""Rebuild approved UI, replace the home GIF, and refine only the added claw cue, preserving fixed lamp bodies."""
from pathlib import Path
import hashlib
import json
import os
import runpy
import subprocess
import sys

HERE = Path(__file__).resolve().parent
UI_SHA = 'b296d5d85653c7d3906d807f7c74cce087c60fa2692a5f6e51b542a6c0c49be0'
GIF_SHA = 'f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084'
sha = lambda value: hashlib.sha256(value).hexdigest()

if __name__ == '__main__':
    assert len(sys.argv) == 3, 'Usage: build-media-source.py PREVIOUS_SOURCE OUTPUT_SOURCE'
    source, out = map(Path, sys.argv[1:])
    assert source.resolve() != out.resolve()
    ui = out.parent / 'ui-baseline/index.html'
    subprocess.run([sys.executable, str(HERE / 'build-combined-source.py'), str(source), str(ui)], check=True)
    assert sha(ui.read_bytes()) == UI_SHA
    baseline = out.parent / 'baselines/before-claw.html'
    baseline.parent.mkdir(parents=True, exist_ok=True)
    gif = Path(os.environ.get('HOME_GIF_FILE', str(HERE.parents[1] / 'releases/terrain-emote-fix-20261108/images' / (GIF_SHA + '.gif'))))
    assert sha(gif.read_bytes()) == GIF_SHA
    assert gif.stat().st_size == 992844
    assert sha((HERE / 'dark-claw-art-renderers.js').read_bytes()) == '3924f2c5d465eb383303460ee91616d4cc9166c325c26b1484eaa3c0668e2acc'
    subprocess.run(['node', str(HERE / 'replace-home-gif.cjs'), str(ui), str(baseline), str(gif)], check=True)
    before = baseline.read_text()
    module = runpy.run_path(str(HERE / 'patch-dark-claw-art.py'))
    changed = module['patch'](before)
    assert module['unpatch'](changed) == before
    (out.parent / 'baselines/before-seal.html').write_text(changed)
    final, revision = runpy.run_path(str(HERE / 'build-source.py'))['seal'](changed)
    out.write_text(final)
    report = {
        'baseSourceSHA256': sha(source.read_bytes()),
        'uiSourceSHA256': UI_SHA,
        'sourceSHA256': sha(out.read_bytes()),
        'contentRevision': revision,
        'bytes': out.stat().st_size,
        'newHomeGifSHA256': GIF_SHA,
        'newHomeGifBytes': gif.stat().st_size,
        'originalCharacterRenderingPreserved': True,
        'beforeClawSHA256': sha(baseline.read_bytes()),
        'patches': {name: sha((HERE / name).read_bytes()) for name in ['replace-home-gif.cjs', 'patch-dark-claw-art.py', 'dark-claw-art-renderers.js']},
    }
    (out.parent / 'source-build.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
