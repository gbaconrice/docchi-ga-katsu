/* fun-feedback-20261109: presentation only.
   Never reads or writes combat, RNG, replay, wallet, settlement or multiplayer wire data.
   - Tug-of-war gauge of both armies' remaining HP share during the battle.
   - Champion badge with its win streak on the prediction card.
   - "Don" on confirm: coins by stake size, then a 予想 seal on the chosen card.
   - Solo opening countdown (3, 2, 1, 開戦). Multiplayer only gets the horn, never a delay.
   - Buttons react on touch-down, with a light wooden click. */
const FunFeedback=(()=>{
 const q=s=>document.querySelector(s);
 const ui=(kind,e)=>audioCall(()=>battleAudio.playUi?.(kind,e));
 const reduced=()=>{try{return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;}catch(_){return false;}};
 const later=(fn,ms)=>setTimeout(()=>{try{fn();}catch(_){/* presentation never interrupts play */}},ms);

 /* Touch-down reaction and click sound. */
 let pressed=null;
 const release=()=>{if(pressed){pressed.classList.remove('fun-pressed');pressed=null;}};
 const OWN_CUE=new Set(['confirm','red','blue']);
 function onPointerDown(e){
  const b=e.target?.closest?.('button');
  if(!b||b.disabled||b.getAttribute('aria-disabled')==='true')return;
  release();pressed=b;b.classList.add('fun-pressed');
  if(!OWN_CUE.has(b.id))ui(b.classList.contains('cta-primary')||b.id==='next'?'tapHeavy':'tap',e);
 }

 /* Stake coins and the 予想 seal. */
 const COINS={0:1,10:1,25:2,50:3,75:4,90:4,100:5};
 function sealCard(side){
  clearSeal();
  const card=q(side===1?'#blue':'#red');if(!card)return;
  const seal=document.createElement('span');seal.className='fun-seal';seal.setAttribute('aria-hidden','true');seal.textContent='予想';
  card.classList.add('fun-sealed');card.appendChild(seal);
 }
 function clearSeal(){
  for(const card of [q('#red'),q('#blue')]){if(!card)continue;card.classList.remove('fun-sealed');for(const s of [...card.querySelectorAll('.fun-seal')])s.remove();}
 }
 function stakeDon(side,option,e){
  const n=COINS[option]??2;
  for(let i=0;i<n;i++)later(()=>ui('coin',e),i*70);
  later(()=>{ui('stamp',e);sealCard(side);},n*70+40);
  return n*70+40;
 }

 /* Solo countdown overlay. */
 let counting=false;
 function overlay(){
  let el=q('#funCountdown');
  if(!el){el=document.createElement('div');el.id='funCountdown';el.className='fun-countdown';el.setAttribute('role','status');el.setAttribute('aria-live','assertive');el.hidden=true;(q('#gameScreen')||document.body).appendChild(el);}
  return el;
 }
 function showCount(text,final){
  const el=overlay();el.hidden=false;el.textContent='';
  const span=document.createElement('span');span.className='fun-count'+(final?' is-final':'')+(reduced()?' is-still':'');span.textContent=text;el.appendChild(span);
 }
 function hideCount(){const el=q('#funCountdown');if(el){el.hidden=true;el.textContent='';}}
 function countdown(start,lead){
  counting=true;
  const steps=[['3',false],['2',false],['1',false],['開戦',true]];
  steps.forEach(([text,final],i)=>later(()=>{showCount(text,final);ui(final?'horn':'count');},lead+i*430));
  const total=lead+steps.length*430;
  later(()=>{counting=false;start();},total-200);
  later(hideCount,total+250);
 }

 /* Wrap the final confirm handler; the original handler still does all the work. */
 const confirmButton=q('#confirm'),prevConfirm=confirmButton?.onclick;
 if(confirmButton&&typeof prevConfirm==='function')confirmButton.onclick=function(e){
  if(counting)return;
  if(state!=='choose'||selectedSide===null||predictionPreview)return prevConfirm.call(this,e);
  const side=selectedSide,option=selectedStakeOption;
  // Only a real tap gets the ceremony. Scripted clicks keep the old, immediate behavior.
  if(e?.isTrusted!==true)return prevConfirm.call(this,e);
  audioCall(()=>battleAudio.unlockFromGesture(e));
  const lead=stakeDon(side,option,e);
  if(multiSession||document.hidden)return prevConfirm.call(this,e);
  countdown(()=>{clearSeal();if(state==='choose'&&selectedSide===side)prevConfirm.call(confirmButton,e);},lead+260);
 };

 /* Tug-of-war gauge. */
 let gauge=null,shown=0.5;
 function ensureGauge(){
  if(gauge&&gauge.isConnected)return gauge;
  const stage=q('#fieldStage');if(!stage)return null;
  gauge=document.createElement('div');gauge.id='funTug';gauge.className='fun-tug';gauge.hidden=true;gauge.setAttribute('aria-hidden','true');
  const left=document.createElement('span');left.className='fun-tug-left';
  const right=document.createElement('span');right.className='fun-tug-right';
  const knot=document.createElement('i');knot.className='fun-tug-knot';
  const mine=document.createElement('b');mine.className='fun-tug-mine';
  gauge.append(left,right,knot,mine);stage.appendChild(gauge);
  try{gauge.style.setProperty('--tug-left',TEAM_HP_BAR_FILL[0]);gauge.style.setProperty('--tug-right',TEAM_HP_BAR_FILL[1]);}catch(_){}
  return gauge;
 }
 function sideShare(){
  const now=[0,0],max=[0,0];
  for(const u of (Array.isArray(units)?units:[])){
   if(!u||(u.side!==0&&u.side!==1))continue;
   const m=Number(bossPresentationMaxHp(u));if(!(m>0))continue;
   max[u.side]+=m;now[u.side]+=u.dead?0:Math.max(0,Math.min(m,Number(u.hp)||0));
  }
  if(!(max[0]>0&&max[1]>0))return null;
  const a=now[0]/max[0],b=now[1]/max[1];
  return a+b>0?a/(a+b):0.5;
 }
 function updateGauge(){
  const g=ensureGauge();if(!g)return;
  const visible=(state==='fight'||state==='result')&&!q('#battle')?.hidden;
  if(!visible){g.hidden=true;shown=0.5;return;}
  const target=sideShare();if(target===null){g.hidden=true;return;}
  g.hidden=false;
  shown+=reduced()?(target-shown):(target-shown)*0.18;
  const pct=Math.max(0,Math.min(100,shown*100));
  g.style.setProperty('--tug',pct.toFixed(2)+'%');
  let own=typeof choice==='number'&&(choice===0||choice===1)?choice:null;
  if(multiSession){const pick=multiSnapshot?.confirmedSides?.find(x=>x.userId===multiUser)?.side;own=pick==='A'?0:pick==='B'?1:null;}
  g.setAttribute('data-mine',own===null?'none':own===0?'left':'right');
 }

 /* Champion badge on the prediction card. */
 let crownKey='';
 function updateCrown(){
  const champion=state==='choose'&&round>1&&carryStreak>=1&&openingPlan&&[0,1].includes(openingPlan.incumbentSide)?openingPlan.incumbentSide:null;
  const key=champion===null?'':round+':'+champion+':'+carryStreak;
  if(key===crownKey)return;crownKey=key;
  for(const old of document.querySelectorAll('.fun-crown'))old.remove();
  if(champion===null)return;
  const card=q(champion===1?'#blue':'#red');if(!card)return;
  const badge=document.createElement('span');badge.className='fun-crown';badge.setAttribute('aria-label',carryStreak>=2?'王者・'+carryStreak+'連勝中':'王者');
  badge.textContent=carryStreak>=2?'♛ '+carryStreak+'連勝':'♛ 王者';
  card.appendChild(badge);
 }

 /* Horn when a multiplayer battle starts (solo already had the countdown). */
 let lastState=null;
 function onFrame(){
  if(lastState==='choose'&&state==='fight'){if(multiSession)ui('horn');clearSeal();}
  if(state!=='choose'&&lastState==='choose')hideCount();
  lastState=state;
  updateGauge();updateCrown();
 }

 function install(){
  if(typeof document.addEventListener==='function'){
   document.addEventListener('pointerdown',onPointerDown,{capture:true,passive:true});
   for(const t of ['pointerup','pointercancel','dragstart'])document.addEventListener(t,release,{capture:true,passive:true});
  }
  globalThis.addEventListener?.('blur',release);
  const frameLoop=loop;loop=function(t){frameLoop(t);try{onFrame();}catch(_){/* presentation only */}};
 }
 install();
 return {sideShare,updateGauge,updateCrown,stakeDon,isCounting:()=>counting};
})();

/* Terrain label: break lines only between meaningful chunks, never inside a word. */
function renderFieldStatus(el,text){
 const parts=String(text).split(/(?<=· )|(?<=に)|(?=追加)|(?=ダメージ\/)/).filter(Boolean);
 if(typeof el.replaceChildren!=='function'||typeof document.createElement!=='function'){el.textContent=text;return;}
 const nodes=[];
 parts.map(p=>p.trim()).filter(Boolean).forEach((p,i,all)=>{
  const s=document.createElement('span');s.className='field-chunk';s.textContent=p;nodes.push(s);
  // Keep the visible space after the map name's separator; chunks otherwise sit flush.
  if(i<all.length-1&&p.endsWith('·'))nodes.push(document.createTextNode(' '));
 });
 el.replaceChildren(...nodes);
}
