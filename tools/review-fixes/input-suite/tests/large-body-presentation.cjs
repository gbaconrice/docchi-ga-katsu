const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),tests=path.join(root,'tests');
const source=fs.readFileSync(path.join(tests,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0];
function load(file){return new Function('require',source.replace("fs.readFileSync('index.html','utf8')",`fs.readFileSync(${JSON.stringify(file)},'utf8')`)+";return {context,ctx,nodes,ev:s=>vm.runInContext(s,context)};")(require)}
const before=load(path.resolve(process.env.DEMAND_BASELINE_HTML||path.join(root,'baseline.html'))),after=load(path.join(root,'index.html')),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/large-body-patch.json'))),audit=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/large-body-alpha.json')));
const json=(h,s)=>JSON.parse(h.ev('JSON.stringify('+s+')'));
// Name-only release: compare every property against the exact approved 44-name transform.
const expectedTypes=require('./approved-name-expectations.js')(json(before,'TYPES'));
assert.deepStrictEqual(json(after,'TYPES'),expectedTypes,'all 301 TYPES unchanged except approved 44 names');
for(const key of ['COST','CONTENT_ROSTER','LICENSED_CLIP_SPECS','LICENSED_CLIP_REGISTRIES'])assert.equal(after.ev('JSON.stringify('+key+')'),before.ev('JSON.stringify('+key+')'),key+' unchanged');
assert.equal(after.ev('BOSS_KINDS.length'),46);
assert.equal(Object.keys(manifest.changes).length,46);
assert.deepEqual(Object.keys(manifest.changes).sort(),json(after,'BOSS_KINDS').sort());
for(const h of [before,after])h.ev("globalThis.makeUnit=(k,id=0,side=0,x=240,y=360)=>({id,token:'scale:'+id,k,side,x,y,hp:TYPES[k].hp,dead:false,originForward:side?-1:1,cd:100,priority:.1});licensedImageForFrame=()=>({complete:true,naturalWidth:2048});spriteFrame=u=>LICENSED_CLIP_REGISTRIES[u.k].clips.idle.frames[0].index;");
const rows=[];for(const r of audit.filter(r=>r.boss||r.k==='sword')){
 let draws=[];for(const h of [before,after]){const calls=[];h.ctx.drawImage=(...args)=>calls.push(args.slice(1));h.ev(`units=[makeUnit(${JSON.stringify(r.k)})];state='choose';prepareCrowdPresentation(units);drawSprite(units[0]);`);assert.equal(calls.length,1);draws.push(calls[0])}
 const factor=manifest.changes[r.k]?.scale??1;assert.deepEqual(draws[0].slice(0,4),draws[1].slice(0,4),r.k+' crop unchanged');for(let i=4;i<8;i++)assert.equal(draws[1][i],draws[0][i]*factor,r.k+' draw scale');
 if(factor===1)assert.deepEqual(draws[0],draws[1],r.k+' untouched');rows.push({k:r.k,factor,dimensionsBefore:r.idleMedian,dimensionsAfter:r.idleMedian.map(v=>v*factor),alphaAreaBefore:r.alphaArea,alphaAreaAfter:r.alphaArea*factor*factor});
}
const cornerRows=json(after,`(()=>{const out=[];for(const k of BOSS_KINDS){const r=TYPES[k].radius;units=[[r,r],[480-r,r],[r,538-r],[480-r,538-r]].map(([x,y],i)=>makeUnit(k,i,i%2,x,y));initialUnits=units.map(u=>({...u}));state='choose';configureFixedCamera();for(const u of units){const v=stableCameraInsets(u),sc=cameraFitScale*cameraZoom;out.push({k,id:u.id,scale:sc,left:CAMERA_CENTER.x+(u.x-v.left-cameraX)*sc,right:CAMERA_CENTER.x+(u.x+v.right-cameraX)*sc,top:CAMERA_CENTER.y+(u.y-v.top-cameraY)*sc,bottom:CAMERA_CENTER.y+(u.y+v.bottom-cameraY)*sc});}}return out})()`);
for(const r of cornerRows)assert(r.left>=23-1e-6&&r.right<=458+1e-6&&r.top>=23-1e-6&&r.bottom<=515+1e-6,'frame crop '+JSON.stringify(r));
for(const [k,c] of Object.entries(manifest.changes)){
 const a=audit.find(r=>r.k===k);for(let i=0;i<4;i++){assert.equal(c.insets[i],a.stableInsets[i]*a.scale*c.scale,k+' exact alpha union');assert.equal(c.previewInsets[i],a.firstIdle.insets[i]*a.scale*c.scale,k+' exact preview alpha');}
 assert.deepEqual(json(after,`LARGE_BODY_PRESENTATION[${JSON.stringify(k)}]`),c,k+' map matches measured fixture');
 const d=json(after,`(()=>{const u=makeUnit(${JSON.stringify(k)});units=[u];return {hp:crowdHPAnchor(u),v:stableCameraInsets(u),selected:crowdHitCandidates({x:u.x-largeBodyInsets(u.k,null)[0]+1,y:u.y-2,pad:0}).length}})()`);assert(d.hp.y<360-c.insets[1],k+' HP above head');assert.equal(d.selected,1,k+' enlarged body selectable');
}
// Draw and camera inspection must never change a deterministic battle or its event stream.
function simulate(h,seed){return json(h,`(()=>{setup(${seed});state='fight';battleEnvironment=null;choice=0;combatEvents=[];const initial=JSON.stringify(units);const events=[];for(let i=0;i<240&&state==='fight';i++){combatEvents=[];combatStep(1/60);events.push(...combatEvents);draw();}return {initial,units,shots,elapsed,state,winner,events};})()`)}
for(const seed of [1,7,123,9876]){const a=simulate(before,seed),b=simulate(after,seed);assert.deepEqual(b,a,'combat/event drift seed '+seed)}
const bossBattles=[];
for(const k of Object.keys(manifest.changes)){const fixture=`(()=>{setup(123);state='fight';battleEnvironment=null;choice=0;units=[makeUnit(${JSON.stringify(k)},0,0,180,269),makeUnit('sword',1,1,255,269),makeUnit('shield',2,1,282,290)];units.forEach(u=>u.cd=0);initialUnits=units.map(u=>({...u}));initialKinds=[[${JSON.stringify(k)}],['sword','shield']];BattleInsights.start(initialUnits);const events=[];shots=[];pendingSummons=[];elapsed=0;for(let i=0;i<300&&state==='fight';i++){combatEvents=[];combatStep(1/60);events.push(...combatEvents);draw();}return {units,shots,elapsed,state,winner,events}})()`;assert.deepEqual(json(after,fixture),json(before,fixture),k+' actual boss battle unchanged');bossBattles.push(k)}
fs.writeFileSync(path.join(root,'test-results.json'),JSON.stringify({passed:true,bossCount:46,enlarged:46,renderCases:47,cornerCases:184,combatSeeds:[1,7,123,9876],actualBrowser:false,bossBattles,rows,cornerRows},null,2));console.log('PASS: 47 exact draw argument cases; 46 bosses; 46 enlargements; 184 corner camera bounds; alpha/HP/tap checks; 4 seeds x 240 tick combat/event equality; 46 bosses x 300 tick combat/event equality; all mechanics/assets/replay registry identical');
