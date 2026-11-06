const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context,{timeout:120000});
class E{constructor(){this.attrs={};this.children=[];this.textContent='';this.scrollTop=0;this.clientHeight=160;this.className='';this.hidden=false;this.disabled=false;}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}replaceChildren(...xs){this.children=xs}get scrollHeight(){return this.children.length*34}}
context.document.createElement=()=>new E();for(const id of ['#battle','#battleLog','#battleLogSource','#battleLogArrow','#battleLogTarget','#battleLogAction','#battleLogHistory','#battleLogHistoryList','#battleLogStatus','#battleLogPrevious','#battleLogLatest','#battleLogRange','#battleLogResult'])nodes.set(id,new E());
const walk=n=>[n,...n.children.flatMap(walk)],flatten=n=>n.textContent+n.children.map(flatten).join('');
run("globalThis.toneActors=[{id:'a',token:'a',k:'healer',side:0},{id:'b',token:'b',k:'sword',side:1}];globalThis.toneCatalog=BattleLog.catalog();toneCatalog.add(toneActors,0);globalThis.toneRows=Object.keys(BATTLE_LOG_CATALOG).map((type,i)=>({tick:1,seq:i+1,type,source:0,target:1,data:{amount:10,actualAmount:3,factor:1.2,status:'poison',kind:'repair',reason:'ineligible',count:2,'@attacker':0}}));");
const typesBefore=run('JSON.stringify(TYPES)'),rowsBefore=run('JSON.stringify(toneRows)');
const rows=JSON.parse(rowsBefore);
assert(rows.length>=101);
for(const row of rows){
 assert(run('Object.hasOwn(BATTLE_LOG_EVENT_TONES,'+JSON.stringify(row.type)+')'),'unmapped event '+row.type);
 run('globalThis.toneRow=toneRows.find(r=>r.type==='+JSON.stringify(row.type)+');globalThis.toneDescription=BattleLog.describe(toneRow,toneCatalog);renderBattleLogParts(document.querySelector("#battleLogSource"),toneDescription)');
 const desc=JSON.parse(run('JSON.stringify(toneDescription)'));
 const action=desc.parts.filter(p=>p.tone);assert(action.length,row.type+' has no action fragments');assert(action.every(p=>p.tone===desc.tone));
 const summary=nodes.get('#battleLogSource');assert.equal(flatten(summary),desc.sentence);
 assert(summary.children.filter(x=>x.attrs['data-tone']).every(x=>x.attrs['data-tone']===desc.tone));
 for(const actor of summary.children.filter(x=>'data-side' in x.attrs)){assert(!('data-tone' in actor.attrs));assert(/[左右].*#1/.test(actor.textContent));}
}
run("multiSession=null;multiPlayback=null;screenMode='game';state='fight';predictionPreview=false;multiRecording=false;resetBattleLog(toneActors);soloBattleLog={catalog:toneCatalog,rows:()=>toneRows,stats:()=>({dropped:0,unknown:0,total:toneRows.length})};setBattleLogOpen(true);syncBattleLog(1000,true)");
const history=nodes.get('#battleLogHistoryList');assert.equal(history.children.length,rows.length);
for(let i=0;i<rows.length;i++){const desc=JSON.parse(run('JSON.stringify(BattleLog.describe(toneRows['+i+'],toneCatalog))'));const message=history.children[i].children[1];assert.equal(flatten(message),desc.sentence);assert(walk(message).some(e=>e.attrs['data-tone']===desc.tone),rows[i].type);for(const actor of walk(message).filter(e=>'data-side' in e.attrs))assert(!('data-tone' in actor.attrs));}
for(const [type,tone] of Object.entries({heal:'support',resolved_hit:'attack',haste_changed:'attack',move_boost_applied:'mobility',ward_granted:'defense',poison_applied:'control',summon_spawn:'summon',revive_start:'support',revive_complete:'support',revive_cancel:'support',death_explode:'attack',exposure_applied:'control',exposure_cleansed:'support'}))assert.equal(run('BattleLog.actionTone({type:'+JSON.stringify(type)+'})'),tone,type);
for(const [status,tone] of Object.entries({poison:'control',root:'control',slow:'control',exposure:'control',exposureImmunity:'defense',ward:'defense',followup:'attack',moveBoost:'mobility',retreat:'mobility',unknown:'neutral'}))assert.equal(run('BattleLog.actionTone({type:"status_expired",data:{status:'+JSON.stringify(status)+'}})'),tone);
for(const type of ['defense_action_start','defense_action_end'])for(const kind of ['repair','barrier'])assert.equal(run('BattleLog.actionTone({type:'+JSON.stringify(type)+',data:{kind:'+JSON.stringify(kind)+'}})'),kind==='repair'?'support':'defense');
for(const type of ['wave4_action_start','wave4_action_end'])for(const kind of ['stability','burst'])assert.equal(run('BattleLog.actionTone({type:'+JSON.stringify(type)+',data:{kind:'+JSON.stringify(kind)+'}})'),kind==='stability'?'defense':'attack');
for(const type of ['unknown','toString','__proto__'])assert.equal(run('BattleLog.actionTone({type:'+JSON.stringify(type)+'})'),'neutral');
assert.equal(run('JSON.stringify(TYPES)'),typesBefore);assert.equal(run('JSON.stringify(toneRows)'),rowsBefore);
for(const [status,word] of Object.entries({exposure:'被ダメージ増加',exposureImmunity:'被ダメージ増加への耐性'}))assert(run('BattleLog.describe({type:"status_expired",tick:1,source:0,target:1,data:{status:'+JSON.stringify(status)+'}},toneCatalog).sentence').includes(word));
for(const [reason,word] of Object.entries({ineligible:'復活対象外','no-space':'出現場所なし','battle-ended':'戦闘終了'}))assert(run('BattleLog.describe({type:"book_action_end",tick:1,source:0,target:1,data:{reason:'+JSON.stringify(reason)+'}},toneCatalog).sentence').includes(word));
console.log('PASS '+rows.length+' event types rendered in summary/history, unchanged text/actor identity/records, status-specific tones, haste as attack, and six future ability tones');
`)(require,assert);
