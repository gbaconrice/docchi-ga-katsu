const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const css=html.slice(html.indexOf('/* A quiet tavern ledger:'),html.indexOf('</style>'));
for(const rule of ['#gameScreen > .game-topline {','#gameScreen > .game-topline .wallet-pill {']){
 const a=css.indexOf(rule),b=css.indexOf('}',a);const body=css.slice(a,b);
 assert(body.includes('border:0;'));assert(body.includes('box-shadow:none;'));assert(!body.includes('gradient('));
}
assert(css.includes('padding:6px 8px;'));assert(css.includes('margin-block:4px 6px;'));assert(css.includes('flex-basis:auto;'));
assert(css.includes('min-width:64px;'));assert(css.includes('max-width:48%;'));assert(css.includes('overflow-wrap:anywhere;'));
assert(html.includes('<span class="wallet-caption" aria-hidden="true">所持金</span>'));
assert.equal((html.match(/id="balance"/g)||[]).length,1);
assert.equal((html.match(/class="wallet-caption"/g)||[]).length,1);
function lum(h){const a=h.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722}
for(const fg of ['eee0c3','c9b28d','f2e5c8']){const ratio=(lum(fg)+.05)/(lum('3b2a20')+.05);assert(ratio>=4.5);console.log(`PASS ${fg} contrast ${ratio.toFixed(2)}:1`)}
console.log('PASS unframed counter, no HUD shadows or gradients, spacing, narrow-width rules and single label. Browser layout remains unverified.');
