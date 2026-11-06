const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),a=html.indexOf('/* Warm game controls:'),end=html.indexOf('/* Tavern strategy table:',a),b=end>=0?end:html.indexOf('</style>',a);assert(a>=0&&b>a);
const css=html.slice(a,b);
for(const x of ['#cashOut','#continueRun','.home-title',':focus-visible',':disabled','min-width: 44px','min-height: 48px'])assert(css.includes(x),x);
for(const x of ['#field {','clip-path','position: fixed','--gravity-top-inset','--gravity-bottom-inset'])assert(!css.includes(x),'unrelated battlefield or host layout change: '+x);
function lum(h){return h.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
for(const [fg,bg] of [['fff1dc','87423b'],['fff1dc','375d48'],['3d2718','ebd1a0']]){const a=lum(fg),b=lum(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg)}
console.log('PASS home and result controls: contrast, focus, disabled, tap dimensions and limited style scope');
const p=html.indexOf('/* Prediction and result hierarchy:'),q=end>=0?end:html.indexOf('</style>',p);assert(p>a&&q>p);
const ext=html.slice(p,q);
for(const x of ['.stake-card','.stake-option[aria-pressed="true"]','.stake-option:disabled','.stake-option:disabled[aria-pressed="true"]','.army-card[aria-pressed="true"]',':focus-visible','#formationToggle','#resultPanel','#message','#resultWinner','min-width:44px','min-height:44px'])assert(ext.includes(x),x);
for(const x of ['#field {','canvas {','position:fixed','clip-path','--gravity-top-inset','--gravity-bottom-inset'])assert(!ext.includes(x),'unrelated battlefield or host layout change: '+x);
for(const [fg,bg] of [['fff1dc','375d48'],['352719','e2ba6d'],['432e1d','ead4aa'],['5a5145','ddd2bd']]){const a=lum(fg),b=lum(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg)}
console.log('PASS prediction and result controls: selected, disabled, focus and contrast');
