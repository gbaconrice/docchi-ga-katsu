const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context),click=id=>elem(id).onclick({isTrusted:true});
for(const id of ['#gameToolbar','#gameTopline','#homeScreen','#menuAudioDock'])elem(id).appendChild=function(n){n.parentNode=this;};
const audio=elem('#soundToggle'),listener=audio.onclick;
for(const [mode,id] of [['game','#gameToolbar'],['home','#homeScreen'],['room','#menuAudioDock'],['game','#gameToolbar']]){run('syncAudioControlPlacement('+JSON.stringify(mode)+')');assert.strictEqual(audio.parentNode,elem(id));assert.strictEqual(audio.onclick,listener);}
console.log('PASS same audio node/listener moves game/home/room/game');
for(const state of ['choose','fight','result']){run('state='+JSON.stringify(state)+';syncFlowControls();syncPredictionPreview()');assert.equal(elem('#unitsToggle').hidden,true);}
console.log('PASS hidden information control after choose/fight/result sync');
for(const isMulti of [false,true])for(const state of ['choose','fight','result','choose']){
 run('multiSession='+ (isMulti?'{}':'null')+';state='+JSON.stringify(state)+';pausePanelOpen=false;pauseControlAvailable=()=>true;');
 click('#pause');assert.equal(elem('#pauseTitle').hidden,state==='choose');assert.equal(elem('#multiPauseNotice').hidden,state==='choose'||!isMulti);
 assert.equal(elem('#pauseResume').textContent,state==='fight'&&!isMulti?'再開':'閉じる');assert.equal(elem('#pauseExit').textContent,state==='choose'?'ゲームを終了する':'終了');
 click('#pauseResume');assert.equal(run('pausePanelOpen'),false);
}
console.log('PASS repeated solo/multi phase transitions restore title and notice; choose has only requested buttons');
run('multiSession=null;state="choose";');
const seen=new Set();for(let seed=0;seed<200;seed++){
 run('battleEnvironment=BattleFields.selectRunEnvironment('+seed+');update()');
 const field=run('battleEnvironment.fieldId');seen.add(field);assert.equal(elem('#fieldStatus').getAttribute('data-field'),field);assert.equal(elem('#fieldStatus').textContent,run('inlineFieldLabel(battleEnvironment)'));
}assert.equal(seen.size,8);
run('battleEnvironment=null;update()');assert.equal(elem('#fieldStatus').getAttribute('data-field'),'none');assert.equal(elem('#fieldStatus').textContent,'地図未定');
console.log('PASS all 8 stable terrain IDs plus none; full label preserved');
`)(require,assert);
