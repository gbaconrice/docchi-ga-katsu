#!/usr/bin/env python3
"""Apply presentation-only patches and seal the canonical content revision."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, sys
sys.dont_write_bytecode = True
BASE = 'fef9176e59383910de20f077882565c3ef44f35ca32147bf95b219647c727adf'
FINAL = '14103deee70be661f36874c3ebfaa7e883d35bab92abea12089bd42368bea440'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.exists() or args.input.resolve() == args.output.resolve():
        parser.error('Use a new output file, never the input.')
    source = args.input.read_text(encoding='utf-8')
    assert hashlib.sha256(source.encode()).hexdigest() == BASE, 'Unexpected base source'
    root = Path(__file__).resolve().parent
    for filename, fn in [('patch-controls.py','apply_patch'), ('patch-layout.py','patch'), ('patch-gold-font.py','patch'), ('patch-provenance-paths.py','patch')]:
        spec = importlib.util.spec_from_file_location(filename, root/filename)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        source = getattr(module, fn)(source)
    source, count = re.subn(r'const CONTENT_REVISION="[a-f0-9]{64}";', 'const CONTENT_REVISION="'+'0'*64+'";', source)
    assert count == 1, 'Expected one canonical revision'
    revision = hashlib.sha256(('docchi-boss-abilities-v1\0'+source).encode()).hexdigest()
    source = source.replace('const CONTENT_REVISION="'+'0'*64+'";', f'const CONTENT_REVISION="{revision}";')
    digest = hashlib.sha256(source.encode()).hexdigest()
    assert digest == FINAL, f'Unexpected final source: {digest}'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(source, encoding='utf-8')
    metadata = {'sourceSHA256':digest, 'contentRevision':revision, 'baseSourceSHA256':BASE}
    args.output.with_name('build-info.json').write_text(json.dumps(metadata, indent=2)+'\n')
    print(json.dumps(metadata, indent=2))

if __name__ == '__main__': main()
