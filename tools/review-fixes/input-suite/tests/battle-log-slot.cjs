const fs=require('fs'),assert=require('assert');
const harness=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
new Function('require','assert',harness+`
const run=s=>vm.runInContext(s,context,{timeout:60000}),battle=nodes.get('#battle'),log=run("document.querySelector('#battleLog')"),attributes=new Map();let slotWrites=0;
battle.getAttribute=k=>attributes.get(k)||null;battle.setAttribute=(k,v)=>{attributes.set(k,String(v));if(k==='data-battle-log-slot')slotWrites++;};
run("multiSession=null;multiReplay=null;multiPlayback=null;multiRecording=false;predictionPreview=false;screenMode='game';state='fight';syncBattleLog(0)");
assert.equal(log.hidden,false);assert.equal(attributes.get('data-battle-log-slot'),'true');
run('syncBattleLog(1);syncBattleLog(2)');assert.equal(slotWrites,1,'unchanged slot does not write DOM each frame');
run("state='result';syncBattleLog(10)");assert.equal(log.hidden,true);assert.equal(log.disabled,true);assert.equal(log.inert,true);assert.equal(attributes.get('data-battle-log-slot'),'true','result reserves same row');assert.equal(slotWrites,1,'fight to result does not change map reservation');
run("state='choose';syncBattleLog(20)");assert.equal(log.hidden,true);assert.equal(attributes.get('data-battle-log-slot'),'false');
run("state='fight';screenMode='home';syncBattleLog(30)");assert.equal(log.hidden,true);assert.equal(attributes.get('data-battle-log-slot'),'false');
run("screenMode='game';multiRecording=true;syncBattleLog(40)");assert.equal(log.hidden,true);assert.equal(attributes.get('data-battle-log-slot'),'false','host precomputation reserves no row');
run("multiRecording=false;multiSession={};multiPlayback=null;syncBattleLog(50)");assert.equal(log.hidden,true);assert.equal(attributes.get('data-battle-log-slot'),'false','unavailable replay reserves no row');
run("multiPlayback={};syncBattleLog(60)");assert.equal(log.hidden,false);assert.equal(attributes.get('data-battle-log-slot'),'true');
run("state='result';syncBattleLog(70)");assert.equal(log.hidden,true);assert.equal(log.disabled,true);assert.equal(log.inert,true);assert.equal(attributes.get('data-battle-log-slot'),'true','guest result preserves log slot');
run("state='fight';predictionPreview=true;syncBattleLog(80)");assert.equal(log.hidden,true);assert.equal(attributes.get('data-battle-log-slot'),'false');
console.log('PASS solo/guest fight and result reservation; prediction/home/precomputation/missing replay exclusion; no repeated attribute writes');
`)(require,assert);
const s=fs.readFileSync('index.html','utf8');
assert(s.includes('#battle[data-battle-log-slot="true"] > .battle-log[hidden] { display:grid !important; visibility:hidden; pointer-events:none; }'));
for(const rule of ['.battle-log { position:absolute; left:0; right:84px; bottom:0; }','.crowd-inspector { bottom:48px; }','.field-stage { bottom:48px; }','[data-crowd-inspector="true"] .field-stage { bottom:116px; }'])assert(s.includes(rule),rule);
assert(s.includes('@media (min-width:900px) and (min-height:640px)'));
console.log('PASS hidden row retains geometry without interaction and desktop has separate field/details/log bands');

assert(s.includes('[hidden] { display: none !important; }'),'generic important hidden rule still exists');
assert(s.includes('.battle-log[hidden] { display:grid !important;'),'reserved slot must override generic important display:none');
console.log('PASS reserved log overrides the generic important hidden rule');

assert(s.includes('#app #gameScreen[data-personal-result="true"] #battle[data-battle-log-slot="true"] > #battleLog[hidden] { display:grid!important; visibility:hidden; pointer-events:none; }'),'reserved result selector must outrank result display:none');
