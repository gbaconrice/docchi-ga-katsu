"""Rebuild the requested display corrections from the preceding public source."""
from pathlib import Path
import hashlib
import json
import runpy
import sys

HERE = Path(__file__).resolve().parent
build = runpy.run_path(str(HERE / 'build-source.py'))
BASE_SHA = build['BASE_SHA']
TERRAIN_SHA = '9b412ae06ac9c37ba58a6ef7e104b705a277eaf2ed6c5f396930ba44ee2372a5'
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()

if __name__ == '__main__':
    assert len(sys.argv) == 3, 'Usage: build-combined-source.py BASE_SOURCE OUTPUT_SOURCE'
    source, out = map(Path, sys.argv[1:])
    assert source.resolve() != out.resolve()
    original = source.read_text()
    assert sha(original) == BASE_SHA
    baselines = out.parent / 'baselines'
    baselines.mkdir(parents=True, exist_ok=True)
    modules = ['patch-terrain-emote.py', 'patch-lobby-copy.py', 'patch-redundant-match-labels.py']
    patches = {name: runpy.run_path(str(HERE / name)) for name in modules}
    terrain, _ = build['seal'](patches[modules[0]]['patch'](original))
    assert sha(terrain) == TERRAIN_SHA
    (baselines / 'terrain-stage.html').write_text(terrain)
    s = patches[modules[1]]['patch'](terrain)
    (baselines / 'before-redundant-labels.html').write_text(s)
    before_labels = s
    s = patches[modules[2]]['patch'](s)
    assert patches[modules[2]]['unpatch'](s) == before_labels
    (baselines / 'before-seal.html').write_text(s)
    s, revision = build['seal'](s)
    out.write_text(s)
    report = {
        'baseSourceSHA256': BASE_SHA,
        'terrainStageSHA256': TERRAIN_SHA,
        'sourceSHA256': sha(s),
        'contentRevision': revision,
        'bytes': len(s.encode()),
        'patches': {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in modules},
        'baselines': {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(baselines.glob('*.html'))},
    }
    (out.parent / 'source-build.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
