"""Apply only the declared display correction and seal the release identity."""
from pathlib import Path
import hashlib,json,re,runpy,sys
BASE_SHA='ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa'
def seal(s):
 pattern=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)'
 assert len(re.findall(pattern,s))==1
 s=re.sub(pattern,lambda m:m[1]+'0'*64+m[2],s)
 rev=hashlib.sha256(('docchi-boss-abilities-v1\0'+s).encode()).hexdigest()
 return re.sub(pattern,lambda m:m[1]+rev+m[2],s),rev
if __name__=='__main__':
 assert len(sys.argv)==3,'Usage: build-source.py BASE_SOURCE OUTPUT_SOURCE'
 source,out=map(Path,sys.argv[1:]);assert source.resolve()!=out.resolve()
 assert hashlib.sha256(source.read_bytes()).hexdigest()==BASE_SHA
 patchfile=Path(__file__).resolve().parent/'patch-terrain-emote.py'
 s=runpy.run_path(str(patchfile))['patch'](source.read_text());s,revision=seal(s)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(s)
 report={'baseSourceSHA256':BASE_SHA,'sourceSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'contentRevision':revision,'patchSHA256':hashlib.sha256(patchfile.read_bytes()).hexdigest(),'bytes':out.stat().st_size}
 (out.parent/'source-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
