'use strict';
// Dependency-free focused runtime test. Usage: node test-lobby-copy.cjs [HTML]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=path.resolve(process.argv[2]||process.env.GAME_HTML||path.join(__dirname,'../validation/lobby-copy/index.html'));
const source=fs.readFileSync(html,'utf8');
assert(!source.includes('参加者がそろったら、対戦を始められます。'));
assert(!source.includes('参加者が揃ったら、対戦を始められます。'));
assert.match(source,/<p id="roomLobbyWait"[^>]*\bhidden[^>]*><\/p>/);
assert.match(source,/\[hidden\]\s*\{\s*display:\s*none\s*!important\s*;\s*\}/);
assert(!source.includes("row.id===multiUser?'あなた':''].filter(Boolean).join(' · ')"));
for(const [i,m]of [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())new vm.Script(m[1],{filename:'script-'+i});
console.log('PASS sentence removed; initial status hidden; global hidden rule removes its layout box; embedded scripts compile');

class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.hidden=false;this.disabled=false;this._text='';}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 set textContent(value){this._text=String(value);this.children=[];}
 appendChild(n){if(n.parentNode){const i=n.parentNode.children.indexOf(n);if(i>=0)n.parentNode.children.splice(i,1);}this.children.push(n);n.parentNode=this;return n;}
 insertBefore(n){return this.appendChild(n);}
 replaceChildren(...children){this._text='';this.children=[];for(const n of children)this.appendChild(n);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
}
const ids=['app','roomScreen','roomLobby','roomEntry','roomTitle','createRoom','joinRoom','roomId','publicRooms','multiStatusRow','roomLobbyStatusDock','multiSummary','gameScreen','roomStatus','roomScoreStatus','backHome','exitRoom','beginRound','roomLobbyCodeRow','roomLobbyCode','roomLobbyCount','roomLobbyMembers','roomLobbyWait'];
const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));nodes.app.appendChild(nodes.multiStatusRow);nodes.roomLobbyWait.hidden=true;
const profiles={host:{name:'ホストの実名',avatarUrl:'https://example.com/host.png'},guest:{name:'ゲストの実名',avatarUrl:'https://example.com/guest.png'},other:{name:'別の参加者',avatarUrl:'https://example.com/other.png'},watcher:{name:'観戦者の実名',avatarUrl:'https://example.com/watcher.png'}};
const adapter={getHostId:()=>'host',getRoomId:()=>'native-room-code',getProfile:id=>profiles[id]||null,isRestartPending:()=>false};
const initial={phase:'lobby',roundId:null,participants:['host','guest','other'],spectators:['watcher'],departedIds:[]};
const context=vm.createContext({URL,document:{querySelector:id=>nodes[id.slice(1)],createElement:tag=>new Element(tag)},multiSnapshot:structuredClone(initial),multiSession:{},multiAdapter:adapter,multiHost:true,multiUser:'host',multiBusy:false,multiError:'',multiUnavailableRound:null,roomEntryPending:false,roomEntryKind:null,roomExitPending:false,screenMode:'room',mockGuest:false,nativeJoined:false});
context.nativeRoomNeedsExit=()=>context.nativeJoined;
const start=source.indexOf('function roomLobbyMembers(s){'),end=source.indexOf('\nfunction cancelRoomEntry(){',start);
assert(start>=0&&end>start,'expected exact lobby function boundaries');
vm.runInContext(source.slice(start,end),context);
const render=()=>vm.runInContext('renderMultiRoomLobby()',context);
const member=id=>nodes.roomLobbyMembers.children.find(n=>n.dataset.userId===id);
const role=id=>member(id).children[2].textContent;
const name=id=>member(id).children[1].textContent;
const wait=(value,hidden=false)=>{assert.equal(nodes.roomLobbyWait.textContent,value);assert.equal(nodes.roomLobbyWait.hidden,hidden);};
const originalSnapshot=JSON.stringify(context.multiSnapshot);
render();
assert.equal(nodes.roomLobby.hidden,false);assert.equal(nodes.roomEntry.hidden,true);
assert.equal(nodes.roomLobbyMembers.children.length,8);assert.equal(nodes.roomLobbyCount.textContent,'4/8');
assert.equal(role('host'),'ホスト');assert.equal(role('guest'),'参加中');assert.equal(role('other'),'参加中');assert.equal(role('watcher'),'観戦');
for(const id of Object.keys(profiles)){
 assert.equal(name(id),profiles[id].name);assert.equal(member(id).children[1].title,profiles[id].name);
 const [fallback,img]=member(id).children[0].children;
 assert.equal(img.src,profiles[id].avatarUrl);assert.equal(img.referrerPolicy,'no-referrer');assert.equal(img.hidden,true);
 img.onload();assert.equal(img.hidden,false);assert.equal(fallback.hidden,true);
 img.onerror();assert.equal(img.hidden,true);assert.equal(fallback.hidden,false);
}
wait('',true);assert.equal(nodes.beginRound.hidden,false);assert.equal(nodes.beginRound.disabled,false);
assert.equal(nodes.roomLobbyCode.textContent,'native-room-code');assert.equal(nodes.exitRoom.hidden,false);
const originalMembers=nodes.roomLobbyMembers.children;render();assert.equal(nodes.roomLobbyMembers.children,originalMembers,'repeat render keeps cached profiles');
assert.equal(JSON.stringify(context.multiSnapshot),originalSnapshot,'render does not mutate canonical membership');
console.log('PASS host/self, guest/other and spectator roles; original names, avatars, member cache, membership and controls retained');

context.multiHost=false;context.multiUser='guest';render();assert.equal(role('host'),'ホスト');assert.equal(role('guest'),'参加中');wait('ホストが対戦を始めるまでお待ちください。');assert.equal(nodes.beginRound.hidden,true);
context.multiUser='watcher';render();assert.equal(role('watcher'),'観戦');
context.multiUser='host';context.multiHost=true;render();wait('',true);
const knownProfile=profiles.host;delete profiles.host;render();assert.equal(name('host'),'あなた','existing fallback name is preserved');assert.equal(role('host'),'ホスト');profiles.host=knownProfile;render();assert.equal(name('host'),knownProfile.name);
console.log('PASS guest/self and spectator/self omit only the redundant role suffix; existing fallback name is untouched');

for(const [kind,message]of [['create','ルームを作成中…'],['join','ルームに参加中…']]){context.roomEntryPending=true;context.roomEntryKind=kind;render();wait(message);assert.equal(nodes.beginRound.disabled,true);}
context.roomEntryPending=false;adapter.isRestartPending=()=>true;render();wait('参加者の接続を確認しています…');assert.equal(nodes.beginRound.disabled,true);
adapter.isRestartPending=()=>false;render();wait('',true);assert.equal(nodes.beginRound.disabled,false);
context.multiSnapshot.roundId=10;render();wait('もう一度遊ぶと、新しい対戦を準備します。');
for(const reason of ['host-lost','host-timeout','transport-error']){context.multiSnapshot.phase='stopped';context.multiSnapshot.stoppedReason=reason;render();wait(reason==='transport-error'?'接続が停止しています。退出して参加し直してください。':'ホストとの接続が切れました。退出して参加し直してください。');assert.equal(nodes.beginRound.hidden,true);}
context.multiSnapshot.phase='predict';render();wait('対戦に参加しています。');assert.equal(nodes.beginRound.hidden,true);
context.multiSnapshot=structuredClone(initial);render();wait('',true);
context.multiBusy=true;render();assert.equal(nodes.beginRound.disabled,true);context.multiBusy=false;
context.roomExitPending=true;render();assert.equal(nodes.beginRound.disabled,true);assert.equal(nodes.exitRoom.disabled,true);context.roomExitPending=false;
console.log('PASS create/join/restart/stopped/playing status text and busy/exit controls; host blank hides again after every status transition');

context.multiSession=null;context.nativeJoined=true;render();wait('退出を完了してから、参加し直してください。');assert.equal(nodes.beginRound.hidden,true);
context.nativeJoined=false;render();assert.equal(nodes.roomLobby.hidden,true);assert.equal(nodes.roomEntry.hidden,false);assert.equal(nodes.beginRound.hidden,true);
context.screenMode='home';render();assert.equal(nodes.multiStatusRow.hidden,true);
context.multiSession={};context.multiSnapshot=structuredClone(initial);context.screenMode='room';render();wait('',true);assert.equal(nodes.roomLobbyMembers.children.length,8);
context.screenMode='game';render();assert.equal(nodes.multiStatusRow.parentNode,nodes.app);
console.log('PASS residual native membership, hidden entry/home states, leave/rejoin and status relocation');
console.log('PASS lobby-copy focused checks: '+path.basename(html));
