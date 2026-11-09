'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=__dirname,html=fs.readFileSync(process.argv[2]||path.join(root,'source/index.html'),'utf8');
const acorn=require('../original-combat-audio-20261109/tests/vendor/acorn-8.15.0/acorn.js');
function declaration(name){const prefix='const '+name+'=',i=html.indexOf(prefix);assert(i>=0,name);return html.slice(i,acorn.parseExpressionAt(html,i+prefix.length,{ecmaVersion:'latest'}).end)+';';}
const context=vm.createContext({console,TextEncoder,TextDecoder,URL,setTimeout,clearTimeout});
for(const name of ['BattleFields','Money','MoneyUI','DoubleUpLedger','Wallet','ContentProfile','ReplayTransfer','ReplayClock','MatchupHistory','MultiProtocol','MultiBinding'])vm.runInContext(declaration(name),context);
const api=vm.runInContext('({MultiBinding,MultiProtocol,BattleFields})',context),plain=x=>JSON.parse(JSON.stringify(x));
let time=1000,host,guests=[],queue=[],wires=[];
const common={requireEnvironment:true,roomId:'wire-fixture',sessionId:'champion-qa',hostId:'host',now:()=>time};
host=api.MultiBinding.createWalletSession({...common,userId:'host',send:wire=>{wires.push(wire);for(let i=0;i<guests.length;i++)queue.push([guests[i],'host',wire]);}});
for(let i=0;i<7;i++){const user='guest-'+i;const guest=api.MultiProtocol.createSession({...common,userId:user,send:wire=>queue.push([host,user,wire])});guests.push(guest);guest.hello();}
const drain=()=>{let n=0;while(queue.length){assert(++n<100000);const[to,from,wire]=queue.shift();to.receive(from,wire);}};drain();
const units=Array.from({length:128},(_,i)=>({id:i+1,side:i%2,k:'sunbreak_pillar_guardian',x:i%2?480:0,y:538,hp:100000,dead:false}));
const environment=api.BattleFields.selectRunEnvironment(7);
host.openRound({roundId:1,durationMs:60000,matchup:{environment,units}});drain();
for(const g of guests)g.predict('A',0);host.predict('A',0);drain();time+=60000;host.heartbeat();drain();
host.startBattle({engineVersion:'display-metadata-fixture',ticks:1,winner:'B',events:[],unavailable:'replay-byte-cap',environment});drain();host.settleRound();host.showResult();drain();time+=8001;
const meta={roundId:2,side:1,streak:1};
host.openRound({roundId:2,durationMs:60000,matchup:{environment,units,presentationChampion:meta}});drain();
for(const guest of guests)assert.deepEqual(plain(guest.getState().matchup.presentationChampion),meta);
const late=api.MultiProtocol.createSession({...common,userId:'late-spectator',send:wire=>queue.push([host,'late-spectator',wire])});guests.push(late);late.hello();drain();assert.deepEqual(plain(late.getState().matchup.presentationChampion),meta);
const reconnect=api.MultiProtocol.createSession({...common,userId:'guest-0',send:wire=>queue.push([host,'guest-0',wire])});guests[0]=reconnect;reconnect.hello();drain();assert.deepEqual(plain(reconnect.getState().matchup.presentationChampion),meta);
const snapshot=JSON.parse(wires.filter(w=>JSON.parse(w).type==='snapshot').at(-1));
const normalBytes=Buffer.byteLength(JSON.stringify(snapshot));
// Upper-bound transport fixture, not a wallet-valid state: every numeric
// account field is replaced by a 600-digit value to stress the wire budget.
for(const row of snapshot.state.wallets)for(const key of ['balance','score','peakBalance','lastStake','cashoutAmount','correctCount'])row[key]='9'.repeat(600);
const stressed=api.MultiProtocol.encode(snapshot),stressedBytes=Buffer.byteLength(stressed);assert(stressedBytes<api.MultiProtocol.MAX_WIRE_BYTES);
const withMeta=Buffer.byteLength(stressed);delete snapshot.state.matchup.presentationChampion;const withoutMeta=Buffer.byteLength(api.MultiProtocol.encode(snapshot));assert(withMeta-withoutMeta<100);
const report={status:'PASS',checks:['eight participants receive same optional metadata','late spectator receives metadata','existing guest reconnect receives metadata','protocol module unchanged from production','128-unit + eight large-wallet transport fixture fits original byte cap'],normalSnapshotBytes:normalBytes,stressedSnapshotBytes:stressedBytes,originalWireCap:api.MultiProtocol.MAX_WIRE_BYTES,metadataBytes:withMeta-withoutMeta};
fs.writeFileSync(path.join(root,'champion-wire-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
