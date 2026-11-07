const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),{ev,ready,images,errors,sha,createCanvas,Image,out}=require('./canvas-harness.cjs');
const spriteHashes=new Map();
const roles=['gauntlet_combo_guard','kilnback_pincerbeast','razorclaw_reaver'],report={sha,renderer:'Real production draw() / @napi-rs/canvas',browserTested:false,checks:[],frames:[]};
function check(name,fn){fn();report.checks.push(name);}
async function prepare(k,mirror=false){ev('__setup('+JSON.stringify(k)+','+mirror+');units.forEach(u=>{u.hp=10000;u.bossMaxHp=10000;});beginLicensedOpening(units);primeEffectImages();');await ready();}
async function capture(k,label){await ready();ev('draw()');const data=ev('({tick:Math.round(elapsed*60),frame:LICENSED_CLIP_REGISTRIES[units[0].k].frames[baseSpriteFrame(units[0])],face:visualFor(units[0]).face,fx:activeEffects.filter(f=>effectClockTick-f.tick<effectLifetime(f)).map(f=>f.kind),ready:!!licensedImageForFrame(units[0].k,LICENSED_CLIP_REGISTRIES[units[0].k].frames[baseSpriteFrame(units[0])])})');const file=k+'-'+label+'-'+data.tick+'.png';fs.writeFileSync(out+'/'+file,ev('ctx.canvas').toBuffer('image/png'));report.frames.push({role:k,label,file,...JSON.parse(JSON.stringify(data))});ev('ctx.clearRect(0,0,480,538);prepareCrowdPresentation([units[0]]);drawSprite(units[0]);');spriteHashes.set(data.tick,crypto.createHash('sha256').update(ev('ctx.canvas').toBuffer('image/png')).digest('hex'));}
(async()=>{
for(const mirror of [false,true])for(const k of roles){
 await prepare(k,mirror);spriteHashes.clear();const suffix=mirror?'left':'right';let cast=null,first=null;
 ev('globalThis.__rec=CompactReplay.createCompactRecorder();globalThis.__read=()=>({units,shots,frameFor:u=>baseSpriteFrame(u),facingFor:u=>visualFor(u).face,effects:newEffects,statusFor:u=>bossPresentationFlags(u,elapsed)});__rec.capture(0,__read(),true);globalThis.__rows=[];');
 for(let i=1;i<=150;i++){
  ev('step(1/60);__rec.capture(Math.round(elapsed*60),__read(),true);__rows.push({tick:Math.round(elapsed*60),index:baseSpriteFrame(units[0]),face:visualFor(units[0]).face});');
  const info=ev('({cast:units[0].bossState?.cast,guard:!!units[0].bossState?.clawGuard,events:combatEvents.filter(e=>e.sourceToken===units[0].token),frame:LICENSED_CLIP_REGISTRIES[units[0].k].frames[baseSpriteFrame(units[0])].local})');
  if(info.cast&&!cast){cast=i;await capture(k,suffix+'-windup-start');}
  if(cast&&[10,20].includes(i-cast))await capture(k,suffix+'-windup');
  for(const e of info.events.filter(e=>e.type==='boss_effect'&&['boss_fist_strike','boss_fist_wave','boss_pincer_snap','boss_claw_counter'].includes(e.kind))){
   first??=i;await capture(k,suffix+'-'+e.kind);
   const expected=e.kind==='boss_fist_strike'?(e.color==='#ffe090'?12:8):e.kind==='boss_fist_wave'?26:e.kind==='boss_pincer_snap'?15:5;
   check(k+' '+suffix+' contact '+e.kind+' frame '+expected,()=>assert.equal(info.frame,expected));
  }
  if(info.events.some(e=>e.type==='boss_effect'&&e.kind==='boss_claw_block')){await capture(k,suffix+'-block');check(k+' '+suffix+' block holds guard',()=>assert.equal(info.frame,2));}
  if(k==='razorclaw_reaver'&&info.guard&&i%5===0&&i<65)await capture(k,suffix+'-guard');
  if(first&&[4,10,18,30].includes(i-first))await capture(k,suffix+'-recovery');
 }
 check(k+' '+suffix+' precise replay frames/facing',()=>ev('(()=>{const d=__rec.finish({ticks:150,winner:"draw"}),p=CompactReplay.createPlayback(d);for(const r of __rows){const f=p.at(r.tick).units.find(u=>u.id===1);if(!f)throw Error("missing");if(f.pose!==r.index)throw Error("frame");if(f.face!==r.face)throw Error("face");}globalThis.__replaySample=p.at(150);})()'));
 ev('globalThis.__pixelPlayback=CompactReplay.createPlayback(__rec.finish({ticks:150,winner:"draw"}));globalThis.__savedUnits=units;globalThis.__savedPlayback=multiPlayback;');
 for(const [tick,hash] of [...spriteHashes].sort((a,b)=>a[0]-b[0])){
  ev('units=__pixelPlayback.at('+tick+').units;multiPlayback={};for(const u of units)visualFor(u).face=u.face;ctx.clearRect(0,0,480,538);prepareCrowdPresentation([units[0]]);drawSprite(units[0]);');
  const actual=crypto.createHash('sha256').update(ev('ctx.canvas').toBuffer('image/png')).digest('hex');
  check(k+' '+suffix+' replay sprite pixels tick '+tick,()=>assert.equal(actual,hash));
 }
 ev('units=__savedUnits;multiPlayback=__savedPlayback;');

}
for(const k of roles){
 await prepare(k);ev('for(let i=0;i<50;i++)step(1/60);');
 check(k+' immediate control cancellation',()=>{ev('units[0].bossStatuses={stun:{start:0,until:999,strength:1}};step(1/60);');assert.equal(ev('LICENSED_CLIP_REGISTRIES[units[0].k].frames[baseSpriteFrame(units[0])].clip')==='attack',false);assert.equal(ev('!!(bossPresentationFlags(units[0],elapsed)&1073741824)'),false)});
 await capture(k,'cancelled');
 await prepare(k);ev('for(let i=0;i<50;i++)step(1/60);units[0].hp=0;units[0].dead=true;visualFor(units[0]).death=visualTime;step(1/60);');
 check(k+' death supersedes pose immediately',()=>assert.equal(ev('LICENSED_CLIP_REGISTRIES[units[0].k].frames[baseSpriteFrame(units[0])].clip'),'death'));
 await capture(k,'death');

}
check('all images decode without error',()=>assert.deepEqual(errors,[]));
check('all actor frames resolve licensed pixels',()=>assert.ok(report.frames.every(f=>f.ready)));
const frames=report.frames,cols=8,w=240,h=290,sheet=createCanvas(cols*w,Math.ceil(frames.length/cols)*h),g=sheet.getContext('2d');g.fillStyle='#162124';g.fillRect(0,0,sheet.width,sheet.height);g.font='11px sans-serif';g.fillStyle='white';
for(let i=0;i<frames.length;i++){const f=frames[i],im=new Image();im.src=fs.readFileSync(out+'/'+f.file);await im.decode();const x=i%cols*w,y=Math.floor(i/cols)*h;g.drawImage(im,x,y+20,240,269);g.fillText(f.role+' '+f.frame.clip+':'+f.frame.local,x+2,y+10);g.fillText(f.label+' t'+f.tick,x+2,y+20);}
fs.writeFileSync(out+'/contact-sheet.png',sheet.toBuffer('image/png'));fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,frames:frames.length,errors,replaySample:ev('__replaySample.units[0]')},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
