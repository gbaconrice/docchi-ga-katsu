"""Apply the single ranking-notice removal to the pinned published source and reseal."""
from pathlib import Path
import hashlib,json,re,runpy,sys
BASE_SHA='ff7862a0193b266463bf699edc8844b7ce30b7c9fb03e283462542f6d0f4985f'
PATCH_SHA='9fbce2bb48c9f56c7e5bb7d748d6c4afee06a1aa6225748aa26eb6d2f63d7ce7'
PRE_SEAL_SHA='55ecf6a2d0aa3088f10454f0f6a5df05f31c1a4fe679c9ce0d4fb865c3cd9005'
sha=lambda b:hashlib.sha256(b).hexdigest()
def seal(s):
 pattern=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)'
 assert len(re.findall(pattern,s))==1
 normalized=re.sub(pattern,lambda m:m[1]+'0'*64+m[2],s)
 revision=sha(('docchi-boss-abilities-v1\0'+normalized).encode())
 return re.sub(pattern,lambda m:m[1]+revision+m[2],s),revision
if __name__=='__main__':
 assert len(sys.argv)==3,'Usage: build-source.py BASE_SOURCE NEW_OUTPUT_SOURCE'
 base,out=map(Path,sys.argv[1:]);assert not out.exists();assert base.resolve()!=out.resolve()
 original=base.read_bytes();assert sha(original)==BASE_SHA
 patch=Path(__file__).resolve().parent/'patch-external-ranking-notice.py';assert sha(patch.read_bytes())==PATCH_SHA
 module=runpy.run_path(str(patch));changed=module['patch'](original.decode('utf-8'))
 assert module['unpatch'](changed).encode()==original
 assert sha(changed.encode())==PRE_SEAL_SHA and len(original)-len(changed.encode())==51
 final,revision=seal(changed);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(final.encode())
 report={'baseCommit':'7e8519c48608551bc2092284492a8e0f36720557','baseSourceSHA256':BASE_SHA,'preSealSHA256':PRE_SEAL_SHA,'sourceSHA256':sha(out.read_bytes()),'contentRevision':revision,'patchSHA256':PATCH_SHA,'removedLiteralBytes':51,'bytes':out.stat().st_size,'scope':'Only the standalone external-ranking notice is empty; all other source bytes differ only in the content revision.'}
 (out.parent/'source-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
