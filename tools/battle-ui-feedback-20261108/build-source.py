"""Reconstruct the requested battle-feedback source from the immutable published base."""
import hashlib,json,re,runpy,sys
from pathlib import Path
BASE_SHA='9872204a68cf587f56a429cd3369dc057445b8d6463747b89a9da030f1eb6c2d'
PATCHES=['round-summary','remove-opening-cue','trait-text','team-colors','event-log','participant-rail','draw-matchup','late-boss-rounds','zero-bet-text','home-room-display','speed-damage','trap-placement','trap-camera','dead-unit-motion','summon-name','matchup-diversity','generation-coverage','distinct-opponents','effect-art']
def build(source,out):
 raw=Path(source).read_bytes();assert hashlib.sha256(raw).hexdigest()==BASE_SHA,'Unexpected input source'
 text=raw.decode();out=Path(out);assert Path(source).resolve()!=out.resolve()
 baseline=out.parent.parent/'baselines';baseline.mkdir(parents=True,exist_ok=True)
 applied=[]
 for name in PATCHES:
  module=Path(__file__).parent/('patch-'+name+'.py')
  assert module.exists(),str(module)
  (baseline/('before-'+name+'.html')).write_text(text)
  text=runpy.run_path(str(module))['patch'](text)
  applied.append({'name':name,'patchSHA256':hashlib.sha256(module.read_bytes()).hexdigest()})
 pattern=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)'
 assert len(re.findall(pattern,text))==1
 text=re.sub(pattern,lambda m:m[1]+'0'*64+m[2],text)
 revision=hashlib.sha256(('docchi-boss-abilities-v1\0'+text).encode()).hexdigest()
 text=re.sub(pattern,lambda m:m[1]+revision+m[2],text)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(text)
 report={'baseSourceSHA256':BASE_SHA,'sourceSHA256':hashlib.sha256(text.encode()).hexdigest(),'contentRevision':revision,'bytes':len(text.encode()),'patches':applied}
 (out.parent/'source-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
 assert len(sys.argv)==3,'Usage: build-source.py BASE_SOURCE OUTPUT_SOURCE'
 build(*sys.argv[1:])
