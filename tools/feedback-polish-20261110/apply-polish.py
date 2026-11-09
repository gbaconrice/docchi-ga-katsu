#!/usr/bin/env python3
from pathlib import Path
import sys,hashlib,json,subprocess
root=Path(__file__).resolve().parent
source=Path(sys.argv[1]).read_text();output=Path(sys.argv[2])
assert hashlib.sha256(source.encode()).hexdigest()=='e03fe2aab5e66dd977cd81afeff2b20f93caf29ceee680a0eb4afdfdfde06123','Use the sealed fun-feedback source'
for c in json.loads((root/'display-changes.json').read_text()):
 assert source.count(c['before'])==1
 source=source.replace(c['before'],c['after'])
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(source)
subprocess.run([sys.executable,str(root/'apply-audio-resume-fix.py'),str(output),str(output)],check=True)
assert hashlib.sha256(output.read_bytes()).hexdigest()=='8bc040c9704d5e334835ea1c6c5d4650c3f88b818d85c6db535ee0f5327a722f'
print('PASS:',output)
