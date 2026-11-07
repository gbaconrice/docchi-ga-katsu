'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const current=fs.readFileSync('index.html','utf8'),baseline=fs.readFileSync(process.env.READABILITY_BASELINE_HTML||'../v18/source/index.html','utf8');
function logContext(html){const a=html.indexOf('const BATTLE_LOG_CATALOG='),b=html.indexOf('let battleLogObserved=',a);const ctx={TYPES:{a:{name:'テストの剣士'},b:{name:'テストの魔法使い'}}};vm.createContext(ctx);vm.runInContext(html.slice(a,b)+';globalThis.result={BattleLog,BATTLE_LOG_CATALOG};',ctx);return ctx.result;}
const now=logContext(current),old=logContext(baseline),keys=Object.keys(old.BATTLE_LOG_CATALOG);
assert.deepEqual(Object.keys(now.BATTLE_LOG_CATALOG),keys,'No event category removed or added');
const actors=[{token:'a',k:'a',side:0},{token:'b',k:'b',side:1}],records=[];
for(const type of keys){const prior=old.BATTLE_LOG_CATALOG[type],next=now.BATTLE_LOG_CATALOG[type];for(const k of ['s','t','extra'])assert.equal(JSON.stringify(prior[k]),JSON.stringify(next[k]),type+' '+k);
 const data={type,amount:5,actualAmount:3,count:2,reason:'complete',factor:.5,remainingCharges:1,charges:1,reduction:.25,delay:1,dps:2,multiplier:2,subhitId:2,status:'poison'};
 for(const k of prior.s)data[k]='a';for(const k of prior.t)data[k]='b';for(const k of Object.values(prior.extra))data[k]='a';records.push(data);
}
const a=old.BattleLog.createRecorder(actors),b=now.BattleLog.createRecorder(actors);a.capture(1,records,actors);b.capture(1,records,actors);
assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'All logged rows and original data preserved exactly');
assert.equal(b.rows().length,keys.length);assert.equal(b.stats().unknown,0);
for(const row of b.rows()){const d=now.BattleLog.describe(row,b.catalog);assert(d.sentence.length>0);assert(!d.sentence.includes('終了：完了'));}
const describe=(type,data)=>now.BattleLog.describe({type,tick:1,source:0,target:1,data},b.catalog).sentence;
assert(describe('combo_melee_end',{reason:'complete'}).includes('連撃が完了'));
assert(describe('combo_melee_end',{reason:'out-of-range'}).includes('射程を超えた'));
assert(describe('projectile_end',{reason:'hit'}).includes('飛び道具が命中'));
assert(describe('poison_applied',{dps:2}).includes('毎秒2ダメージ'));
assert(!current.includes("p.fillText('×'+g.count"));assert(current.includes('quantity.textContent = `×${count}`'));
assert(current.includes("if(label)label.hidden=true"));assert(!current.includes('class="solo-reaction-label" hidden>あなた'));
console.log('PASS '+keys.length+' event types, every source/target binding and payload byte unchanged; readable phase endings, full counts kept once, solo label hidden.');
