'use strict';
(()=>{
 const $=id=>document.getElementById(id),labels={effect:'エフェクト',status:'状態表示',projectile:'飛び道具・罠',audio:'効果音'};
 let all=[],visible=[],selected=null,category='all',nativePair=null,generation=0;
 const media=()=>[...$('media').querySelectorAll('video,audio')];
 function stop(){for(const m of media()){m.pause();m.currentTime=0;}}
 function releasePair(){if(nativePair){for(const m of media()){if(m.tagName!=='AUDIO')continue;m.dataset.retired='true';m.pause();m.removeAttribute?.('src');m.load?.();}$('media').replaceChildren();globalThis.NativeCombatAudio?.revoke(nativePair);nativePair=null;}}
 function mediaBox(title){const box=document.createElement('div');box.className='media-box';const h=document.createElement('h3');h.textContent=title;box.append(h);$('media').append(box);return box;}
 function addMedia(spec,title){
  const box=mediaBox(title);let el;
  if(spec.mime.startsWith('video/')){el=document.createElement('video');el.playsInline=true;el.controls=true;el.muted=true;el.preload='metadata';}
  else if(spec.mime.startsWith('audio/')){el=document.createElement('audio');el.controls=true;el.preload='metadata';el.volume=.45;el.addEventListener('play',()=>{for(const m of media())if(m!==el)m.pause();});}
  else{el=document.createElement('img');el.alt=title;el.loading='lazy';}
  el.src=spec.file;el.addEventListener('error',()=>{if(el.dataset.retired==='true'||el.isConnected===false||box.isConnected===false)return;const p=document.createElement('p');p.textContent='この比較資料を読み込めませんでした。';box.append(p);},{once:true});
  const surface=document.createElement('div');surface.className='media-surface';surface.append(el);box.append(surface);
  if(el.tagName==='VIDEO'){
   if(title==='変更前 / 変更後'){const legend=document.createElement('p');legend.className='comparison-legend';legend.textContent='左：変更前　右：変更後';box.insertBefore(legend,surface);}
   const actions=document.createElement('div');actions.className='media-actions';const zoom=document.createElement('button'),full=document.createElement('button');zoom.type=full.type='button';zoom.textContent='拡大して見る';full.textContent='全画面';let enlarged=false;
   const toggleZoom=()=>{enlarged=!enlarged;el.style.width=enlarged?Math.max(640,el.videoWidth||780)+'px':'';el.style.maxWidth=enlarged?'none':'';el.style.maxHeight=enlarged?'none':'';zoom.textContent=enlarged?'全体を表示':'拡大して見る';zoom.setAttribute('aria-pressed',String(enlarged));};
   zoom.addEventListener('click',toggleZoom);full.addEventListener('click',async()=>{if(typeof box.requestFullscreen==='function'){try{await box.requestFullscreen();return;}catch{}}if(!enlarged)toggleZoom();});actions.append(zoom,full);box.append(actions);
  }
 }
 function audioPlaceholder(title){const box=mediaBox(title),p=document.createElement('p');p.className='audio-placeholder';p.textContent='「比較音を作成」を押すと、このブラウザーで音を作成します。';box.append(p);}
 function choose(item){
  generation++;stop();releasePair();selected=item.id;$('empty').hidden=true;$('detail').hidden=false;$('title').textContent=item.label;$('category').textContent=labels[item.category];$('summary').textContent=item.summary;
  $('media').replaceChildren();$('media').className=item.comparison?'combined':'';$('audioStatus').textContent='';$('renderAudio').hidden=!item.nativeAudio;$('renderAudio').disabled=false;
  if(item.nativeAudio){audioPlaceholder('変更前');audioPlaceholder('変更後');}
  else if(item.comparison)addMedia(item.comparison,'変更前 / 変更後');
  else{addMedia(item.before,'変更前');addMedia(item.after,'変更後');}
  const hasVideo=media().some(m=>m.tagName==='VIDEO');$('play').hidden=!hasVideo;$('pause').hidden=media().length===0;$('loop').parentElement.hidden=!hasVideo;$('loop').checked=false;$('audioHint').hidden=item.category!=='audio';
  $('context').textContent=item.context||'';$('kinds').replaceChildren();for(const kind of item.affectedKinds){const li=document.createElement('li');li.textContent=kind;$('kinds').append(li);}
  for(const b of $('items').children)b.setAttribute('aria-current',String(b.dataset.id===selected));const i=visible.findIndex(v=>v.id===selected);$('previous').disabled=i<=0;$('next').disabled=i<0||i>=visible.length-1;
 }
 function filter(){
  const q=$('search').value.trim().toLowerCase();visible=all.filter(v=>(category==='all'||v.category===category)&&[v.label,v.summary,...v.affectedKinds].join(' ').toLowerCase().includes(q));$('items').replaceChildren();
  for(const item of visible){const b=document.createElement('button');b.type='button';b.dataset.id=item.id;b.setAttribute('aria-current',String(item.id===selected));const label=document.createElement('span');label.textContent=item.label;const small=document.createElement('small');small.textContent=labels[item.category];b.append(label,small);b.addEventListener('click',()=>choose(item));$('items').append(b);}
  $('count').textContent=`${visible.length} / ${all.length}項目`;
  if(!visible.some(v=>v.id===selected)){stop();if(visible.length)choose(visible[0]);else{generation++;releasePair();$('detail').hidden=true;$('empty').hidden=false;$('empty').textContent='該当する項目はありません。';}}
  else{if($('detail').hidden)choose(visible.find(v=>v.id===selected));$('detail').hidden=false;$('empty').hidden=true;const i=visible.findIndex(v=>v.id===selected);$('previous').disabled=i===0;$('next').disabled=i===visible.length-1;}
 }
 $('search').addEventListener('input',filter);
 for(const b of $('filters').children)b.addEventListener('click',()=>{category=b.dataset.category;for(const x of $('filters').children)x.setAttribute('aria-pressed',String(x===b));filter();});
 $('renderAudio').addEventListener('click',async event=>{
  const item=all.find(i=>i.id===selected);if(!item?.nativeAudio)return;
  if(typeof globalThis.NativeCombatAudio?.renderPair!=='function'){$('audioStatus').textContent='比較用の音声コードを読み込めませんでした。';return;}
  const token=++generation;stop();releasePair();$('media').replaceChildren();audioPlaceholder('変更前');audioPlaceholder('変更後');$('pause').hidden=true;$('renderAudio').disabled=true;$('audioStatus').textContent='変更前後の比較音を作成しています。';
  try{const pair=await globalThis.NativeCombatAudio.renderPair(item.nativeAudio.id,event);
   if(token!==generation||selected!==item.id){globalThis.NativeCombatAudio.revoke(pair);return;}
   nativePair=pair;$('media').replaceChildren();addMedia({file:pair.before.url,mime:pair.before.mime},'変更前');addMedia({file:pair.after.url,mime:pair.after.mime},'変更後');$('pause').hidden=false;
   $('audioStatus').textContent=`作成しました。聴き比べ用に両方を同じ${Number(pair.gain).toFixed(2)}倍で増幅しています。自動再生はしません。`;
  }catch(error){if(token===generation)$('audioStatus').textContent='比較音を作成できませんでした。'+String(error?.message||'');}
  finally{if(token===generation)$('renderAudio').disabled=false;}
 });
 $('play').addEventListener('click',()=>{for(const m of media().filter(m=>m.tagName==='VIDEO')){m.currentTime=0;m.play().catch(()=>{});}});
 $('pause').addEventListener('click',()=>{for(const m of media())m.pause();});$('loop').addEventListener('change',()=>{for(const m of media().filter(m=>m.tagName==='VIDEO'))m.loop=$('loop').checked;});
 for(const [id,delta]of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{const i=visible.findIndex(v=>v.id===selected),item=visible[i+delta];if(item)choose(item);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const m of media())m.pause();});
 const embedded=document.getElementById('galleryManifest');
 const load=embedded?Promise.resolve().then(()=>JSON.parse(embedded.textContent)):fetch('manifest.json').then(r=>{if(!r.ok)throw Error('manifest');return r.json();});
 load.then(data=>{
  if(!Array.isArray(data.items)||!data.items.length)throw Error('empty');all=data.items;const ids=new Set();
  for(const item of all){
   if(!item.id||ids.has(item.id)||!labels[item.category]||!Array.isArray(item.affectedKinds)||!item.label||!item.summary)throw Error('invalid item');ids.add(item.id);
   if(item.nativeAudio){if(item.category!=='audio'||item.nativeAudio.id!==item.id)throw Error('invalid native audio');}
   else for(const spec of item.comparison?[item.comparison]:[item.before,item.after])if(!spec||!/^media\/[A-Za-z0-9_./-]+$/.test(spec.file)||spec.file.split('/').includes('..')||!/^(video|audio|image)\//.test(spec.mime))throw Error('invalid media');
  }
  $('limits').replaceChildren();for(const text of data.limits||[]){const li=document.createElement('li');li.textContent=text;$('limits').append(li);}filter();
 }).catch(()=>{$('empty').textContent='比較資料を読み込めませんでした。資料一式が揃っているか確認してください。';});
})();
