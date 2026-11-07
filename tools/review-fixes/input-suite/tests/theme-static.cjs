const fs=require('fs'),assert=require('assert');
const s=fs.readFileSync('index.html','utf8');
const a=s.indexOf('/* B direction:'),b=s.indexOf('</style></head><body>');
assert(a>s.indexOf('/* Restrained field-world skin:')&&b>a);
const css=s.slice(a,b);
for(const x of ['#app {','.home-title {','.army-red::before','.army-blue::before','.prediction-footer {','.result-panel,','#app button:disabled'])assert(css.includes(x),x);
assert(css.includes('linear-gradient(#985647,#6d342e')&&css.includes('linear-gradient(#41604a,#243d30'));
const canvas=s.match(/<canvas id="field"[^>]*>/)?.[0];assert(canvas);assert.match(canvas,/width="480"/);assert.match(canvas,/height="538"/);
console.log('PASS B styles follow old skin, major components covered, battlefield canvas dimensions preserved');
function lum(h){let x=h.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*x[0]+.7152*x[1]+.0722*x[2]}
function contrast(a,b){let x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const [x,y] of [['#fff0d6','#985647'],['#fff0d1','#41604a'],['#432e1d','#f2dfb8'],['#6b6254','#d0c5ad']]){const v=contrast(x,y);console.log(x,y,v.toFixed(2));if(x!=='#6b6254')assert(v>=4.5)}
