/* multiplayer-final-results-20261109: presentation of final canonical wallets only. */
const MultiFinalResults=(()=>{
 function rows(state,profileFor=()=>null){
  if(state?.phase!=='lobby'||!Number.isSafeInteger(state.roundId)||state.roundId<10||!Array.isArray(state.participants)||!state.participants.length||!Array.isArray(state.wallets))return [];
  const seen=new Set(),out=[];
  try{
   for(const [seat,id] of state.participants.entries()){
    if(typeof id!=='string'||!id||seen.has(id))return [];seen.add(id);
    const matches=state.wallets.filter(p=>p.playerId===id);if(matches.length!==1)return [];
    const p=matches[0],balance=Money.amountBig(p.balance);let finalGold;
    if(p.cashedOut===true&&p.cashoutAmount!==null&&p.cashoutAmount!==undefined){finalGold=Money.amountBig(p.cashoutAmount);if(finalGold!==balance)return [];}
    else if(p.terminalReason==='bankrupt'&&balance===0n)finalGold=0n;
    else return [];
    let profile=null;try{profile=profileFor(id);}catch(_){}
    const name=typeof profile?.name==='string'?profile.name.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim().slice(0,64):'';
    let avatarUrl=null;try{const u=new URL(profile?.avatarUrl);if(u.protocol==='https:'&&!u.username&&!u.password)avatarUrl=u.href;}catch(_){}
    out.push({playerId:id,seat,name:name||'参加者'+(seat+1),avatarUrl,finalGold:finalGold.toString()});
   }
  }catch(_){return [];}
  out.sort((a,b)=>{const x=BigInt(a.finalGold),y=BigInt(b.finalGold);return x>y?-1:x<y?1:a.seat-b.seat;});
  let rank=0,previous=null;
  return out.map((p,i)=>{if(p.finalGold!==previous)rank=i+1;previous=p.finalGold;return {...p,rank};});
 }
 return Object.freeze({rows});
})();
function renderMultiFinalResults(snapshot){
 const panel=document.querySelector('#roomFinalResults'),list=document.querySelector('#roomFinalResultsList');if(!panel||!list)return;
 const rows=MultiFinalResults.rows(snapshot,id=>multiAdapter?.getProfile?.(id));
 const visible=rows.length>0;panel.hidden=!visible;
 for(const id of ['#roomLobbyHeading','#roomLobbyMembers']){const node=document.querySelector(id);if(node)node.hidden=visible;}
 if(!visible){list._finalResultsKey=null;list.replaceChildren();return;}
 const key=JSON.stringify([snapshot.sessionId,rows]);if(list._finalResultsKey===key)return;list._finalResultsKey=key;
 const items=rows.map(row=>{
  const item=document.createElement('li'),rank=document.createElement('strong'),avatar=document.createElement('span'),fallback=document.createElement('span'),details=document.createElement('div'),name=document.createElement('span'),gold=document.createElement('strong');
  item.className='room-final-row';item.dataset.playerId=row.playerId;item.dataset.rank=String(row.rank);
  rank.className='room-final-rank';rank.textContent=row.rank+'位';
  avatar.className='room-lobby-avatar room-final-avatar';avatar.setAttribute('aria-hidden','true');fallback.textContent=Array.from(row.name)[0]||'人';avatar.appendChild(fallback);
  if(row.avatarUrl){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.hidden=true;img.onload=()=>{img.hidden=false;fallback.hidden=true;};img.onerror=()=>{img.hidden=true;fallback.hidden=false;};img.src=row.avatarUrl;avatar.appendChild(img);}
  details.className='room-final-details';name.className='room-final-name';name.textContent=row.name;name.title=row.name;
  gold.className='room-final-gold';gold.textContent=MoneyUI.balanceText(row.finalGold);gold.title=gold.textContent;gold.tabIndex=0;gold.setAttribute('aria-label',row.name+' '+gold.textContent);
  details.append(name,gold);item.append(rank,avatar,details);return item;
 });
 list.replaceChildren(...items);
}
