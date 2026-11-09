"""Reconstruct the sealed game from pinned reversible modules and a pinned baseline."""
from pathlib import Path
import hashlib,importlib.util,json,re,sys
sys.dont_write_bytecode=True
here=Path(__file__).resolve().parent;cfg=json.loads((here/'release-config.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
assert len(sys.argv)==3,'Usage: build-source.py BASELINE NEW_SOURCE'
base,out=map(Path,sys.argv[1:]);assert not out.exists();original=base.read_text();assert sha(original.encode())==cfg['baselineSourceSHA256']
for f in cfg['inputs']:
 p=here/f['file'];assert p.resolve().is_relative_to(here.resolve());assert sha(p.read_bytes())==f['sha256'],f['file']
current=original;modules=[];stages=[]
for stage in cfg['stages']:
 p=here/stage['module'];spec=importlib.util.spec_from_file_location('reconstruct_'+stage['id'],p);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 previous=current;current=mod.patch(previous);assert mod.unpatch(current)==previous,stage['id'];assert sha(current.encode())==stage['outputSHA256'],stage['id'];stageDir=out.parent/'stages';stageDir.mkdir(parents=True,exist_ok=True);(stageDir/(stage['id']+'.html')).write_text(current);modules.append(mod);stages.append({'id':stage['id'],'sha256':sha(current.encode()),'inverseExact':True})
restored=current
for mod in reversed(modules):restored=mod.unpatch(restored)
assert restored==original
pattern=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)';assert len(re.findall(pattern,current))==1
normalized=re.sub(pattern,lambda m:m[1]+'0'*64+m[2],current);revision=sha(('docchi-boss-abilities-v1\0'+normalized).encode());assert revision==cfg['contentRevision']
sealed=re.sub(pattern,lambda m:m[1]+revision+m[2],current);assert sha(sealed.encode())==cfg['sourceSHA256']
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(sealed)
report={'sourceSHA256':sha(sealed.encode()),'contentRevision':revision,'stages':stages,'fullInverseExact':True};(out.parent/'source-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
