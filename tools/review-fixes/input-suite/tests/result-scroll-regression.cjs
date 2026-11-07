const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('index.html','utf8');
const receipt=source.match(/\.cashout-receipt\s*\{([^}]*)\}/)?.[1];assert(receipt);
assert(/color:\s*#432e1d\s*;/.test(receipt),'cashout receipt must use dark ink');
assert(/#comparisonScroll\s*\{\s*overflow-anchor\s*:\s*none/.test(source),'scroll anchoring should not restore an old card');
function lum(hex){return hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
const a=lum('432e1d'),b=lum('f2dfb8');assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'cashout foreground should contrast against parchment');
const h=fs.readFileSync('tests/boot-smoke.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
context.TextEncoder=require('util').TextEncoder;
const scroll=nodes.get('#comparisonScroll');assert(scroll);
scroll.scrollTop=219;vm.runInContext('setup(91357)',context);assert.equal(scroll.scrollTop,0,'new solo round resets after render');
scroll.scrollTop=115;vm.runInContext('update()',context);assert.equal(scroll.scrollTop,115,'ordinary solo refresh preserves user scroll');
vm.runInContext('state="choose";beginMock()',context);
scroll.scrollTop=211;vm.runInContext('openMultiRound()',context);assert.equal(scroll.scrollTop,0,'first multiplayer prediction resets');
scroll.scrollTop=88;vm.runInContext('displayMultiState()',context);assert.equal(scroll.scrollTop,88,'same round refresh preserves user scroll');
vm.runInContext('multiSnapshot={...multiSnapshot,roundId:2};displayMultiState()',context);assert.equal(scroll.scrollTop,0,'next multiplayer prediction resets');
scroll.scrollTop=66;vm.runInContext('displayMultiState()',context);assert.equal(scroll.scrollTop,66,'subsequent refresh preserves scroll');
console.log('PASS cashout contrast; solo and multiplayer reset only on new prediction');
`)(require,assert);
