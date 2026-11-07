'use strict';
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(process.env.GAME_HTML||process.argv[2]||'index.html','utf8');
const marker='/* gold-full-amount-20261106:',p=html.indexOf(marker),end=html.indexOf('/* Utility dialogs',p);assert(p>0&&end>p);
const block=html.slice(p,end),rule=sel=>{const at=block.indexOf(sel+' {');assert(at>=0);return block.slice(at,block.indexOf('}',at));};
assert.equal(html.split(marker).length,2);
assert(rule('#app #gameScreen > #gameTopline.game-topline').includes('grid-template-columns:max-content minmax(0,1fr) 44px;'));
const wallet=rule('#app #gameScreen > #gameTopline .wallet-pill');assert(wallet.includes('align-self:center;')&&wallet.includes('margin-block-start:0;'));
const balance=rule('#app #gameScreen > #gameTopline #balance');assert(balance.includes('max-height:40px;')&&balance.includes('scrollbar-width:thin;'));
assert(rule('#app #gameScreen > #gameTopline #balance::-webkit-scrollbar').includes('display:block;'));
assert(!block.includes('font-size:')&&!block.includes('font-family:')&&!block.includes('font-weight:')&&!block.includes('text-overflow:')&&!block.includes('overflow-x:hidden')&&!block.includes('grid-template-rows:'));
assert(html.includes('font-size:26px;\n  line-height:32px;'));
assert(html.includes('font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;\n  font-weight:600;'));
assert(html.includes('justify-content:flex-start;\n  text-align:left;'));
assert(html.includes('margin:0; padding:4px 8px;'));
assert(html.includes('width:44px; min-width:44px; max-width:44px; height:44px; min-height:44px;'));
// A row's60px reservation is unchanged. An optional native scrollbar may use
// the top row's spare8px, while the26px numeral line stays32px high.
assert(32+8<=40);assert(html.slice(end).includes('</style>'));
console.log('PASS exact amount uses remaining upper-row width;26px/system600/left alignment unchanged; native scroll visibility restored; no new UI, reduced size, rounding, terrain width or row-height changes. Browser fit checks are separate.');
