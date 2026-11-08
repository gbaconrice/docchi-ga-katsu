'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const file=path.resolve(process.env.GAME_HTML||path.join(__dirname,'../validation/lobby-copy/index.html'));
const baseline=path.resolve(process.env.BASELINE_HTML||path.join(root,'battle-ui-feedback/source/index.html'));
const html=fs.readFileSync(file,'utf8'),before=fs.readFileSync(baseline,'utf8');
process.env.GAME_HTML=file;
const {ev,nodes,context}=require(process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||path.join(root,'tools/boss-abilities/tests/harness.cjs'));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function block(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start+a.length);assert(start>=0&&end>start,a);return text.slice(start,end);}
function mount(parent,child,before){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(x=>x!==child);parent.children??=[];const at=before?parent.children.indexOf(before):-1;if(at<0)parent.children.push(child);else parent.children.splice(at,0,child);child.parentNode=parent;return child;}
function enhance(n){n.children??=[];n.attributes??={};n.appendChild=function(c){return mount(this,c);};n.insertBefore=function(c,b){return mount(this,c,b);};n.replaceChildren=function(...c){for(const old of this.children)old.parentNode=null;this.children=[];for(const child of c)this.appendChild(child);};n.setAttribute=function(k,v){this.attributes[k]=String(v);};n.getAttribute=function(k){return this.attributes[k]??null;};return n;}
for(const n of nodes.values())enhance(n);
const select=context.document.querySelector;context.document.querySelector=s=>enhance(select(s));
context.document.createElement=tag=>enhance({tagName:tag.toUpperCase(),textContent:'',hidden:false,disabled:false,dataset:{},style:{},className:'',classList:{add(){},remove(){},toggle(){}}});
context.URL=URL;context.crypto=require('node:crypto').webcrypto;context.Event=class Event{constructor(type){this.type=type;}};
const q=id=>nodes.get(id)||ev('document.querySelector('+JSON.stringify(id)+')');
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const textTree=node=>[node.textContent||'',...(node.children||[]).map(textTree)].join(' ');
const members=()=>q('#roomLobbyMembers').children.filter(n=>!n.className.includes('is-empty'));
const nativeOps=s=>[...s.matchAll(/sdk\.room\.(create|join|exit|getPublicRoomList)\(([^)]*)\)/g)].map(m=>m[0]);

test('one start button lives in the dedicated lobby, not room entry',()=>{
 assert.equal((html.match(/id="beginRound"/g)||[]).length,1);
 const room=block(html,'<section id="roomScreen"','<section id="gameScreen"');
 assert(room.indexOf('id="roomEntry"')<room.indexOf('id="roomLobby"'));
 assert(room.indexOf('id="roomLobby"')<room.indexOf('id="beginRound"'));
 assert(room.includes('aria-label="ルームロビー"'));assert(room.includes('aria-label="参加者一覧"'));
});
test('native create/join/exit/list arguments and invitation integration are unchanged',()=>{
 assert.deepEqual(nativeOps(html),nativeOps(before));
 assert.equal(block(html,'async function loadNativeSDKRaw(){','let nativeSdkPending'),block(before,'async function loadNativeSDKRaw(){','let nativeSdkPending'));
 const nativeInvitation=s=>[...s.matchAll(/(?:AgentSDK|sdk)\.[\w.]*?(?:invite|Invite|share|Share)[\w.]*\([^;\n]*/g)].map(x=>x[0]);
 assert.deepEqual(nativeInvitation(html),nativeInvitation(before));
});
test('simulation, betting, canonical start and replay pump stay byte-identical',()=>{
 for(const [a,b] of [['function openMultiRound(){','function buildCanonicalReplay'],['function pumpMulti(','loop=function(t)'],['    memberLeft(id){','    close(){stop(\'closed\');}']])assert.equal(block(html,a,b),block(before,a,b),a);
});

async function installFake({failExit=false,pendingEntry=false,pendingExit=false}={}){
 context.fake={creates:0,joins:0,exits:0,joined:false,roomId:null,hostId:null,failExit,pendingEntry,pendingExit,profiles:{host:{name:'ホストの名前',avatarUrl:'https://example.com/host.png'},guest:{name:'参加者の名前',avatarUrl:'https://example.com/guest.png'}}};
 ev(`multiSession=null;multiSnapshot=null;multiHost=false;multiUser=null;mockGuest=null;mockQueue=[];multiBusy=false;multiRecording=false;roomExitPending=false;roomEntryPending=false;roomEntryKind=null;multiRoundSeen=null;lastScreenPhase=null;state='choose';
 multiAdapter={userId:'host',isNativeJoined:()=>fake.joined,getHostId:()=>fake.hostId,getProfile:id=>fake.profiles[id]||null,getRoomId:()=>fake.roomId,isRestartPending:()=>false,
  create:async()=>{fake.creates++;fake.hostId='host';fake.roomId='room-123';if(fake.pendingEntry)await new Promise(r=>fake.finishEntry=r);fake.joined=true;return MultiBinding.createWalletSession({requireEnvironment:true,roomId:fake.roomId,sessionId:'native-'+fake.creates,userId:'host',hostId:'host',members:['host','guest'],send:()=>{},onChange:receiveNativeMultiChange});},
  join:async id=>{fake.joins++;fake.hostId='creator';fake.roomId=id;if(fake.pendingEntry)await new Promise(r=>fake.finishEntry=r);fake.joined=true;return MultiBinding.createWalletSession({requireEnvironment:true,roomId:id,sessionId:'guest-'+fake.joins,userId:'host',hostId:'creator',members:['creator','host'],send:()=>{},onChange:receiveNativeMultiChange});},
  exit:async()=>{fake.exits++;if(fake.pendingExit)await new Promise(r=>fake.finishExit=r);if(fake.failExit)throw Error('通信エラー');fake.joined=false;fake.roomId=null;}};
 document.querySelector('#roomStatus').textContent='';showScreen('room');renderMultiRoomLobby();`);
}

(async()=>{
 await installFake();
 test('entry shows create/join and hides lobby/start/exit before native admission',()=>{assert(!q('#roomEntry').hidden);assert(q('#roomLobby').hidden);assert(q('#beginRound').hidden);assert(q('#exitRoom').hidden);});
 await ev("enterNative('create')");
 ev("multiSession.receive('guest',MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'room-123',sessionId:multiSnapshot.sessionId,type:'hello'}));");
 test('host create opens dedicated roster lobby and disables duplicate entry controls',()=>{
  assert(q('#roomEntry').hidden);assert(!q('#roomLobby').hidden);assert(q('#publicRooms').hidden);
  assert(q('#createRoom').disabled&&q('#joinRoom').disabled);assert(q('#backHome').hidden);
  assert.equal(q('#roomLobbyCode').textContent,'room-123');assert.equal(q('#roomTitle').textContent,'ルームロビー');
  assert.equal(q('#beginRound').hidden,false);assert.equal(q('#beginRound').disabled,false);
  assert.equal(q('#roomLobbyWait').textContent,'');assert.equal(q('#roomLobbyWait').hidden,true);
  assert.equal(ev('multiSnapshot.phase'),'lobby');assert.equal(ev('multiSnapshot.roundId'),null);assert.equal(context.fake.creates,1);
 });
 test('native member identity and explicit creator label render without ID guessing',()=>{
  assert.equal(members().length,2);assert.equal(q('#roomLobbyCount').textContent,'2/8');
  assert(textTree(members()[0]).includes('ホストの名前'));assert.equal(members()[0].children[2].textContent,'ホスト');
  assert(textTree(members()[1]).includes('参加者の名前'));assert.equal(q('#roomLobbyMembers').children.length,8);
  assert.equal(q('#multiStatusRow').parentNode,q('#roomLobbyStatusDock'));assert(q('#multiSummary').hidden);
 });
 test('profile image failure shows a real name fallback and never changes session',()=>{
  const img=members()[0].children[0].children[1],fallback=members()[0].children[0].children[0],old=ev('multiSession');
  assert.equal(img.referrerPolicy,'no-referrer');img.onload();assert(!img.hidden&&fallback.hidden);img.onerror();assert(img.hidden&&!fallback.hidden);
  assert.equal(ev('multiSession'),old);
 });
 test('live profile changes refresh safely; hostile names remain literal text',()=>{
  context.fake.profiles.guest={name:'<img src=x onerror=alert(1)>',avatarUrl:'javascript:alert(1)'};ev('renderMultiRoomLobby()');
  const row=members()[1];assert.equal(row.children[1].textContent,'<img src=x onerror=alert(1)>');assert.equal(row.children[0].children.length,1);
 });
 test('opening the room menu during play retains a return-to-match action',()=>{
  ev("multiSnapshot={...multiSnapshot,phase:'predict'};showScreen('room')");assert(!q('#backHome').hidden);assert.equal(q('#backHome').textContent,'対戦に戻る');
  q('#backHome').onclick();assert.equal(ev('screenMode'),'game');assert.equal(q('#exitRoom').textContent,'退出');
  ev("multiSnapshot=multiSession.getState();showScreen('room')");assert(q('#backHome').hidden);
 });
 await ev("enterNative('create')");await ev("enterNative('join')");
 test('repeated room entry cannot create a second native room',()=>{assert.equal(context.fake.creates,1);assert.equal(context.fake.joins,0);});
 ev("multiSession.memberLeft('guest');");
 test('departure removes visible presence while keeping the canonical ledger seat',()=>{assert.equal(members().length,1);assert.equal(q('#roomLobbyCount').textContent,'1/8');assert(ev("multiSnapshot.participants.includes('guest')"));assert(ev("multiSnapshot.departedIds.includes('guest')"));});
 ev("multiSession.receive('guest',MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,contentRevision:ContentProfile.CONTENT_REVISION,roomId:'room-123',sessionId:multiSnapshot.sessionId,type:'hello'}));");
 test('same admitted member rejoin restores presence once without duplicate seats',()=>{assert.equal(members().length,2);assert.equal(ev("multiSnapshot.participants.filter(id=>id==='guest').length"),1);assert(!ev("multiSnapshot.departedIds.includes('guest')"));});
 ev("multiSession.close();displayMultiState();");
 test('stopped room goes to lobby with no start or creation controls',()=>{assert.equal(ev('screenMode'),'room');assert(q('#beginRound').hidden);assert(q('#roomEntry').hidden);assert(q('#roomLobbyWait').textContent.includes('参加し直してください'));});
 await ev('leaveMulti()');
 test('explicit exit cleans up membership and returns home without launching solo',()=>{assert.equal(context.fake.exits,1);assert.equal(ev('multiSession'),null);assert.equal(ev('screenMode'),'home');assert.equal(q('#roomId').value,'');assert(q('#exitRoom').hidden);assert(!q('#roomEntry').hidden);});
 await installFake();q('#roomId').value='guest-room';await ev("enterNative('join')");
 test('guest sees waiting state and creator-only start stays hidden',()=>{assert.equal(context.fake.joins,1);assert.equal(q('#roomLobbyCode').textContent,'guest-room');assert(q('#beginRound').hidden);assert(q('#roomEntry').hidden);assert(q('#roomLobbyWait').textContent.includes('ホストが対戦を始めるまで'));});
 test('calling start as guest cannot advance canonical phase',()=>{const old=ev('multiSession.getState().revision');ev('openMultiRound()');assert.equal(ev('multiSession.getState().revision'),old);assert.equal(ev('multiSession.getState().phase'),'lobby');});
 ev("multiSession.memberLeft('creator');displayMultiState();");
 test('host departure does not migrate ownership or expose start to guest',()=>{assert.equal(ev('multiSnapshot.stoppedReason'),'host-lost');assert(q('#beginRound').hidden);assert(q('#roomLobbyWait').textContent.includes('ホストとの接続が切れました'));});
 await ev('leaveMulti()');
 await installFake({pendingEntry:true});
 const first=ev("enterNative('create')");await drain();
 test('in-flight create shows one waiting lobby with cancel and blocks repeat taps',()=>{assert(q('#roomEntry').hidden);assert(!q('#roomLobby').hidden);assert(q('#beginRound').hidden);assert(!q('#backHome').hidden);assert.equal(q('#backHome').textContent,'キャンセル');assert(q('#roomLobbyWait').textContent.includes('作成中'));});
 await ev("enterNative('create')");assert.equal(context.fake.creates,1);
 ev('cancelRoomEntry()');
 const oldRound=ev('round');ev("receiveNativeMultiChange({phase:'predict',roundId:99,participants:[],wallets:[]})");
 test('canceled native callback cannot replace a newer screen or solo round',()=>{assert.equal(ev('screenMode'),'home');assert.equal(ev('round'),oldRound);assert.equal(ev('multiSession'),null);});
 context.fake.finishEntry();await first;
 test('late create completion is exited rather than reopening canceled lobby',()=>{assert.equal(context.fake.exits,1);assert.equal(context.fake.joined,false);assert.equal(ev('multiSession'),null);assert.equal(ev('screenMode'),'home');assert.equal(ev('multiBusy'),false);});
 context.fake.pendingEntry=false;ev("showScreen('room')");await ev("enterNative('create')");
 test('create after canceled request completes normally with fresh session',()=>{assert.equal(context.fake.creates,2);assert(ev('multiSession'));assert.equal(ev('screenMode'),'room');assert.equal(q('#beginRound').disabled,false);});
 context.fake.failExit=true;await ev('leaveMulti()');
 test('exit failure keeps existing room and retry visible, never shows create controls',()=>{assert(ev('multiSession'));assert(context.fake.joined);assert(q('#roomEntry').hidden);assert(!q('#exitRoom').hidden);assert(!q('#exitRoom').disabled);assert(q('#roomStatus').textContent.includes('もう一度退出'));});
 context.fake.failExit=false;context.fake.pendingExit=true;const exiting=ev('leaveMulti()');await drain();const exits=context.fake.exits;await ev('leaveMulti()');
 test('repeated exit is serialized and gives pending button feedback',()=>{assert.equal(context.fake.exits,exits);assert(q('#exitRoom').disabled);assert.equal(q('#exitRoom').textContent,'退出中…');});
 context.fake.finishExit();await exiting;assert.equal(ev('screenMode'),'home');
 await installFake({pendingEntry:true,failExit:true});const canceled=ev("enterNative('create')");await drain();ev('cancelRoomEntry()');context.fake.finishEntry();await canceled;
 test('canceled join cleanup failure presents exit recovery and blocks another native entry',()=>{assert.equal(ev('screenMode'),'room');assert.equal(ev('multiSession'),null);assert(context.fake.joined);assert(q('#roomEntry').hidden);assert(!q('#exitRoom').hidden);assert(q('#roomStatus').textContent.includes('退出を完了できません'));});
 await ev("enterNative('create')");assert.equal(context.fake.creates,1);context.fake.failExit=false;await ev('leaveMulti()');
 await installFake({pendingEntry:true});q('#roomId').value='interrupted-join';const joined=ev("enterNative('join')");await drain();await ev("enterNative('join')");
 test('pending join blocks repeated join and shows participant waiting state',()=>{assert.equal(context.fake.joins,1);assert(q('#roomEntry').hidden);assert(q('#roomLobbyWait').textContent.includes('参加中'));});
 ev('cancelRoomEntry()');context.fake.finishEntry();await joined;
 test('canceling a join cleans up the late native membership exactly once',()=>{assert.equal(context.fake.exits,1);assert.equal(ev('multiSession'),null);assert.equal(ev('screenMode'),'home');assert.equal(context.fake.joined,false);});
 await installFake();ev("multiAdapter=null;loadNativeSDK=()=>new Promise(r=>fake.finishSDK=r)");const canceledSDK=ev("enterNative('create')");await drain();ev('cancelRoomEntry()');context.fake.finishSDK({});await canceledSDK;
 test('cancel during SDK load never installs room adapter or calls create',()=>{assert.equal(context.fake.creates,0);assert.equal(ev('multiAdapter'),null);assert.equal(ev('screenMode'),'home');});
 console.log(`PASS ${passed} lobby checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
