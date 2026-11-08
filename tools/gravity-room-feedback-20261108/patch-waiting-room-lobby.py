"""Separate room entry from the joined lobby without changing native room APIs.

Reference: gbaconrice/number-bluff at 45a066814e815da81331a9a2efdeca877d07ecdc,
app.js renderLobby/requestRoom/exitRoom and gravity-room-adapter.js enter/leave.
Only the presentation/lifecycle pattern is borrowed; docchi's protocol, wager
rules, invitation integration, host ownership and departure policies remain.
"""

CSS = r'''
/* waiting-room-lobby-20261108: entry and established room are distinct views. */
#app #roomEntry > .cta, #app #roomLobby > .cta { width:100%; margin-block:4px; }
#app #roomLobby[hidden], #app #roomEntry[hidden] { display:none !important; }
#app #roomScreen[data-room-view="lobby"] #roomTitle { margin-bottom:12px; }
.room-lobby-code { margin:0 0 16px; color:#57412b; font-size:12px; }
.room-lobby-code strong { display:block; margin-top:3px; color:#39291b; font-size:16px; font-weight:600; overflow-wrap:anywhere; user-select:text; }
.room-lobby-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:0 0 10px; }
.room-lobby-heading h3 { margin:0; color:#39291b; font-size:15px; }
.room-lobby-heading span { color:#57412b; font-size:13px; }
.room-lobby-members { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px 7px; margin:0; padding:0; list-style:none; }
.room-lobby-member { display:flex; flex-direction:column; align-items:center; min-width:0; gap:4px; padding:7px 3px; border:1px solid #c7af83; background:#faf1dd; text-align:center; }
.room-lobby-avatar { display:grid; place-items:center; position:relative; flex:none; width:42px; height:42px; overflow:hidden; border:1px solid #bca174; border-radius:50% !important; background:#e1d2af; color:#57412b; font-size:18px; }
.room-lobby-avatar img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.room-lobby-name { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; width:100%; min-height:2.6em; color:#39291b; font-size:12px; line-height:1.3; font-weight:600; overflow-wrap:anywhere; }
.room-lobby-role { color:#6a5639; font-size:10px; line-height:1.3; }
.room-lobby-member.is-empty { justify-content:center; min-height:108px; border-style:dashed; background:transparent; color:#8a795d; font-size:11px; }
.room-lobby-member.is-empty .room-lobby-avatar { background:transparent; border-style:dashed; opacity:.65; }
.room-lobby-wait { margin:14px 0 10px; color:#57412b; font-size:13px; line-height:1.5; text-align:center; }
#app #roomScreen #multiStatusRow { display:flex; flex-direction:column; align-items:stretch; gap:0; margin:12px 0 0; padding:0; border:0; border-top:1px solid #c7af83; color:#57412b; background:none; }
#app #roomScreen #multiStatusRow .status-line { color:#6a3c24; font-size:12px; white-space:normal; overflow:visible; }
#app #roomScreen #multiStatusRow:not(:has(#roomStatus:not(:empty), #roomScoreStatus:not([hidden]):not(:empty), #roomScoreRetry:not([hidden]), #exitRoom:not([hidden]))) { display:none; }
#app #roomScreen #multiStatusRow .multi-status-content:has(> :not([hidden]):not(:empty)) { padding-top:9px; }
#app #roomScreen #exitRoom { align-self:center; min-height:44px; margin-top:5px; padding:8px 16px; border:0; background:none; color:#57412b; font-size:14px; text-decoration:underline; text-underline-offset:4px; }
#app #roomScreen #roomLobbyStatusDock:empty { display:none; }
@media(max-width:350px) {
  .room-lobby-members { gap:7px 5px; }
  .room-lobby-name { font-size:11px; }
  .room-lobby-avatar { width:37px; height:37px; }
  .room-lobby-member.is-empty { min-height:103px; }
}
'''

LOBBY = r'''    <section id="roomLobby" hidden aria-label="ルームロビー">
      <p id="roomLobbyCodeRow" class="room-lobby-code" hidden>部屋コード<strong id="roomLobbyCode"></strong></p>
      <div class="room-lobby-heading"><h3>参加者</h3><span id="roomLobbyCount"></span></div>
      <ul id="roomLobbyMembers" class="room-lobby-members" aria-label="参加者一覧"></ul>
      <p id="roomLobbyWait" class="room-lobby-wait" role="status" aria-live="polite"></p>
      <button id="beginRound" class="cta cta-primary" type="button" hidden>対戦を開始</button>
      <div id="roomLobbyStatusDock"></div>
    </section>
'''

CONTROLLER = r'''
// Joined room presentation. It reads canonical membership, never admits peers.
let roomEntryGeneration=0,roomEntryRequest=0,roomEntryPending=false,roomEntryKind=null,roomExitPending=false;
function receiveNativeMultiChange(s){if(roomEntryPending&&roomEntryRequest!==roomEntryGeneration)return;onMultiChange(s);}
function nativeRoomNeedsExit(){return !!multiAdapter?.isNativeJoined?.();}
function roomLobbyMembers(s){
 const departed=new Set(s?.departedIds||[]),participants=(s?.participants||[]).filter(id=>!departed.has(id));
 const spectators=(s?.spectators||[]).filter(id=>!departed.has(id)&&!participants.includes(id));
 return [...participants.map(id=>({id,spectator:false})),...spectators.map(id=>({id,spectator:true}))];
}
function renderMultiRoomLobby(){
 const q=id=>document.querySelector(id),s=multiSnapshot,joined=!!multiSession,occupied=joined||nativeRoomNeedsExit(),lobby=occupied||roomEntryPending;
 const root=q('#roomScreen'),panel=q('#roomLobby'),entry=q('#roomEntry');if(!root||!panel||!entry)return;
 root.setAttribute('data-room-view',lobby?'lobby':'entry');entry.hidden=lobby;panel.hidden=!lobby;
 q('#roomTitle').textContent=lobby?'ルームロビー':'みんなで遊ぶ';
 for(const id of ['#createRoom','#joinRoom','#roomId'])q(id).disabled=multiBusy||lobby;
 q('#publicRooms').hidden=screenMode!=='room'||lobby;
 const inRoom=screenMode==='room',status=q('#multiStatusRow'),dock=q('#roomLobbyStatusDock');
 if(inRoom&&lobby&&status.parentNode!==dock)dock.appendChild(status);
 else if((!inRoom||!lobby)&&status.parentNode!==q('#app'))q('#app').insertBefore?.(status,q('#gameScreen'));
 q('#multiSummary').hidden=inRoom&&lobby;
 status.hidden=screenMode==='home'||(screenMode==='game'&&!joined)||inRoom&&!lobby&&!q('#roomStatus').textContent&&!q('#roomScoreStatus').textContent&&!roomEntryPending;
 const playing=joined&&['predict','locked','battle','settle','result'].includes(s?.phase),back=q('#backHome');back.hidden=occupied&&!playing;back.disabled=false;back.textContent=roomEntryPending?'キャンセル':playing?'対戦に戻る':'ホームへ戻る';
 const exit=q('#exitRoom');exit.hidden=!occupied;exit.disabled=roomExitPending||roomEntryPending;exit.textContent=roomExitPending?'退出中…':inRoom?'退出してホームへ':'退出';
 if(!lobby){q('#beginRound').hidden=true;return;}
 const code=occupied?(multiAdapter?.getRoomId?.()||(mockGuest?'local-mock':'')):'';
 q('#roomLobbyCodeRow').hidden=!code;q('#roomLobbyCode').textContent=code||'';
 const members=roomLobbyMembers(joined?s:null),hostId=multiAdapter?.getHostId?.()||(multiHost?multiUser:null),profiles=members.map(row=>({...row,profile:multiAdapter?.getProfile?.(row.id)||null}));
 q('#roomLobbyCount').textContent=joined?members.length+'/8':'';
 const list=q('#roomLobbyMembers'),key=JSON.stringify([profiles,hostId,multiUser,joined]);
 if(list._lobbyKey!==key){
  list._lobbyKey=key;const children=[];
  profiles.forEach((row,i)=>{
   const item=document.createElement('li'),avatar=document.createElement('span'),fallback=document.createElement('span'),nameNode=document.createElement('span'),role=document.createElement('span');
   const name=row.profile?.name||(row.id===multiUser?'あなた':(row.spectator?'観戦者':'参加者')+(i+1));
   item.className='room-lobby-member';item.dataset.userId=row.id;avatar.className='room-lobby-avatar';avatar.setAttribute('aria-hidden','true');fallback.textContent=Array.from(name)[0]||'人';avatar.appendChild(fallback);
   let url=null;try{const parsed=new URL(row.profile?.avatarUrl);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)url=parsed.href;}catch(_){}
   if(url){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.hidden=true;img.onload=()=>{img.hidden=false;fallback.hidden=true;};img.onerror=()=>{img.hidden=true;fallback.hidden=false;};img.src=url;avatar.appendChild(img);}
   nameNode.className='room-lobby-name';nameNode.textContent=name;nameNode.title=name;
   role.className='room-lobby-role';role.textContent=[row.id===hostId?'ホスト':row.spectator?'観戦':'参加中',row.id===multiUser?'あなた':''].filter(Boolean).join(' · ');
   item.appendChild(avatar);item.appendChild(nameNode);item.appendChild(role);children.push(item);
  });
  if(joined)for(let i=members.length;i<8;i++){const item=document.createElement('li'),avatar=document.createElement('span'),label=document.createElement('span');item.className='room-lobby-member is-empty';avatar.className='room-lobby-avatar';avatar.textContent='';avatar.setAttribute('aria-hidden','true');label.textContent='参加待ち';item.appendChild(avatar);item.appendChild(label);children.push(item);}
  if(typeof list.replaceChildren==='function')list.replaceChildren(...children);else{list.textContent='';for(const child of children)list.appendChild(child);}
 }
 let wait='';
 if(roomEntryPending)wait=roomEntryKind==='create'?'ルームを作成中…':'ルームに参加中…';
 else if(!joined)wait='退出を完了してから、参加し直してください。';
 else if(s?.phase==='stopped')wait=s.stoppedReason==='host-lost'||s.stoppedReason==='host-timeout'?'ホストとの接続が切れました。退出して参加し直してください。':'接続が停止しています。退出して参加し直してください。';
 else if(multiAdapter?.isRestartPending?.())wait='参加者の接続を確認しています…';
 else if(s?.phase==='lobby')wait=multiHost?(s.roundId===null?'参加者がそろったら、対戦を始められます。':'もう一度遊ぶと、新しい対戦を準備します。'):'ホストが対戦を始めるまでお待ちください。';
 else wait='対戦に参加しています。';
 q('#roomLobbyWait').textContent=wait;
 q('#beginRound').hidden=!joined||!multiHost||s?.phase!=='lobby';q('#beginRound').disabled=multiBusy||roomEntryPending||roomExitPending||!!multiAdapter?.isRestartPending?.();
}
function cancelRoomEntry(){
 if(!roomEntryPending)return false;roomEntryGeneration++;showScreen('home');return true;
}
'''

ENTRY = r'''async function enterNative(kind){
 if(multiBusy||multiSession||roomEntryPending||roomExitPending||state==='fight')return;
 if(nativeRoomNeedsExit()){showScreen('room');document.querySelector('#roomStatus').textContent='先に退出を完了してください。';renderMultiRoomLobby();return;}
 const roomId=document.querySelector('#roomId').value?.trim();
 if(kind==='join'&&!roomId){document.querySelector('#roomStatus').textContent='部屋IDを入力してください';renderMultiRoomLobby();return;}
 const request=++roomEntryGeneration;roomEntryRequest=request;roomEntryPending=true;roomEntryKind=kind;multiBusy=true;document.querySelector('#roomStatus').textContent='';renderMultiRoomLobby();
 try{
  if(!multiAdapter){const sdk=await loadNativeSDK();if(request!==roomEntryGeneration)return;multiAdapter=await SDKAdapter.install({sdk,nonce:()=>crypto.randomUUID(),sessionFactory:MultiBinding.createWalletSession,onReaction:(sender,wire)=>receiveReaction(sender,wire),onSessionReset:adoptRestartedMultiSession,sessionOptions:{onChange:onMultiChange,requireEnvironment:true}});}
  if(request!==roomEntryGeneration)return;
  nativeProfileVerified=true;globalThis.dispatchEvent?.(new Event('docchi:native-profile-verified'));multiUser=multiAdapter.userId;multiHost=kind==='create';multiError='';multiRoundSeen=null;multiPlayback=null;mockGuest=null;lastScreenPhase=null;
  const entered=kind==='create'?await multiAdapter.create():await multiAdapter.join(roomId);
  if(request!==roomEntryGeneration){await multiAdapter.exit();multiSnapshot=null;return;}
  multiSession=entered;publicRoomRequest++;document.querySelector('#refreshPublicRooms').disabled=false;multiSnapshot=multiSession.getState();document.querySelector('#roomId').value=multiAdapter.getRoomId();showScreen('room');displayMultiState();
 }catch(e){
  if(!multiSession)multiSnapshot=null;
  if(request===roomEntryGeneration||nativeRoomNeedsExit()){
   if(nativeRoomNeedsExit())showScreen('room');
   document.querySelector('#roomStatus').textContent=nativeRoomNeedsExit()?'退出を完了できませんでした。退出ボタンでもう一度お試しください。':String(e.message)+' / オフラインひとり用は継続できます。';
  }
 }finally{roomEntryPending=false;roomEntryKind=null;multiBusy=false;renderMultiRoomLobby();}
}
'''


def once(source, old, new):
    assert source.count(old) == 1, 'Expected one lobby patch target: ' + old[:120]
    return source.replace(old, new, 1)


def patch(source):
    assert 'waiting-room-lobby-20261108' not in source, 'Already patched'
    source = once(source, '</style>', CSS + '\n</style>')
    source = once(source, '    <button id="createRoom"', '    <div id="roomEntry">\n    <button id="createRoom"')
    source = once(source, '    <button id="beginRound" class="cta cta-primary" type="button" hidden>第1戦へ</button>\n', '')
    source = once(source, '    <button id="backHome"', '    </div>\n' + LOBBY + '    <button id="backHome"')
    source = once(source, 'async function enterNative(kind){', CONTROLLER + '\nasync function enterNative(kind){')
    start = source.index('async function enterNative(kind){')
    end = source.index('\nasync function leaveMulti(){', start)
    existing = source[start:end]
    # Keep other isolated modules' extra install options regardless of patch order.
    install_start = existing.index('multiAdapter=await SDKAdapter.install(')
    install_end = existing.index(';}', install_start)
    original_install = existing[install_start:install_end].replace('onChange:onMultiChange', 'onChange:receiveNativeMultiChange')
    entry_start = ENTRY.index('multiAdapter=await SDKAdapter.install(')
    entry_end = ENTRY.index(';}', entry_start)
    entry = ENTRY[:entry_start] + original_install + ENTRY[entry_end:]
    source = source[:start] + entry.rstrip() + source[end:]
    source = once(source,
        " if(multiBusy&&!multiRecording)return;cancelReplayJob();multiBusy=true;",
        " if(roomEntryPending){cancelRoomEntry();return;}if(roomExitPending||multiBusy&&!multiRecording)return;cancelReplayJob();multiBusy=true;roomExitPending=true;renderMultiRoomLobby();")
    source = once(source,
        "}finally{multiBusy=false;}\n}\ndocument.querySelector('#mockRoom')",
        "}finally{multiBusy=false;roomExitPending=false;renderMultiRoomLobby();}\n}\ndocument.querySelector('#mockRoom')")
    source = once(source,
        " if(next==='game'){drawArmyPreviews();syncFlowControls();syncReactions();}\n}",
        " if(next==='game'){drawArmyPreviews();syncFlowControls();syncReactions();}\n renderMultiRoomLobby();\n}")
    source = once(source,
        "displayMultiState=function(){screenMultiDisplay();if(multiSession",
        "displayMultiState=function(){screenMultiDisplay();renderMultiRoomLobby();if(multiSession")
    source = once(source,
        "if(multiSnapshot.phase==='lobby'&&(screenMode==='game'||multiSnapshot.roundId!==null))showScreen('room');",
        "if((multiSnapshot.phase==='lobby'&&(screenMode==='game'||multiSnapshot.roundId!==null))||multiSnapshot.phase==='stopped')showScreen('room');")
    source = once(source,
        "document.querySelector('#backHome').onclick=()=>showScreen(multiSession&&multiSnapshot?.phase!=='lobby'?'game':'home');",
        "document.querySelector('#backHome').onclick=()=>{if(!cancelRoomEntry())showScreen(multiSession&&multiSnapshot?.phase!=='lobby'?'game':'home');};")
    source = once(source,
        "leaveMulti=async function(){await exitScreen();if(!multiSession)showScreen('game');};",
        "leaveMulti=async function(){await exitScreen();if(!multiSession&&!nativeRoomNeedsExit()&&!roomEntryPending&&!multiBusy){document.querySelector('#roomId').value='';multiHost=false;multiUser=null;lastScreenPhase=null;showScreen('home');}};")
    return source
