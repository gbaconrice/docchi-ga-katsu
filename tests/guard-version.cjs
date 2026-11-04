const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
vm.runInContext(\`{
 const host=MultiBinding.createWalletSession({roomId:'guard-compat',sessionId:'guard-session',hostId:'host',userId:'host',members:['host'],send:()=>{},now:()=>1000});
 const old='5e8677333318641a47d41cc4da611f905352583f8a491373e148d0bad0144c3a';
 if(ContentProfile.CONTENT_REVISION===old)throw Error('revision was not updated');
 const wire=MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'guard-compat',sessionId:'guard-session',type:'hello',contentRevision:old});
 if(host.receive('old-peer',wire)!==false||host.getCompatibilityErrors()['old-peer']!=='content-revision-mismatch'||host.getState().participants.includes('old-peer'))throw Error('previous version joined');
 console.log('PASS exact previous revision rejected before room participation');
}\`,context);
`)(require,assert);
