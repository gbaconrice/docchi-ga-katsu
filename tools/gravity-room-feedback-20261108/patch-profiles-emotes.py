"""Repair genuine GRAVITY profile reads and keep reactions independent of battle visibility.

Only the already-used 1.0.2 SDK methods are called. Profile refresh is self-only:
the published SDK has no get-other-user or current-room roster refresh method.
"""
import re

NATIVE_PROFILES = r'''
/* native-profile-recovery-20261108 */
const NativeProfiles=(()=>{
 const reads=new WeakMap(),cache=new WeakMap();
 const id=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f\u007f-\u009f]/.test(value)?value:Number.isSafeInteger(value)&&value>0?String(value):null;
 function normalize(raw){
  const userId=id(raw?.user_id);if(!userId)return null;
  const clean=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim().slice(0,24):'';
  const name=clean(raw.user_name)||clean(raw.name);
  let avatarUrl=null;
  for(const value of [raw.portrait,raw.portait]){
   if(typeof value!=='string'||!value.trim()||value.length>2048||/[\u0000-\u001f\u007f-\u009f]/.test(value))continue;
   try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password){avatarUrl=u.href;break;}}catch(_){}
  }
  return {userId,name,avatarUrl};
 }
 function readMy(sdk,{force=false,timeoutMs=5000}={}){
  const owner=sdk?.user;if(typeof owner?.getMyUserInfo!=='function')return Promise.reject(Error('profile-unavailable'));
  if(reads.has(owner))return reads.get(owner);
  const saved=cache.get(owner);if(!force&&saved&&Date.now()-saved.at<30000)return Promise.resolve({...saved.profile});
  let timer;
  const pending=Promise.race([
   Promise.resolve().then(()=>owner.getMyUserInfo()).then(response=>{
    const profile=response?.errno===0?normalize(response.data):null;
    if(!profile)throw Error('profile-unavailable');return profile;
   }),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('profile-timeout')),timeoutMs);})
  ]).then(profile=>{cache.set(owner,{at:Date.now(),profile});return {...profile};}).finally(()=>{clearTimeout(timer);if(reads.get(owner)===pending)reads.delete(owner);});
  reads.set(owner,pending);return pending;
 }
 return Object.freeze({normalize,readMy});
})();
'''

PROFILE = r'''
// Read real native identity only. A rendering frame never causes an unbounded retry.
let soloParticipantProfile=null,soloParticipantProfilePending=null,soloParticipantProfileOwner=null,soloParticipantUserId=null;
let soloProfileAttempts=0,soloProfileNextAt=0,soloProfileRetryTimer=null,soloProfileStatus='offline',soloProfileGeneration=0;
function normalizeParticipantProfile(raw){const p=NativeProfiles.normalize(raw);return p?{name:p.name,avatarUrl:p.avatarUrl}:null;}
function nativeProfileContext(){
 const config=globalThis.DOCCHI_HOST_LAYOUT||{};
 if(config.shell==='standalone')return false;
 let query;try{query=new URLSearchParams(location.search);}catch(_){}
 return config.shell==='gravity'||document.documentElement?.dataset?.hostShell==='gravity'||globalThis.isGravity===true||query?.get('isGravity')==='1'||query?.get('hostShell')==='gravity';
}
function refreshNativeProfileViews(){
 if(typeof renderMultiRoomLobby==='function')renderMultiRoomLobby();
 if(screenMode==='game'){if(multiSession&&multiSnapshot){displayMultiState();syncPredictionPicks(multiSnapshot);}reactionRender();}
}
function requestSoloParticipantProfile(){
 if(screenMode!=='game'||multiSession||soloParticipantProfilePending||document.hidden===true)return;
 const sdk=globalThis.AgentSDK,user=sdk?.user,canRead=typeof user?.getMyUserInfo==='function',native=nativeProfileContext();
 if(canRead&&soloParticipantProfileOwner!==user){soloParticipantProfileOwner=user;soloParticipantProfile=null;soloParticipantUserId=null;soloProfileAttempts=0;soloProfileNextAt=0;soloProfileGeneration++;}
 const cached=multiAdapter?.getProfile?.(multiAdapter.userId);
 if(cached&&(cached.name||cached.avatarUrl)){soloParticipantProfile={...cached};soloParticipantUserId=multiAdapter.userId;soloProfileStatus=cached.name&&cached.avatarUrl?'ready':'partial';if(soloProfileStatus==='ready')return;}
 if(!canRead&&!native){soloProfileStatus=soloParticipantProfile?'partial':'offline';return;}
 if(soloParticipantProfile?.name&&soloParticipantProfile?.avatarUrl||soloProfileAttempts>=4||Date.now()<soloProfileNextAt)return;
 soloProfileAttempts++;soloProfileStatus='loading';const generation=soloProfileGeneration;
 soloParticipantProfilePending=(async()=>{
  try{
   const loaded=canRead?sdk:await loadNativeSDK();
   if(generation!==soloProfileGeneration)return;
   soloParticipantProfileOwner=loaded?.user;
   const p=await NativeProfiles.readMy(loaded,{force:soloProfileAttempts>1});
   if(generation!==soloProfileGeneration||globalThis.AgentSDK?.user&&globalThis.AgentSDK.user!==loaded.user)return;
   const prior=soloParticipantUserId===p.userId?soloParticipantProfile:null;
   soloParticipantProfile={name:p.name||prior?.name||'',avatarUrl:p.avatarUrl||prior?.avatarUrl||null};soloParticipantUserId=p.userId;
   soloProfileStatus=soloParticipantProfile.name&&soloParticipantProfile.avatarUrl?'ready':'partial';
  }catch(_){if(generation===soloProfileGeneration)soloProfileStatus='unavailable';}
 })().finally(()=>{
  soloParticipantProfilePending=null;
  if(generation!==soloProfileGeneration)return;
  if(soloProfileStatus!=='ready'){
   const delay=[1500,4000,10000,30000][Math.min(3,soloProfileAttempts-1)];soloProfileNextAt=Date.now()+delay;
   if(soloProfileAttempts<4){clearTimeout(soloProfileRetryTimer);soloProfileRetryTimer=setTimeout(()=>{soloProfileRetryTimer=null;requestSoloParticipantProfile();},delay);}
  }
  if(screenMode==='game'&&!multiSession)reactionRender();
 });
}
function retryNativeProfileAfterResume(){
 if(document.hidden===true)return;
 if(!soloParticipantProfilePending&&Date.now()>=soloProfileNextAt){soloProfileAttempts=0;soloProfileNextAt=0;}
 if(multiSession)void multiAdapter?.refreshProfiles?.();else requestSoloParticipantProfile();
}
if(typeof globalThis.addEventListener==='function')for(const event of ['pageshow','online','docchi:host-layout-change'])globalThis.addEventListener(event,retryNativeProfileAfterResume);
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',retryNativeProfileAfterResume);
function soloParticipantEntries(){
 requestSoloParticipantProfile();
 const fallback=soloProfileStatus==='offline'?'プレイヤー':soloProfileStatus==='loading'?'読込中…':'名前未取得';
 return [{id:'local',label:'あなた',name:soloParticipantProfile?.name||fallback,avatarUrl:soloParticipantProfile?.avatarUrl||null,spectator:false}];
}
'''

def once(s, old, new):
    assert s.count(old) == 1, 'Expected one patch target: '+old[:120]
    return s.replace(old,new,1)

def patch(s):
    assert 'native-profile-recovery-20261108' not in s, 'Already patched'
    # The live room protocol moved to Double Up, but this optional lane did not.
    # isActive() rejected every real room before sending, even during prediction.
    s=once(s,"const REACTION_PROTOCOL = 'gravity-prediction-battle-quick10-v1';", "const REACTION_PROTOCOL = 'gravity-prediction-battle-doubleup-v1';")
    s=once(s,"const REACTION_MODE = 'GRAVITY_QUICK10_V1';", "const REACTION_MODE = 'GRAVITY_DOUBLEUP_V1';")
    s=once(s,'const SDKAdapter=(()=>{',NATIVE_PROFILES+'\nconst SDKAdapter=(()=>{')
    s=once(s,'onReaction=()=>false,onSessionReset=()=>{}})', 'onReaction=()=>false,onSessionReset=()=>{},onProfilesChange=()=>{}})')
    start=s.index('  const profile=await sdk.user.getMyUserInfo();',s.index('const SDKAdapter='))
    end=s.index('  let session=null',start)
    s=s[:start]+r'''  const self=await NativeProfiles.readMy(sdk);
  const userId=self.userId,profiles=new Map([[userId,{name:self.name,avatarUrl:self.avatarUrl}]]);
  let profileRefreshPending=null,profileRefreshAt=0;
  function changed(){try{onProfilesChange();}catch(_){}}
  function rememberProfile(raw){
    const p=NativeProfiles.normalize(raw);if(!p||profiles.size>=32&&!profiles.has(p.userId))return false;
    const old=profiles.get(p.userId)||{},next={name:p.name||old.name||'',avatarUrl:p.avatarUrl||old.avatarUrl||null};
    if(old.name===next.name&&old.avatarUrl===next.avatarUrl)return false;
    profiles.set(p.userId,next);changed();return true;
  }
  function refreshProfiles(){
    if(profileRefreshPending)return profileRefreshPending;
    if(Date.now()<profileRefreshAt)return Promise.resolve(false);
    profileRefreshAt=Date.now()+15000;
    profileRefreshPending=NativeProfiles.readMy(sdk,{force:true}).then(p=>{
      if(p.userId!==userId)return false;
      return rememberProfile({user_id:p.userId,name:p.name,portrait:p.avatarUrl});
    }).catch(()=>false).finally(()=>{profileRefreshPending=null;});
    return profileRefreshPending;
  }
''' +s[end:]
    s=once(s,'  return Object.freeze({userId,getProfile:id=>','  return Object.freeze({userId,refreshProfiles,isNativeJoined:()=>nativeJoined,getHostId:()=>hostId,getProfile:id=>')
    s=once(s,'onSessionReset:adoptRestartedMultiSession,sessionOptions:', 'onSessionReset:adoptRestartedMultiSession,onProfilesChange:refreshNativeProfileViews,sessionOptions:')
    start=s.index('// Only genuine SDK profile data is used.');end=s.index('\nfunction participantEntries(',start)
    s=s[:start]+PROFILE+s[end:]
    # A lazy image hidden until its own load event can be permanently deferred.
    s=once(s,"img.loading='lazy';img.hidden=true;img.onload=()=>{img.hidden=false;fallback.hidden=true};img.onerror=()=>{img.hidden=true;fallback.hidden=false};img.src=row.avatarUrl;portrait.appendChild(img);", "img.loading='eager';img.decoding='async';img.hidden=false;img.style.position='absolute';img.style.inset='0';img.style.opacity='0';img.onload=()=>{img.hidden=false;img.style.opacity='1';fallback.hidden=true};img.onerror=()=>{img.hidden=true;fallback.hidden=false};img.src=row.avatarUrl;portrait.appendChild(img);")
    # The dialog backdrop must not disappear with the battle canvas during betting/results.
    backdrop='      <div id="reaction-backdrop" class="reaction-backdrop" hidden aria-hidden="true"></div>'
    s=once(s,backdrop,'')
    s=once(s,'        <div id="reaction-bar"',backdrop+'\n        <div id="reaction-bar"')
    s=once(s,'</style>',r'''
/* The toolbar disables other children while the reaction menu is open.
   Its outside-tap backdrop must remain interactive in every game phase. */
#app #gameScreen[data-reaction-open="true"] > #gameToolbar > #reaction-backdrop { pointer-events:auto; }
</style>''')
    return s

if __name__=='__main__':
    import pathlib,sys
    source=pathlib.Path(sys.argv[1]);output=pathlib.Path(sys.argv[2]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(patch(source.read_text()))
