const fs=require('fs'),assert=require('assert');const prefix=fs.readFileSync('tests/boot-smoke.cjs','utf8').split("for(const id of ['#red'")[0];new Function('require','assert',prefix+`
const before=vm.runInContext('assetProgress()',context);assert(before.pending>0,'test must begin with genuinely pending mock images');
nodes.get('#red').onclick({isTrusted:true});nodes.get('#confirm').onclick({isTrusted:true});assert.equal(vm.runInContext('state',context),'fight','inline loading must not block a selected prediction');
for(const image of [...pendingImages])if(typeof image.onerror==='function')image.onerror(new Error('deliberate mock failure'));
vm.runInContext('assetRefreshUI()',context);assert.equal(nodes.get('#assetNoticeBattle').hidden,false);assert.equal(nodes.get('#assetRetryBattle').hidden,false);assert.equal(typeof nodes.get('#assetRetryBattle').onclick,'function');
const prior=pendingImages.length;nodes.get('#assetRetryBattle').onclick({isTrusted:true});assert(pendingImages.length>prior,'retry must create replacement images');assert.equal(vm.runInContext('state',context),'fight','retry must not interrupt the fight');
console.log('PASS pending art does not block the game; actual image-error notice and Retry remain available during fight');
`)(require,assert);
