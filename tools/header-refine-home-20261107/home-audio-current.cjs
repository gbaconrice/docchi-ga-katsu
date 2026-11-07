const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const source=fs.readFileSync('index.html','utf8');
const insertion='\n/* requested-home-audio-hide-20261107 */\n#app #homeScreen > #soundToggle { display:none !important; }\n\n';
assert.equal(source.split(insertion).length,2);
let prior=source.replace(insertion,'').replace(/const CONTENT_REVISION="[a-f0-9]{64}";/,'const CONTENT_REVISION="'+'0'.repeat(64)+'";');
const revision=crypto.createHash('sha256').update('docchi-boss-abilities-v1\0'+prior).digest('hex');
prior=prior.replace('const CONTENT_REVISION="'+'0'.repeat(64)+'";','const CONTENT_REVISION="'+revision+'";');
assert.equal(crypto.createHash('sha256').update(prior).digest('hex'),'14103deee70be661f36874c3ebfaa7e883d35bab92abea12089bd42368bea440');
console.log('PASS removing only the home-scoped CSS and resealing exactly restores prior source; no node/listener/game/room logic changed');
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context);
for(const id of ['#gameToolbar','#homeScreen','#menuAudioDock'])elem(id).appendChild=function(n){n.parentNode=this;};
const audio=elem('#soundToggle'),handler=audio.onclick;
for(const [mode,target] of [['home','#homeScreen'],['game','#gameToolbar'],['room','#menuAudioDock'],['home','#homeScreen'],['game','#gameToolbar']]){
 run('syncAudioControlPlacement('+JSON.stringify(mode)+')');assert.strictEqual(elem('#soundToggle'),audio);assert.strictEqual(audio.parentNode,elem(target));assert.strictEqual(audio.onclick,handler);assert.equal(audio.hidden,false);
}
console.log('PASS shared audio node and listener survive home/game/room/home/game; visibility suppressed exclusively by home CSS');
`)(require,assert);
