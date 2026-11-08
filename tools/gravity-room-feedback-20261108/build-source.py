"""Reproduce the requested room/profile/presentation corrections from the published source."""
import hashlib,json,os,re,runpy,subprocess,sys
from pathlib import Path
BASE_SHA='b080617884c5f67d44431dd922b77c44736d8dbe227ef3c26fbf937645b52727'
PATCHES=['profiles-emotes','waiting-room-lobby','pick-icon-layout','avatar-fallback-errors','results-waits-logs','boss-status-logs']
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def build(source,out):
 source,out=Path(source),Path(out);assert source.resolve()!=out.resolve();assert sha(source)==BASE_SHA,'Unexpected input source'
 text=source.read_text();here=Path(__file__).resolve().parent;baselines=out.parent.parent/'baselines';baselines.mkdir(parents=True,exist_ok=True);applied=[]
 for name in PATCHES:
  module=here/('patch-'+name+'.py');assert module.exists(),str(module)
  (baselines/('before-'+name+'.html')).write_text(text)
  text=runpy.run_path(str(module))['patch'](text);applied.append({'name':name,'patchSHA256':sha(module)})
 before=baselines/'before-home-gif.html';after=baselines/'after-home-gif.html';before.write_text(text)
 script=here/'apply-home-gif.cjs';r=subprocess.run(['node',str(script),str(before),str(after)],capture_output=True,text=True)
 assert r.returncode==0,r.stderr or r.stdout;text=after.read_text()
 animation=Path(os.environ.get('HOME_ANIMATION_DIR',str(here/'home-animation' if (here/'home-animation').is_dir() else here.parent/'home-animation')))
 applied.append({'name':'home-gif','patchSHA256':sha(script),'inputs':{name:sha(animation/name) for name in ['home-tavern.gif','home-gif.css','home-gif-controller.js']}})
 pattern=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)';assert len(re.findall(pattern,text))==1
 text=re.sub(pattern,lambda m:m[1]+'0'*64+m[2],text);revision=hashlib.sha256(('docchi-boss-abilities-v1\0'+text).encode()).hexdigest();text=re.sub(pattern,lambda m:m[1]+revision+m[2],text)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(text)
 report={'baseSourceSHA256':BASE_SHA,'sourceSHA256':sha(out),'contentRevision':revision,'bytes':out.stat().st_size,'patches':applied}
 (out.parent/'source-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
 assert len(sys.argv)==3,'Usage: build-source.py BASE_SOURCE OUTPUT_SOURCE'
 build(*sys.argv[1:])
