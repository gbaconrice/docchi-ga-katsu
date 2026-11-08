"""Keep player identity and sender reactions in the toolbar's left lane."""
import re

CSS = r'''
/* requested-toolbar-participants-20261108 */
#app #gameScreen > #gameToolbar > #participantRailWrap {
  position:relative; inset:auto; grid-column:1 / 3; grid-row:1 / 3;
  display:block; align-self:center; justify-self:stretch;
  width:100%; min-width:0; max-width:100%; height:44px; margin:0;
  padding:0; flex:none; z-index:auto;
}
#app #gameScreen > #gameToolbar > #participantRailWrap[hidden] { display:none !important; }
#app #gameToolbar #participantRail {
  display:flex; align-items:flex-start; justify-content:flex-start; gap:4px;
  width:100%; min-width:0; max-width:100%; height:44px;
  overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain;
  scrollbar-width:none; scroll-padding-inline:2px; padding:2px 2px 0; box-sizing:border-box;
}
#app #gameToolbar #participantRail::-webkit-scrollbar { display:none; width:0; height:0; }
#app #gameScreen #gameToolbar .participant-chip {
  position:relative; flex:0 0 60px; width:60px; min-width:60px; max-width:60px;
  height:40px; text-align:center; font-size:10px; color:#f6e7cb;
  text-shadow:0 1px 2px #26140c;
}
#app #gameScreen #gameToolbar .participant-portrait {
  position:relative; width:26px; height:26px; margin:1px auto 0;
  overflow:visible; box-sizing:border-box; color:#f6e7cb;
}
#app #gameToolbar .participant-portrait > img {
  width:100%; height:100%; border-radius:50%; object-fit:cover;
}
#app #gameToolbar .participant-name { font-size:10px; line-height:13px; }
#app #gameScreen #gameToolbar .participant-chip.is-self .participant-name::before { content:none; }
#app #gameToolbar .participant-emote {
  top:-2px; right:-6px; width:18px; height:18px; box-sizing:border-box;
  font-size:14px; z-index:1; pointer-events:none;
}
/* The participant lane is inside the existing toolbar, not an extra result row. */
#app #gameScreen[data-personal-result="true"][data-participants="true"] #resultPanel {
  max-height:min(68%,calc(100% - 126px));
}
#app #gameToolbar > #reaction-feedback,
#app #gameToolbar #reactionOutside { display:none !important; }
'''

PROFILE = r'''
// Only genuine SDK profile data is used. Ordinary offline solo never loads the SDK.
let soloParticipantProfile=null,soloParticipantProfilePending=null,soloParticipantProfileOwner=null,soloGravityProfileAttempted=false;
function normalizeParticipantProfile(raw){
 const id=String(raw?.user_id??'');if(!id||id.length>128)return null;
 const rawName=raw?.user_name??raw?.name,rawUrl=raw?.portrait??raw?.portait;
 const name=typeof rawName==='string'?rawName.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim().slice(0,24):'';
 let avatarUrl=null;try{const u=new URL(rawUrl);if(u.protocol==='https:'&&!u.username&&!u.password)avatarUrl=u.href;}catch{}
 return {name,avatarUrl};
}
function requestSoloParticipantProfile(){
 if(screenMode!=='game'||multiSession||soloParticipantProfilePending)return;
 const cached=multiAdapter?.getProfile?.(multiAdapter.userId);
 if(cached&&(cached.name||cached.avatarUrl)){soloParticipantProfile={...cached};return;}
 const user=globalThis.AgentSDK?.user;
 const canRead=typeof user?.getMyUserInfo==='function';
 if(canRead&&soloParticipantProfileOwner===user)return;
 if(!canRead&&(!gravityContext||soloGravityProfileAttempted))return;
 if(canRead)soloParticipantProfileOwner=user;else soloGravityProfileAttempted=true;
 // This read never installs room callbacks, enters a room, or changes score eligibility.
 soloParticipantProfilePending=(async()=>{
  let timer;
  try{
   const sdk=canRead?globalThis.AgentSDK:await loadNativeSDK(),owner=sdk?.user;
   if(typeof owner?.getMyUserInfo!=='function')return;
   soloParticipantProfileOwner=owner;
   const response=await Promise.race([Promise.resolve().then(()=>owner.getMyUserInfo()),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),8000);})]);
   if(response?.errno===0){const profile=normalizeParticipantProfile(response.data);if(profile)soloParticipantProfile=profile;}
  }catch(_){}finally{if(timer)clearTimeout(timer);}
 })().finally(()=>{soloParticipantProfilePending=null;if(screenMode==='game'&&!multiSession)reactionRender();});
}
function soloParticipantEntries(){
 requestSoloParticipantProfile();
 return [{id:'local',label:'あなた',name:soloParticipantProfile?.name||'あなた',avatarUrl:soloParticipantProfile?.avatarUrl||null,spectator:false}];
}
'''

def once(s, old, new):
    assert s.count(old) == 1, 'Expected one patch target: '+old[:100]
    return s.replace(old, new, 1)

def patch(s):
    assert 'requested-toolbar-participants-20261108' not in s, 'Already patched'
    block = re.search(r'        <div id="participantRailWrap" class="participant-rail-wrap" hidden>.*?        </div>', s, re.S)
    assert block and s.count('id="participantRailWrap"') == 1
    markup=block.group(0)
    s=s[:block.start()]+s[block.end():]
    marker='          <div id="reaction-feedback"'
    s=once(s,marker,markup+'\n'+marker)
    s=once(s,'</style>',CSS+'\n</style>')
    s=once(s,"let participantRailKey='',participantNodes=new Map();", "let participantRailKey='',participantNodes=new Map();\n"+PROFILE)
    s=once(s,"wrap.hidden=!show;wrap.setAttribute('data-solo',String(solo));rail.hidden=!multi;", "wrap.hidden=!show;wrap.setAttribute('data-solo',String(solo));rail.hidden=!show;")
    s=once(s,"if(!multi){outside.hidden=true;if(participantRailKey)","if(!show){outside.hidden=true;if(participantRailKey)")
    s=once(s,"const entries=participantEntries(multiSnapshot,multiUser,id=>multiAdapter?.getProfile?.(id)),key=JSON.stringify(entries);", "const viewer=multi?multiUser:'local',entries=multi?participantEntries(multiSnapshot,multiUser,id=>multiAdapter?.getProfile?.(id)):soloParticipantEntries(),key=JSON.stringify(entries);")
    start=s.index('function syncParticipantRail(');end=s.index('\nfunction reactionRender()',start)
    code=s[start:end].replace('row.id===multiUser','row.id===viewer').replace('entry.row.id===multiUser','entry.row.id===viewer')
    code=once(code,"chip.appendChild(portrait);chip.appendChild(name);chip.appendChild(badge);", "portrait.appendChild(badge);chip.appendChild(portrait);chip.appendChild(name);")
    # A small badge belongs only to its sender. Do not duplicate it over another player's chip.
    off=code.index(" let offscreen='';")
    code=code[:off]+" outside.hidden=true;\n}"
    s=s[:start]+code+s[end:]
    s=once(s,"const latest=feed[feed.length-1],active=!!latest&&enabled&&!multiSession;", "const latest=feed[feed.length-1],active=false; // Sender badges are rendered on the participant portraits.")
    return s
