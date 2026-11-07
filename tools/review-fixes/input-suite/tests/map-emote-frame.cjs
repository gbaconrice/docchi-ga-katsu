const assert=require('assert'),fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('.field-stage {\n  container-type: size;'));
assert(html.includes('width: min(100cqw, calc((100cqh - 2px) * 480 / 538 + 2px));'));
assert(html.includes('height: min(100cqh, calc((100cqw - 2px) * 538 / 480 + 2px));'));
const toolbar=html.slice(html.indexOf('<div id="gameToolbar" class="battle-toolbar">'),html.indexOf('<div id="participantRailWrap"'));
assert(!toolbar.includes('id="reaction-feedback"'));
const map=html.match(/<div id="fieldMap" class="field-map">([\s\S]*?)<\/div>/)[1];
assert(map.includes('<canvas id="field" width="480" height="538"'));
assert(!map.includes('id="reaction-feedback"'));
const rail=html.slice(html.indexOf('<div id="participantRailWrap"'),html.indexOf('<section id="comparison"'));assert(rail.includes('id="reaction-feedback"'));
assert(html.includes('position:static; inset:auto; flex:0 0 32px; width:32px; height:32px;'));
assert(!html.includes('#gameScreen[data-field-view="true"] .reaction-feedback {'));
const reactionCSS=html.match(/\.reaction-feedback \{([\s\S]*?)\}/)[1];
assert(reactionCSS.includes('top: 12px;')&&reactionCSS.includes('left: 12px;'));
assert(reactionCSS.includes('pointer-events: none;'));
let checked=0;
for(let W=100;W<=1400;W+=7)for(let H=100;H<=1200;H+=7){
 const fw=Math.min(W,(H-2)*480/538+2),fh=Math.min(H,(W-2)*538/480+2),scale=Math.min((W-2)/480,(H-2)/538);
 assert(fw<=W+1e-9&&fh<=H+1e-9);
 assert(Math.abs((fw-2)/480-(fh-2)/538)<1e-9);
 assert(Math.abs((fw-2)/480-scale)<1e-9);
 checked++;
}
console.log('PASS fitted frame equation across '+checked+' stage dimensions, native canvas ratio, upper-lane reaction outside the map, non-interactive feedback');
