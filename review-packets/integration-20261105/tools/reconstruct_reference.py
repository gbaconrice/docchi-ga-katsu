#!/usr/bin/env python3
"""Reconstruct ONLY the historical cloud reference in a new directory."""
from pathlib import Path
import argparse,hashlib,json,re
from urllib.parse import urlparse
import sys
sys.dont_write_bytecode=True
from verify_packet import verify,ROOT
sha=lambda b:hashlib.sha256(b).hexdigest()
def exact_patch(base,patch):
 src=base.decode('utf-8').splitlines(keepends=True);lines=patch.splitlines(keepends=True);out=[];pos=0;i=2
 if not lines[0].startswith('--- a/') or not lines[1].startswith('+++ b/'):raise ValueError('Invalid patch header')
 while i<len(lines):
  m=re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*\n',lines[i])
  if not m:raise ValueError('Unexpected hunk header')
  start=int(m[1])-1;old_count=int(m[2] or 1);new_count=int(m[4] or 1)
  if start<pos:raise ValueError('Overlapping patch hunk')
  out+=src[pos:start];pos=start;i+=1;old=[];new=[]
  while i<len(lines) and not lines[i].startswith('@@ '):
   line=lines[i]
   if line[:1] in (' ','-'):old.append(line[1:])
   if line[:1] in (' ','+'):new.append(line[1:])
   if line[:1] not in (' ','-','+'):raise ValueError('Unsupported patch line')
   i+=1
  if len(old)!=old_count or len(new)!=new_count or src[pos:pos+old_count]!=old:raise ValueError('Exact hunk context/count mismatch')
  out+=new;pos+=old_count
 out+=src[pos:]
 return ''.join(out).encode('utf-8')
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--baseline-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 verify();base=a.baseline_dir.resolve();dest=a.output.resolve()
 if dest.exists():raise ValueError('Output must not exist; no overwrite is supported')
 if dest==base or base in dest.parents or ROOT==dest or ROOT in dest.parents:raise ValueError('Output must be outside baseline and packet directories')
 info=json.loads((ROOT/'provenance/source.json').read_text(encoding='utf-8'));files={}
 for row in info['files']:
  data=(base/row['name']).read_bytes()
  if sha(data)!=row['base_sha256']:raise ValueError('Wrong baseline: '+row['name'])
  updated=exact_patch(data,(ROOT/row['patch']).read_text(encoding='utf-8'))
  if sha(updated)!=row['reference_sha256']:raise ValueError('Reconstruction differs: '+row['name'])
  files[row['name']]=updated
 for row in info['support_files']:
  data=(base/row['name']).read_bytes()
  if sha(data)!=row['sha256']:raise ValueError('Wrong baseline support: '+row['name'])
  files[row['name']]=data
 shell=files['index.html'].decode('utf-8');fixture=shell
 for m in list(re.finditer(r'<script\b([^>]*)src="([^"]+)"([^>]*)></script>',shell)):
  name=Path(urlparse(m[2]).path).name;script=files[name].decode('utf-8')
  if re.search('</script',script,re.I):raise ValueError('Unsafe inline script terminator')
  fixture=fixture.replace(m[0],'<script'+m[1]+m[3]+'>'+script+'</script>',1)
 link=re.search(r'<link rel="stylesheet" href="[^"]+">',fixture)
 if not link:raise ValueError('Missing stylesheet hook')
 fixture=fixture.replace(link[0],'<style>'+files['game.css'].decode('utf-8')+'</style>',1)
 # All validation above is read-only; create a never-before-existing scratch directory only.
 dest.mkdir(parents=True,exist_ok=False)
 for name,data in files.items():(dest/name).write_bytes(data)
 (dest/'fixture.html').write_text(fixture,encoding='utf-8',newline='')
 (dest/'REFERENCE_ONLY.txt').write_text('Historical v3 cloud reference only. Not current normal game. Do not deploy or overwrite normal index.html.\n',encoding='utf-8')
 print(json.dumps({'status':'reference reconstructed','runtime_sha256':sha(files['game-runtime.js']),'fixture_sha256':sha(fixture.encode('utf-8')),'directory':str(dest)},indent=2))
if __name__=='__main__':main()
