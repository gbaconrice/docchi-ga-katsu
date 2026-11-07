const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),input=path.resolve(process.env.GAME_HTML||'index.html');
const harness=fs.readFileSync(path.join(root,'tests/bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0];
const h=new Function('require',harness.replace("fs.readFileSync('index.html','utf8')",`fs.readFileSync(${JSON.stringify(input)},'utf8')`)+";return {context,ctx,nodes,ev:s=>vm.runInContext(s,context,{timeout:60000})};")(require),run=h.ev,json=s=>JSON.parse(run('JSON.stringify('+s+')'));
run(`globalThis.unit=(k,id=0,side=0,x=240,y=300)=>({id,token:'clarity:'+id,k,side,x,y,hp:TYPES[k].hp,dead:false,originForward:side?-1:1,cd:100,priority:.1});
 globalThis.corners=(k)=>{const r=TYPES[k].radius||0;return [[r,r],[480-r,r],[r,538-r],[480-r,538-r]]};
 globalThis.inspectCamera=()=>{const b=automaticCameraBounds(),scale=cameraFitScale*cameraZoom;return {scale,x:cameraX,y:cameraY,left:CAMERA_CENTER.x+(b.left-cameraX)*scale,right:CAMERA_CENTER.x+(b.right-cameraX)*scale,top:CAMERA_CENTER.y+(b.top-cameraY)*scale,bottom:CAMERA_CENTER.y+(b.bottom-cameraY)*scale};};
 globalThis.cameraReady=()=>{screenMode='game';state='fight';paused=false;multiSession=null;multiPlayback=null;multiRecording=false;document.hidden=false;shots=[];resultReducedMotion=()=>false;initialUnits=units.map(u=>({...u}));configureFixedCamera();};`);
// User removed only army foot markers. HP, selection, ability cues and placeholders remain.
const noMarkerSource=fs.readFileSync(input,'utf8');
assert(!noMarkerSource.includes('drawCrowdSideMarker'),'removed marker implementation and caller');
assert(!noMarkerSource.includes('ctx.fillRect(Math.round(u.x)-6,Math.round(u.y)+3,12,3)'),'removed off-frame marker fallback');
assert(noMarkerSource.includes("if(!u.dead&&(flags&8)){ctx.fillStyle='#bd83cd';ctx.fillRect(Math.round(u.x)-3,Math.round(u.y)+5,6,3);}"),'purple ability indicator retained');
assert(noMarkerSource.includes("let color=TEAM_HP_BAR_FILL[u.side===0?0:1]"),'generic body placeholder retains team color');
const footRectangles=[],footHPCalls=[],footStrokes=[];
h.ctx.fillRect=(...args)=>footRectangles.push({color:h.ctx.fillStyle,args});
h.ctx.strokeRect=(...args)=>footStrokes.push({color:h.ctx.strokeStyle,args});
h.context.footRectangles=footRectangles;h.context.footHPCalls=footHPCalls;h.context.footStrokes=footStrokes;
h.context.footAssert=(condition,message)=>assert(condition,message);
const footCounts=json(`(()=>{
 const originalLicensedImageForFrame=licensedImageForFrame,originalLegacyImage=legacyImage,originalHP=drawSideHPBar;
 const readyImage={complete:true,naturalWidth:8192,naturalHeight:8192};let ready=false;
 licensedImageForFrame=()=>ready?readyImage:null;legacyImage=()=>ready?readyImage:null;
 drawSideHPBar=(u,...args)=>{footHPCalls.push({k:u.k,side:u.side,dead:u.dead,args});return originalHP(u,...args);};
 screenMode='game';state='fight';multiSession=null;multiPlayback=null;fieldDrawPass='actors';shots=[];resetCrowdPresentation();
 let cases=0,directCases=0,hpCases=0;
 const variants=[['alive',{}],['summoned',{summoned:true,ownerToken:'parent'}],['dead',{dead:true,hp:0}],['claimed-dead',{dead:true,hp:0,reviveClaimed:true}],['revived',{revived:true,ownerToken:'corpse'}],['revival-channel',{reviveDueTick:60}],['hidden',{presentationFlags:2}]];
 const forbidden=r=>{const a=r.args;return (a[0]===231&&a[1]===302&&a[2]===18&&a[3]===7)||(a[0]===232&&a[1]===303&&a[2]===16&&a[3]===5)||(a[0]===234&&a[1]===303&&a[2]===12&&a[3]===3);};
 for(const loaded of [false,true]){ready=loaded;for(const k of Object.keys(TYPES))for(const side of [0,1])for(const [variant,changes] of variants){
  const u=unit(k,1,side,240,300);Object.assign(u,changes);if(u.revived)u.hp=Math.max(1,TYPES[k].hp*.5);
  u.token='foot:'+k+':'+side+':'+variant+':'+loaded;units=[u];const snapshot=JSON.stringify(units),label=k+'/'+side+'/'+variant+'/'+(loaded?'loaded':'missing');
  resetCrowdPresentation();footRectangles.length=0;footHPCalls.length=0;footStrokes.length=0;
  drawSprite(u);footAssert(!footRectangles.some(forbidden),'direct sprite foot marker: '+label);directCases++;
  if(!loaded&&LICENSED_CLIP_REGISTRIES[k]&&!u.dead&&!(u.presentationFlags&2))footAssert(footRectangles.some(r=>r.color===(side?'#7ab0cd':'#d99078')&&r.args[0]===231&&r.args[1]===284&&r.args[2]===18&&r.args[3]===16),'licensed body placeholder team color: '+label);
  footRectangles.length=0;footHPCalls.length=0;draw();
  footAssert(!footRectangles.some(forbidden),'full draw foot marker: '+label);
  const hpExpected=!u.dead&&!(u.presentationFlags&2);footAssert(footHPCalls.length===(hpExpected?1:0),'head HP invocation: '+label);
  if(hpExpected){hpCases++;footAssert(footRectangles.some(r=>r.color===TEAM_HP_BAR_FILL[side]&&r.args[3]===4),'head HP fill: '+label);}
  footAssert(JSON.stringify(units)===snapshot,'render changed unit state: '+label);cases++;
 }}
 // Purple ability marks are not army markers and must still render in either army.
 for(const side of [0,1]){const u=unit('sword',7,side,240,300);u.presentationFlags=8;footRectangles.length=0;drawSprite(u);footAssert(footRectangles.some(r=>r.color==='#bd83cd'&&JSON.stringify(r.args)==='[237,305,6,3]'),'purple ability marker side '+side);}
 // Direct head HP fill, track, side notch and outline remain unchanged at partial HP.
 for(const side of [0,1]){const u=unit('sword',8,side);u.hp=TYPES.sword.hp*.5;footRectangles.length=0;footStrokes.length=0;drawSideHPBar(u,226,260,28,4);
  footAssert(footRectangles.some(r=>r.color===TEAM_HP_BAR_TRACK&&JSON.stringify(r.args)==='[226,260,28,4]'),'HP track');
  footAssert(footRectangles.some(r=>r.color===TEAM_HP_BAR_FILL[side]&&JSON.stringify(r.args)==='[226,260,14,4]'),'HP partial team fill');
  footAssert(footRectangles.some(r=>r.color===TEAM_HP_BAR_OUTLINE&&JSON.stringify(r.args)===JSON.stringify([side?251:228,261,1,2])),'HP side notch');
  footAssert(footStrokes.some(r=>r.color===TEAM_HP_BAR_OUTLINE&&JSON.stringify(r.args)==='[225.5,259.5,29,5]'),'HP outline');
 }
 // Full selected-body path still requests a silhouette and highlighted HP border.
 ready=true;units=[unit('golem',9,0,240,300)];resetCrowdPresentation();setCrowdFocus(units[0].token);footStrokes.length=0;draw();
 footAssert(!!crowdFocusedEntry?.focusSprite,'selected body silhouette source retained');
 footAssert(footStrokes.some(r=>r.color==='#fff0bb'&&r.args[3]===7),'selected HP highlight retained');
 licensedImageForFrame=originalLicensedImageForFrame;legacyImage=originalLegacyImage;drawSideHPBar=originalHP;fieldDrawPass='all';
 return {kinds:Object.keys(TYPES).length,cases,directCases,hpCases,variants:variants.length};
})()`);
assert.equal(footCounts.kinds,301);assert.equal(footCounts.cases,301*2*7*2);assert.equal(footCounts.directCases,footCounts.cases);
console.log('PASS no army foot markers:',JSON.stringify(footCounts),'; both teams, loaded/missing art, alive/summoned/dead/claimed-dead/revived/revival-channel/hidden; HP, selected outline, purple ability cue, body placeholder colors and unit state preserved');
