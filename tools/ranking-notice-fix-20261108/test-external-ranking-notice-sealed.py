"""Independently verify the content reseal adds no changes beyond notice removal."""
from pathlib import Path
import hashlib
import re
import sys
HERE = Path(__file__).resolve().parent
BASE_SHA = 'ff7862a0193b266463bf699edc8844b7ce30b7c9fb03e283462542f6d0f4985f'
PRE_SEAL_SHA = '55ecf6a2d0aa3088f10454f0f6a5df05f31c1a4fe679c9ce0d4fb865c3cd9005'
FINAL_SHA = '6283b7ec63b7e8c876ce6bff3377fbacfa9248df7c17ac8d08c861e9331ed3a4'
REVISION = '9af77ea21e75902e547beeb43706834c47f5770ce96aa6978b1c35a7b2f42d75'
base = Path(sys.argv[2]) if len(sys.argv)>2 else HERE.parents[1]/'terrain-emote-feedback/source-fixed-final/index.html'
final = Path(sys.argv[1]) if len(sys.argv)>1 else HERE.parent/'source-final/index.html'
b = base.read_bytes()
a = final.read_bytes()
sha = lambda x: hashlib.sha256(x).hexdigest()
assert sha(b) == BASE_SHA
assert sha(a) == FINAL_SHA
old = "result.status==='standalone'?'外部ランキングには送信していません'".encode()
new = "result.status==='standalone'?''".encode()
assert b.count(old) == 1 and new not in b
preseal = b.replace(old,new,1)
assert sha(preseal) == PRE_SEAL_SHA
pattern = rb'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)'
assert len(re.findall(pattern,preseal)) == len(re.findall(pattern,a)) == 1
normalized = re.sub(pattern,lambda m:m[1]+b'0'*64+m[2],preseal)
revision = sha(b'docchi-boss-abilities-v1\0'+normalized)
assert revision == REVISION
expected = re.sub(pattern,lambda m:m[1]+revision.encode()+m[2],preseal)
assert a == expected, 'Only the 51-byte notice deletion and verified content revision may differ'
assert len(b)-len(a) == 51
assert re.sub(pattern,lambda m:m[1]+b'0'*64+m[2],a) == normalized
print('PASS frozen sealed SHA and independent exact content-revision calculation')
print('PASS final source differs only by the 51-byte requested notice deletion and deterministic revision reseal')
print('Final SHA256',sha(a))
print('Content revision',revision)
