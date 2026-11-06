const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const revision=html.match(/const CONTENT_REVISION="([a-f0-9]{64})";/)[1];
const oldUI='ffa32f9ae924b37622ffc0ee372e3f99f38fc3f8aec23dfd62a888ae3fa451dd';
assert.notEqual(revision,oldUI,'UI-only and unrefreshed Claude builds must not share this candidate identity');
const normalized=html.replace(/const CONTENT_REVISION="[a-f0-9]{64}";/,'const CONTENT_REVISION="'+'0'.repeat(64)+'";');
assert.equal(revision,crypto.createHash('sha256').update('docchi-integrated-candidate-v1\0'+normalized).digest('hex'));
const manifest=JSON.parse(fs.readFileSync('INTEGRATION_CANDIDATE_MANIFEST.json','utf8'));
assert.equal(manifest.contentRevision,revision);assert.equal(manifest.sources.mechanicsCommit,'346ec2d43bf6fbf705cc47ced997e104265d2ba4');
const harness=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',harness+`
vm.runInContext(\`{
 const host=MultiBinding.createWalletSession({roomId:'combined-review',sessionId:'combined-session',hostId:'host',userId:'host',members:['host'],send:()=>{},now:()=>1000});
 const wire=MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'combined-review',sessionId:'combined-session',type:'hello',contentRevision:'${oldUI}'});
 if(host.receive('old-peer',wire)!==false||host.getCompatibilityErrors()['old-peer']!=='content-revision-mismatch'||host.getState().participants.includes('old-peer'))throw Error('old UI/boss peer joined');
}\`,context);
`)(require,assert);
console.log('PASS full-source fingerprint, fixed mechanics provenance and rejection of old UI/unrefreshed boss revision before room participation');
