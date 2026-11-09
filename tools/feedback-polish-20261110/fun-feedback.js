/* fun-feedback-20261109: bounded presentation state. Combat, wallet and replay
   stay authoritative. All delayed UI belongs to one session and round. */
function funChampionMetadata(){
 const side=openingPlan?.incumbentSide;
 return Number.isSafeInteger(round)&&round>1&&Number.isSafeInteger(carryStreak)&&carryStreak>=1&&carryStreak<round&&(side===0||side===1)
  ?{roundId:round,side,streak:carryStreak}:null;
}
function funReadChampion(value,roundId){
 return value&&Number.isSafeInteger(roundId)&&roundId>1&&value.roundId===roundId&&(value.side===0||value.side===1)&&Number.isSafeInteger(value.streak)&&value.streak>=1&&value.streak<roundId
  ?{side:value.side,streak:value.streak}:null;
}
function funFieldChunks(text){
 // Forward-only scanning works in iOS WebViews without regexp lookbehind.
 const value=String(text),parts=[];let start=0;
 for(let i=0;i<value.length;i++){
  const after=value.slice(i,i+2)==='· '?i+2:value[i]==='に'?i+1:0;
  if(after){if(after>start)parts.push(value.slice(start,after));start=after;i=after-1;continue;}
  const numberStart=/^[+−-]?\d/.test(value.slice(i))&&!/[0-9.+−-]/.test(value[i-1]||'');
  if(i>start&&(value.slice(i,i+2)==='追加'||value.slice(i,i+5)==='ダメージ/'||numberStart)){parts.push(value.slice(start,i));start=i;}
 }
 if(start<value.length)parts.push(value.slice(start));return parts.filter(Boolean);
}
function renderFieldStatus(el,text){
 if(typeof el.replaceChildren!=='function'||typeof document.createElement!=='function'){el.textContent=text;return;}
 const nodes=[];
 for(const part of funFieldChunks(text)){const value=part.trim();if(!value)continue;const span=document.createElement('span');span.className='field-chunk';span.textContent=value;nodes.push(span);if(value.endsWith('·'))nodes.push(document.createTextNode(' '));}
 el.replaceChildren(...nodes);
}
const FunFeedback=(()=>{
 const q=s=>document.querySelector(s),ui=(kind,event)=>audioCall(()=>battleAudio.playUi?.(kind,event));
 const reduced=()=>{try{return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;}catch(_){return false;}};
 const card=side=>q(side===1?'#blue':'#red');
 const COINS={0:1,10:1,25:2,50:3,75:4,90:4,100:5};
 const OWN_CUE=new Set(['confirm','red','blue','pauseResume','cashOut','soundToggle']);
 let pressed=null,ceremony=null,serial=0,gauge=null,gaugeKey='',shown=.5,crownKey='',lastPhase='';
 const health=new Map();
 function release(){if(pressed){pressed.classList.remove('fun-pressed');pressed=null;}}
 function onPointerDown(event){
  const button=event.target?.closest?.('button');
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||!q('#app')?.contains?.(button))return;
  release();pressed=button;button.classList.add('fun-pressed');
  if(!OWN_CUE.has(button.id))ui(button.classList.contains('cta-primary')||button.id==='next'?'tapHeavy':'tap',event);
 }
 function feedbackRow(side){
  const parent=card(side);if(!parent)return null;
  let row=parent.querySelector('.fun-card-feedback');
  if(!row){row=document.createElement('span');row.className='fun-card-feedback';const stats=parent.querySelector('.comparison-list');parent.insertBefore(row,stats||null);}
  return row;
 }
 function clearSeal(){for(const old of document.querySelectorAll('.fun-seal'))old.remove();}
 function sealCard(side){
  clearSeal();const row=feedbackRow(side);if(!row)return;
  const seal=document.createElement('span');seal.className='fun-seal';seal.setAttribute('aria-hidden','true');seal.textContent='予想';row.appendChild(seal);
 }
 function overlay(){
  let element=q('#funCountdown');
  if(!element){element=document.createElement('div');element.id='funCountdown';element.className='fun-countdown';element.hidden=true;element.tabIndex=-1;element.setAttribute('role','status');element.setAttribute('aria-live','polite');q('#gameScreen')?.appendChild(element);}
  return element;
 }
 function hideCount(){const element=q('#funCountdown');if(element){element.hidden=true;element.textContent='';element.removeAttribute('data-counting');}}
 function identity(){return {session:multiSession?multiSnapshot?.sessionId:walletState?.sessionId,round:multiSession?multiSnapshot?.roundId:round,multi:multiSession||null};}
 function sameRound(job){const current=identity();return current.session===job.session&&current.round===job.round&&current.multi===job.multi;}
 function multiAdmitted(){return multiPredictionPending===true||multiSnapshot?.readyIds?.includes(multiUser)===true;}
 function multiConfirmed(job){return multiSnapshot?.readyIds?.includes(multiUser)===true&&multiSnapshot?.confirmedSides?.some(row=>row.userId===multiUser&&row.side===(job.side===0?'A':'B'))===true;}
 function tryStamp(job){if(job.stamped||!job.stampDue||(job.multi&&!multiConfirmed(job)))return;job.stamped=true;ui('stamp',job.event);sealCard(job.side);}
 function valid(job){
  return ceremony===job&&!document.hidden&&screenMode==='game'&&state===(job.stage==='battle'?'fight':'choose')&&!predictionPreview&&sameRound(job)&&selectedSide===job.side&&selectedStake===job.stake&&selectedStakeOption===job.option&&(!job.multi||(multiSnapshot?.phase==='predict'&&multiAdmitted()));
 }
 function later(job,fn,ms,propagate=false){const timer=setTimeout(()=>{job.timers.delete(timer);if(!valid(job)){if(ceremony===job)cancel();return;}try{fn();}catch(error){cancel();if(propagate)throw error;}},ms);job.timers.add(timer);}
 function cancel(restoreFocus=false){
  const job=ceremony;if(job){for(const timer of job.timers)clearTimeout(timer);job.timers.clear();ceremony=null;}
  hideCount();clearSeal();q('#comparison')?.removeAttribute('data-fun-confirming');
  if(job?.stage==='battle')resetSoloClock();
  // Never write a stale enabled state over the normal game's own controls.
  if(job&&restoreFocus&&screenMode==='game'&&state==='choose')q('#confirm')?.focus?.();
 }
 function beginJob(side,option,event,multi){
  cancel();const job={...identity(),id:++serial,side,option,stake:selectedStake,event,timers:new Set()};ceremony=job;
  const count=COINS[option]??2,lead=count*70+40;
  if(!multi){const element=overlay();element.hidden=false;element.textContent='';element.setAttribute('aria-label','開戦の準備中。Escapeで中止');element.setAttribute('data-counting','preparing');element.focus?.();q('#comparison')?.setAttribute('data-fun-confirming','true');}
  for(let i=0;i<count;i++)later(job,()=>ui('coin',event),i*70);
  later(job,()=>{job.stampDue=true;tryStamp(job);},lead);
  return {job,lead};
 }
 function positionCount(){
  const element=q('#funCountdown'),field=q('#fieldMap'),screen=q('#gameScreen');
  if(!element||!field||!screen||typeof field.getBoundingClientRect!=='function')return;
  const box=field.getBoundingClientRect(),outer=screen.getBoundingClientRect();
  if(box.width>0&&box.height>0){element.style.setProperty('--fun-count-x',(box.left+box.width/2-outer.left)+'px');element.style.setProperty('--fun-count-y',(box.top+box.height/2-outer.top)+'px');}
 }
 function startCountdown(side,option,event,confirm){
  const {job,lead}=beginJob(side,option,event,false),steps=['3','2','1','開戦'];
  // Finish the coin/stamp on the prediction card, then show the actual arena.
  // Commit once through the canonical handler before displaying any number.
  later(job,()=>{
   job.stage='battle';confirm();
   if(state!=='fight'||!sameRound(job)){cancel();return;}
   resetSoloClock();draw();clearSeal();q('#comparison')?.removeAttribute('data-fun-confirming');
   steps.forEach((text,i)=>later(job,()=>{
    const element=overlay();element.hidden=false;element.setAttribute('data-counting','active');element.removeAttribute('aria-label');element.textContent='';
    const span=document.createElement('span');span.className='fun-count'+(i===3?' is-final':'')+(reduced()?' is-still':'');span.textContent=text;element.appendChild(span);positionCount();ui(i===3?'horn':'count');
   },i*430));
   later(job,()=>cancel(),steps.length*430-200);
  },lead+260,true);
 }
 const confirmButton=q('#confirm'),previousConfirm=confirmButton?.onclick;
 if(confirmButton&&typeof previousConfirm==='function')confirmButton.onclick=function(event){
  if(ceremony&&!ceremony.multi)return;
  if(state!=='choose'||selectedSide===null||predictionPreview||event?.isTrusted!==true)return previousConfirm.call(this,event);
  if(screenMode!=='game'||document.hidden||this.disabled)return;
  audioCall(()=>battleAudio.unlockFromGesture(event));
  const side=selectedSide,option=selectedStakeOption;
  if(multiSession){
   // The original confirm still sends immediately; no multiplayer countdown or protocol delay.
   const result=previousConfirm.call(this,event);
   if(state==='choose'&&multiSnapshot?.phase==='predict'&&selectedSide===side&&multiAdmitted())beginJob(side,option,event,true);
   return result;
  }
  startCountdown(side,option,event,()=>previousConfirm.call(confirmButton,event));
 };
 function ensureGauge(){
  if(gauge?.isConnected)return gauge;
  const map=q('#fieldMap');if(!map)return null;
  gauge=document.createElement('div');gauge.id='funTug';gauge.className='fun-tug';gauge.hidden=true;gauge.setAttribute('role','img');
  const track=document.createElement('span');track.className='fun-tug-track';
  for(const [tag,name] of [['span','left'],['span','right'],['i','knot']]){const node=document.createElement(tag);node.className='fun-tug-'+name;node.setAttribute('aria-hidden','true');track.appendChild(node);}
  gauge.appendChild(track);map.appendChild(gauge);
  gauge.style.setProperty('--tug-left',TEAM_HP_BAR_FILL[0]);gauge.style.setProperty('--tug-right',TEAM_HP_BAR_FILL[1]);return gauge;
 }
 function sideShare(){
  const register=u=>{if(!u||(u.side!==0&&u.side!==1))return;const max=Number(bossPresentationMaxHp(u));if(!(max>0))return;const key=u.side+':'+u.id,old=health.get(key);health.set(key,{side:u.side,max:Math.max(max,old?.max||0)});};
  for(const unit of Array.isArray(initialUnits)?initialUnits:[])register(unit);
  for(const unit of Array.isArray(units)?units:[])register(unit);
  const max=[0,0],now=[0,0];for(const row of health.values())max[row.side]+=row.max;
  for(const unit of Array.isArray(units)?units:[]){const row=unit&&health.get(unit.side+':'+unit.id);if(row&&!unit.dead)now[unit.side]+=Math.max(0,Math.min(row.max,Number(unit.hp)||0));}
  if(!(max[0]>0&&max[1]>0))return null;const a=now[0]/max[0],b=now[1]/max[1];return a+b>0?a/(a+b):.5;
 }
 function showGauge(element,visible){if(element.hidden===!visible)return;element.hidden=!visible;globalThis.dispatchEvent?.(new Event('docchi:feedback-layout'));}
 function updateGauge(){
  const element=ensureGauge();if(!element)return;
  const current=identity(),key=String(current.session)+':'+current.round;
  if(key!==gaugeKey){gaugeKey=key;health.clear();shown=.5;}
  // The existing absolute asset-recovery notice owns this lane until dismissed.
  const visible=screenMode==='game'&&(state==='fight'||state==='result')&&!q('#battle')?.hidden&&!multiRecording&&q('#assetNoticeBattle')?.hidden!==false;
  if(!visible){showGauge(element,false);shown=.5;return;}
  const target=sideShare();if(target===null){showGauge(element,false);return;}showGauge(element,true);shown+=reduced()?target-shown:(target-shown)*.18;
  element.style.setProperty('--tug',Math.max(0,Math.min(100,shown*100)).toFixed(2)+'%');
  let own=choice===0||choice===1?choice:null;
  if(multiSession){const pick=multiSnapshot?.confirmedSides?.find(row=>row.userId===multiUser)?.side;own=pick==='A'?0:pick==='B'?1:null;}
  const advantage=target>.55?'左が優勢':target<.45?'右が優勢':'ほぼ互角';
  element.setAttribute('aria-label','両軍の残りHPの割合。'+advantage+(own===null?'':'。自分の予想は'+(own===0?'左':'右')));
 }
 function updateCrown(){
  for(const side of [0,1])feedbackRow(side);
  let champion=null;
  if(screenMode==='game'&&state==='choose')champion=multiSession?funReadChampion(multiSnapshot?.matchup?.presentationChampion,multiSnapshot?.roundId):funReadChampion(funChampionMetadata(),round);
  const key=champion?String(identity().session)+':'+round+':'+champion.side+':'+champion.streak:'';
  if(key===crownKey&&(key===''||q('.fun-crown')))return;crownKey=key;
  for(const node of document.querySelectorAll('.fun-crown'))node.remove();if(!champion)return;
  const row=feedbackRow(champion.side);if(!row)return;const badge=document.createElement('span');badge.className='fun-crown';badge.textContent=champion.streak>=2?'♛ '+champion.streak+'連勝':'♛ 王者';badge.setAttribute('aria-label',champion.streak>=2?'王者・'+champion.streak+'連勝中':'王者');row.insertBefore(badge,row.firstChild);
 }
 function onFrame(){
  if(ceremony&&!valid(ceremony))cancel();
  if(ceremony?.multi)tryStamp(ceremony);
  const phase=screenMode+':'+state;
  if(lastPhase==='game:choose'&&phase==='game:fight'&&multiSession){ui('horn');cancel();}
  if(ceremony?.stage==='battle')positionCount();
  lastPhase=phase;updateGauge();updateCrown();
 }
 function install(){
  document.addEventListener?.('pointerdown',onPointerDown,{capture:true,passive:true});
  for(const type of ['pointerup','pointercancel','dragstart'])document.addEventListener?.(type,release,{capture:true,passive:true});
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)cancel();});
  document.addEventListener?.('keydown',event=>{if(!ceremony||ceremony.multi)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel(true);}else if(event.key==='Tab'){event.preventDefault();overlay().focus?.();}},true);
  globalThis.addEventListener?.('blur',()=>{release();cancel();});
  const frameLoop=loop;loop=function(time){frameLoop(time);try{onFrame();}catch(_){/* Presentation failure cannot interrupt the game loop. */}};
  updateCrown();
 }
 install();return {sideShare,updateGauge,updateCrown,cancel,isCounting:()=>!!ceremony&&!ceremony.multi,isHoldingBattle:()=>ceremony?.stage==='battle'&&valid(ceremony)};
})();
