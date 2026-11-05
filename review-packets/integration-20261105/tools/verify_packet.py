#!/usr/bin/env python3
"""Verify the review packet without downloading or changing any files."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def verify():
 manifest=json.loads((ROOT/'MANIFEST.json').read_text(encoding='utf-8'))
 expected={x['path']:x for x in manifest['files']}
 actual={str(p.relative_to(ROOT)).replace('\\','/') for p in ROOT.rglob('*') if p.is_file() and p!=ROOT/'MANIFEST.json'}
 if actual!=set(expected):raise ValueError('Packet file set mismatch: '+str(sorted(actual^set(expected))))
 for rel,row in expected.items():
  p=ROOT/rel
  if p.is_symlink() or ROOT not in p.resolve().parents:raise ValueError('Unsafe path: '+rel)
  data=p.read_bytes()
  if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:raise ValueError('Hash/size mismatch: '+rel)
 return {'files':len(expected),'bytes':sum(x['bytes'] for x in expected.values()),'status':'verified'}
if __name__=='__main__':print(json.dumps(verify(),indent=2))
