// Ephemeral optional presentation. Never enters simulation, BET, wallets or RNG.
let reactionChannel=null,reactionSessionKey=null,reactionOpen=false;
function reactionLive(){return screenMode==='game'&&state==='fight'&&!multiRecording&&!predictionPreview&&!paused&&!unitsOpen&&!pausePanelOpen&&document.hidden!==true&&(!multiSession||(!!multiPlayback&&multiSnapshot?.phase==='battle'&&!!multiAdapter?.sendReaction));}
function reactionRender(){
 const node=document.querySelector('#reaction-feedback');if(!node)return;
 const feed=reactionChannel?reactionChannel.getFeed():[];
 node.textContent=feed.slice(-1).map(e=>ReactionLane.REACTIONS[e.emoji].label).join('');
}
function closeReactionMenu(){reactionOpen=false;syncReactions();}
function syncReactions(){
 const toggle=document.querySelector('#reactionToggle'),bar=document.querySelector('#reaction-bar');if(!toggle||!bar)return;
 const enabled=reactionLive();if(!enabled)reactionOpen=false;
 toggle.hidden=!enabled;toggle.setAttribute('aria-expanded',String(reactionOpen));
 bar.hidden=!enabled||!reactionOpen;document.querySelector("#battle").setAttribute("data-reaction-open",String(!bar.hidden));document.querySelector('#reaction-backdrop').hidden=bar.hidden;
 document.querySelector('#reaction-feedback').hidden=!enabled;
 const room=multiSession?multiAdapter?.getRoomId():'solo',session=multiSession?multiSnapshot?.sessionId:walletState?.sessionId,user=multiSession?multiUser:'local';
 const key=room&&session&&user?room+':'+session+':'+user:null;
 if(key!==reactionSessionKey){reactionChannel?.close();reactionChannel=null;reactionSessionKey=key;if(key)reactionChannel=ReactionLane.createReactionChannel({roomId:room,sessionId:session,userId:user,send:wire=>multiSession?multiAdapter.sendReaction(wire):true,getMembers:()=>multiSession?[...(multiSnapshot?.participants||[]),...(multiSnapshot?.spectators||[])]:['local']});}
 reactionChannel?.setRound(enabled?round:null);reactionRender();
}
function receiveReaction(sender,wire){syncReactions();if(!reactionLive()||!reactionChannel)return false;const accepted=reactionChannel.receive(sender,wire);reactionRender();return accepted;}
for(const [id,key] of [['reactionWow','wow'],['reactionCheer','cheer'],['reactionFrustrated','frustrated'],['reactionApplause','applause']]){
 const button=document.querySelector('#'+id);if(button)button.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();if(reactionLive()){syncReactions();reactionChannel?.react(key);}closeReactionMenu();};
}
const reactionToggle=document.querySelector('#reactionToggle');if(reactionToggle)reactionToggle.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();if(reactionLive())reactionOpen=!reactionOpen;syncReactions();};
const reactionBackdrop=document.querySelector('#reaction-backdrop');if(reactionBackdrop)reactionBackdrop.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();closeReactionMenu();};
if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(reactionOpen&&e.key==='Escape'){e.preventDefault();e.stopPropagation();closeReactionMenu();}});
const reactionLoop=loop;loop=function(t){reactionLoop(t);syncReactions();};
const reactionUpdate=update;update=function(){reactionUpdate();syncReactions();};
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',syncReactions);
syncReactions();
