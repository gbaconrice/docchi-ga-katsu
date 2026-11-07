'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),path=require('path');
const candidate=process.env.GAME_HTML||path.resolve('index.html'),html=fs.readFileSync(candidate,'utf8'),change=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/result-appraisal-change.json')));
const line=html.split('\n').find(x=>x.startsWith('function syncBattleInsights()'));
assert.equal(line,change.replacement);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');if(sha(html)===change.candidateSha256){assert.equal(sha(html.replace(change.replacement,change.old)),change.sourceSha256);console.log('PASS exact one-function delta; every other source byte, font, log, BattleInsights accounting, replay metadata and protocol is unchanged');}
const hookStart=html.indexOf('const insightsUpdate=update;'),hookEnd=html.indexOf('const BATTLE_LOG_CATALOG=',hookStart),hooks=html.slice(hookStart,hookEnd);
assert.equal(hooks,"const insightsUpdate=update;update=function(){insightsUpdate();syncBattleInsights();};\nconst insightsDisplay=displayMultiState;displayMultiState=function(){insightsDisplay();syncBattleInsights();};\n");
const keep={winner:'左の勝利',amount:'+25 G',next:'次の戦いへ',log:'近接攻撃で13ダメージ（HP 0/30）。左の勝利。右が全滅（残存 青1体・赤0体）'},label={hidden:false,textContent:'MVP：古い表示\n接戦 · 勝利軍の初期兵残HP 9.9%'};
let updateCount=0,displayCount=0;
const context=vm.createContext({document:{querySelector:id=>id==='#battleInsights'?label:keep},update:()=>{updateCount++},displayMultiState:()=>{displayCount++},BattleInsights:{finish:()=>{throw Error('presentation must not trigger scoring')}},state:'choose',winner:null,units:[]});
vm.runInContext(line+'\n'+hooks,context);
let count=0;
for(const mode of ['solo','multi','multi-reconnect'])for(const phase of ['choose','predict','locked','fight','battle','settle','result'])for(const round of [1,10,11])for(const winner of [0,1,null])for(const route of ['syncBattleInsights','update','displayMultiState']){
 label.hidden=false;label.textContent='MVP：古い表示\n接戦 · 勝利軍の初期兵残HP 9.9%';
 Object.assign(context,{state:phase,round,winner,multiSession:mode==='solo'?null:{getReplay:()=>{throw Error('presentation must not fetch replay')}},multiSnapshot:{phase,roundId:round,winner:winner===null?'draw':winner===0?'A':'B'},multiReplay:mode==='multi-reconnect'?null:{battleFacts:{close:9.9,mvp:{kind:'sword',value:25}}}});
 vm.runInContext(route+'()',context);assert.equal(label.textContent,'',[mode,phase,round,winner,route].join('/'));assert.equal(label.hidden,true);assert.deepEqual(keep,{winner:'左の勝利',amount:'+25 G',next:'次の戦いへ',log:'近接攻撃で13ダメージ（HP 0/30）。左の勝利。右が全滅（残存 青1体・赤0体）'});count++;
}
assert.equal(updateCount,count/3);assert.equal(displayCount,count/3);
context.document.querySelector=()=>null;vm.runInContext('syncBattleInsights();update();displayMultiState()',context);
assert(!line.includes('接戦'));assert(!line.includes('MVP'));
console.log('PASS '+count+' result/reset/reconnect routes: stale appraisal cleared in solo/multi, left/right/draw, 1st/10th/11th round, update and direct multiplayer display; settlement/log/winner/next untouched');
console.log('PASS absent-node handling and wrapper delegation counts');
