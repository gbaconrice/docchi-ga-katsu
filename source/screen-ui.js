// Screen navigation is presentation-only; returning home never creates a new wallet.
let screenMode='home',homePausedSolo=false;
function showScreen(next){
 screenMode=next;
 document.querySelector('#multiStatusRow').hidden=next==='home'||(next==='game'&&!multiSession);
 for(const [id,name] of [['#homeScreen','home'],['#roomScreen','room'],['#gameScreen','game']])document.querySelector(id).hidden=next!==name;
 document.querySelector('#soloStart').textContent=walletState?'ひとりの続きを遊ぶ':'ひとりで遊ぶ';
 document.querySelector('#showMultiplayer').textContent=multiSession?'部屋に戻る':'みんなで遊ぶ';
 document.querySelector('#backHome').textContent=multiSession&&multiSnapshot?.phase!=='lobby'?'観戦に戻る':'ホームへ戻る';
 if(next==='game')drawArmyPreviews();
}
function ensureSoloWallet(){if(!walletState)freshWallet();if(!walletState.currentRound&&walletState.completedRounds===0&&!units.length)openPrediction((Math.random()*4294967296)>>>0);}
function openSoloScreen(){
 if(multiSession){showScreen('room');document.querySelector('#roomStatus').textContent='ひとり用へ移るには、先に部屋から退出してください。';return;}
 ensureSoloWallet();if(homePausedSolo){paused=false;homePausedSolo=false;}update();showScreen('game');
}
function returnHome(){
 if(multiSession){showScreen('room');return;}
 if(state==='fight'&&!paused){paused=true;homePausedSolo=true;}showScreen('home');
}
function drawArmyPreviews(){
 for(const side of [0,1]){
  const el=document.querySelector(side?'#armyPreviewBlue':'#armyPreviewRed');if(!el||typeof el.getContext!=='function')continue;
  const p=el.getContext('2d');if(!p)continue;const box=typeof el.getBoundingClientRect==='function'?el.getBoundingClientRect():{width:140,height:84};if(!box.width||!box.height)continue;
  const dpr=Math.min(2,globalThis.devicePixelRatio||1),width=box.width,height=box.height;
  el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);p.setTransform(dpr,0,0,dpr,0,0);p.clearRect(0,0,width,height);p.imageSmoothingEnabled=false;
  const groups=[];for(const u of units.filter(u=>u.side===side&&!u.dead)){const found=groups.find(g=>g.k===u.k);if(found)found.count++;else groups.push({k:u.k,count:1});}
  const spacing=width/Math.max(1,groups.length),maxBody=Math.max(32,...groups.map(g=>g.k==='golem'?64:g.k==='drake'?58:g.k==='rider'?44:32)),maxAnchor=Math.max(41,...groups.map(g=>MONSTER_META[g.k]?.anchor[1]||(EXPANSION_ROLES.has(g.k)?53:41))),scale=Math.min(1.4,(spacing-4)/maxBody,(height-26)/maxAnchor);
  groups.forEach((g,i)=>{
   const monster=MONSTER_META[g.k],exp=EXPANSION_ROLES.has(g.k),cell=monster?monster.cell[0]:exp?64:48,anchor=monster?monster.anchor:exp?[29,53]:[21,41];
   const img=spriteImages[monster?g.k+'_'+(side?'blue':'red'):(side?'blue':'red')+(exp?'Expansion':'')],x=spacing*(i+.5),y=height-22;
   if(img&&img.complete&&img.naturalWidth){p.save();p.translate(x,y);p.scale((side?-1:1)*scale,scale);p.drawImage(img,0,(monster?0:SPRITE_ROWS[g.k])*cell,cell,cell,-anchor[0],-anchor[1],cell,cell);p.restore();}
   p.fillStyle=side?'#bdddf5':'#ffbaa5';p.font='bold 13px sans-serif';p.textAlign='center';p.fillText('×'+g.count,x,height-4);
  });
  if(el.setAttribute)el.setAttribute('aria-label',(side?'蒼軍':'朱軍')+'：'+groups.map(g=>TYPES[g.k].name+' '+g.count+'体').join('、'));
 }
}
let formationVisible=false;
function syncFormation(){if(state==='choose'&&(!multiSession||multiSnapshot?.phase==='predict')){document.querySelector('#battle').hidden=!formationVisible;document.querySelector('#battleControls').hidden=true;}else document.querySelector('#battleControls').hidden=false;}
const screenUpdate=update;
update=function(){screenUpdate();syncFormation();if(state==='choose')drawArmyPreviews();};
let lastScreenPhase=null;
const screenMultiDisplay=displayMultiState;
displayMultiState=function(){screenMultiDisplay();if(multiSession&&multiSnapshot&&multiSnapshot.phase!==lastScreenPhase){lastScreenPhase=multiSnapshot.phase;if(['predict','locked','battle','settle','result'].includes(multiSnapshot.phase)&&screenMode==='room')showScreen('game');if(multiSnapshot.phase==='lobby'&&screenMode==='game')showScreen('room');}syncFormation();drawArmyPreviews();};
for(const img of Object.values(spriteImages)){const prior=img.onload;img.onload=()=>{if(prior)prior();drawArmyPreviews();};}
document.querySelector('#soloStart').onclick=openSoloScreen;
document.querySelector('#showMultiplayer').onclick=()=>{if(!walletState)freshWallet();showScreen('room');};
document.querySelector('#backHome').onclick=()=>showScreen(multiSession&&multiSnapshot?.phase!=='lobby'?'game':'home');
document.querySelector('#gameHome').onclick=returnHome;
const exitScreen=leaveMulti;
leaveMulti=async function(){await exitScreen();if(!multiSession)showScreen('game');};
document.querySelector('#exitRoom').onclick=()=>leaveMulti();
document.querySelector('#formationToggle').onclick=()=>{formationVisible=!formationVisible;document.querySelector('#formationToggle').textContent=formationVisible?'配置を閉じる':'両軍の配置を見る';syncFormation();if(formationVisible)draw();};
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('resize',drawArmyPreviews);
showScreen('home');
