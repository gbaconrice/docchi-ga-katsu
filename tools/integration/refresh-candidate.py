"""Refresh an unpublished combined candidate. Never modifies published metadata.
Run from the directory containing index.html. The fingerprint is idempotent:
SHA256(prefix + LF HTML with CONTENT_REVISION normalized to 64 zeroes).
After merging more source changes, run again before compatibility/replay tests.
"""
from pathlib import Path
import hashlib, json, re
root=Path.cwd(); p=root/'index.html'; html=p.read_text()
pattern=r'const CONTENT_REVISION="[a-f0-9]{64}";'
assert len(re.findall(pattern,html))==1, 'Expected exactly one content revision'
normalized=re.sub(pattern,'const CONTENT_REVISION="'+'0'*64+'";',html,count=1)
revision=hashlib.sha256(b'docchi-integrated-candidate-v1\0'+normalized.encode()).hexdigest()
html=re.sub(pattern,f'const CONTENT_REVISION="{revision}";',html,count=1)
p.write_text(html)
published=json.loads((root/'CURRENT_PREVIEW_MANIFEST.json').read_text())
manifest={
 'status':'unpublished',
 'baseCommit':'029846150bef21e703025f795895b58300b3bb89',
 'publishedIndexSHA256':published['indexSHA256'],
 'candidateIndexSHA256':hashlib.sha256(html.encode()).hexdigest(),
 'contentRevision':revision,
 'revisionMethod':'SHA256(docchi-integrated-candidate-v1\\0 + LF HTML with CONTENT_REVISION normalized to 64 zeroes)',
 'compatibility':'New selection snapshot fields are required; all room participants must use this same final build.',
 'validation':'See ../INTEGRATION_REVIEW.md and ../evidence. This is not a deployment record.'
}
(root/'INTEGRATION_CANDIDATE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
