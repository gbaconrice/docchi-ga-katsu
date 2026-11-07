'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
function load(file){const source=fs.readFileSync(path.join(__dirname,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0];const h=new Function('require',source.replace("fs.readFileSync('index.html','utf8')",`fs.readFileSync(${JSON.stringify(file)},'utf8')`)+";return {context,ctx,nodes,ev:s=>vm.runInContext(s,context,{timeout:120000})};")(require);h.context.TextEncoder=TextEncoder;h.context.TextDecoder=TextDecoder;return h;}
const candidate=path.resolve(process.env.GAME_HTML||'index.html');
const h=load(candidate),run=h.ev,json=x=>JSON.parse(run('JSON.stringify('+x+')'));h.context.TextEncoder=TextEncoder;h.context.TextDecoder=TextDecoder;
run(`globalThis.logUnit=(k,id,side,x,y,hp=TYPES[k].hp)=>({id,token:'meaning:'+id,k,side,x,y,hp,dead:false,originForward:side?-1:1,cd:0,priority:.1});
 globalThis.logReady=roster=>{units=roster;initialUnits=units.map(u=>({...u}));state='fight';screenMode='game';multiSession=null;multiRecording=false;predictionPreview=false;elapsed=0;shots=[];pendingSummons=[];battleEnvironment=null;winner=null;resetBattleLog(units);};
 globalThis.logRows=()=>soloBattleLog.rows().map(r=>({...r,sentence:BattleLog.describe(r,soloBattleLog.catalog).sentence}));`);
run(`logReady([logUnit('knife_skirmisher',0,0,220,300),logUnit('redtail_whipper',1,1,245,300)]);for(let i=0;i<900&&state==='fight';i++)step(1/60);`);
let rows=json('logRows()');
assert.equal(rows.length,13,'same row count as reproduced baseline, not increased noise');
const death=rows.findIndex(r=>r.type==='unit_defeated'),lethal=rows.findIndex(r=>r.type==='resolved_hit'&&r.data.hpAfter===0);
assert(lethal>=0&&lethal<death);assert.equal(rows.at(-1).type,'battle_finished');
assert(rows[lethal].sentence.includes('近接攻撃で13ダメージ（HP 0/30）'));
assert(rows.at(-1).sentence.includes('左の勝利。右が全滅（残存 青1体・赤0体）'));
for(let i=0;i<rows.length;i++)if(rows[i].type==='retreat_start')assert(rows.slice(0,i).some(r=>r.tick===rows[i].tick&&r.type==='resolved_hit'&&r.source===rows[i].source));
assert(rows.filter(r=>r.type==='resolved_hit').every(r=>!/[左右] /.test(r.sentence)));
assert(rows.every((r,i)=>!i||r.tick>=rows[i-1].tick&&r.seq>rows[i-1].seq));
console.log('PASS exact screenshot species reproduce inverted cause/effect; 13 original rows now show attack → retreat → defeat → result, attack kind, settled HP and surviving counts');
// Last HP entry per target per settlement, including multiple hits and simultaneous healing.
run(`logReady([logUnit('knife_skirmisher',0,0,220,200),logUnit('knife_skirmisher',1,0,220,215),logUnit('sword',2,1,242,205,50),logUnit('healer',3,1,267,205)]);units[2].cd=100;step(1/60);`);
rows=json('logRows()');const heals=rows.filter(r=>r.type==='heal');assert(heals.length>0);for(const r of heals){assert(Number.isFinite(r.data.hpAfter));assert(r.sentence.includes('回復（HP'));assert.equal(r.data.hpAfter,run('units.find(u=>u.token===soloBattleLog.catalog.actors['+r.target+'].token).hp'));}
for(const target of new Set(rows.map(r=>r.target))){const hp=rows.filter(r=>r.target===target&&'hpAfter' in r.data);assert(hp.length<=1,'same settlement annotates once');}
console.log('PASS same-tick multiple hits/healing: one final HP annotation per affected target, actual effective healing and no invented last-hit credit');
run(`logReady([logUnit('sword',0,0,60,200),logUnit('sword',1,1,430,200)]);Object.assign(units[1],{poisonSourceToken:units[0].token,poisonSourceKind:'sword',poisonDps:10,poisonNextAt:0,poisonUntil:5});step(1/60);`);
rows=json('logRows()');assert(rows.some(r=>r.type==='resolved_hit'&&r.sentence.includes('毒で5ダメージ')));
run(`globalThis.deliveryCatalog=BattleLog.catalog();deliveryCatalog.add([logUnit('sword',0,0,0,0),logUnit('sword',1,1,0,0)],0);`);
for(const [delivery,label]of Object.entries({melee:'近接攻撃',projectile:'飛び道具',poison:'毒',counter:'反撃',counter_projectile:'反撃弾',death_explosion:'死亡時爆発',area:'範囲攻撃',cone:'範囲攻撃',cleave:'薙ぎ払い',direct:'攻撃'})){assert(run(`BattleLog.describe({type:'resolved_hit',tick:1,source:0,target:1,data:{delivery:${JSON.stringify(delivery)},amount:5}},deliveryCatalog).sentence`).includes(label+'で5ダメージ'));}
run(`logReady([logUnit('sword',0,0,40,200),logUnit('sword',1,1,430,200)]);elapsed=59+59/60;step(1/60);`);
assert(run('BattleLog.describe(soloBattleLog.latest(),soloBattleLog.catalog).sentence').includes('引き分け。60秒で時間切れ（残存 青1体・赤1体）'));
run(`logReady([logUnit('sword',0,0,220,200),logUnit('shield',1,1,240,200)]);TYPES.sword.twoHitTicks=4;step(1/60);delete TYPES.sword.twoHitTicks;`);assert.equal(run('soloBattleLog.rows().find(r=>r.type==="resolved_hit"&&r.source===0).data.subhitId'),1);
console.log('PASS live poison attribution; ten delivery types use supported Japanese labels; time-limit draws never claim elimination');
run(`round=1;freshWallet();previousArmyKinds=[];initialKinds=[[],[]];pendingCarryKinds=null;pendingCarryOutcome=null;carryStreak=0;openPrediction(73);multiInitial=JSON.parse(JSON.stringify(initialUnits));globalThis.generated=buildCanonicalReplay();globalThis.play=BattleLog.createPlayback(generated);`);
assert(run('play.available'));assert.equal(run('play.rowsAt(generated.ticks).at(-1).type'),'battle_finished');assert(run('play.rowsAt(20).every(r=>r.tick<=20)'));
assert.equal(run('JSON.stringify(play.rowsAt(generated.ticks))'),run('JSON.stringify(BattleLog.createPlayback(JSON.parse(JSON.stringify(generated))).rowsAt(generated.ticks))'));
for(const change of ["r[5].hpAfter=-1;r[5].hpMax=10","r[5].hpAfter=11;r[5].hpMax=10","r[5].hpAfter=5;delete r[5].hpMax"]){run(`globalThis.bad=JSON.parse(JSON.stringify(generated));{const r=bad.battleLog.rows.find(r=>r[2]==='resolved_hit');${change};}`);assert.equal(run('BattleLog.createPlayback(bad).available'),false);}
for(const change of ["r[5].leftAlive=-1","r[5].rightAlive=.5","r[5].kind='invalid'","r[5].status='<img src=x onerror=alert(1)>'"]){run(`bad=JSON.parse(JSON.stringify(generated));{const r=bad.battleLog.rows.find(r=>r[2]==='battle_finished');${change};}`);assert.equal(run('BattleLog.createPlayback(bad).available'),false);}
console.log('PASS canonical replay keeps log order, seek excludes future, JSON round-trip, and malformed HP/count/outcome fields are rejected');
