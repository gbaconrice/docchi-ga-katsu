'use strict';
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(process.env.GAME_HTML||process.argv[2]||'index.html','utf8');
const first=html.indexOf("/* Restore the selected A1 screenshot's distinct"),last=html.indexOf('/* Center each visible symbol',first);assert(first>0&&last>first);
const block=html.slice(first,last);
const expected=`#app #gameScreen > #gameTopline #balance {
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-weight:600;
  font-variant-numeric:tabular-nums lining-nums;
  letter-spacing:0;
}
#app #gameScreen #resultPanel #breakdown,
#app #gameScreen #resultPanel[data-double-up="true"] #breakdown {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:400;
  font-variant-numeric:normal;
  letter-spacing:normal;
}
#app #gameScreen #resultPanel[data-earned="true"] #breakdown {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:900;
  font-variant-numeric:tabular-nums;
  letter-spacing:.015em;
}`;
assert(block.includes(expected),'Exact state-specific selected-reference typography contract');
assert(!block.includes('Helvetica')&&!block.includes('Avenir'));
const start=html.indexOf('#app #gameScreen > .game-topline .wallet-pill {'),wallet=html.slice(start,html.indexOf('}',start));assert(wallet.includes('justify-content:flex-start;')&&wallet.includes('text-align:left;'));
assert(html.includes('font-size:26px;\n  line-height:32px;'));
assert(html.includes('font-size:clamp(30px,9vw,44px);'));
assert(html.includes('margin:0; padding:4px 8px;'));
assert(html.includes('width:44px; min-width:44px; max-width:44px; height:44px; min-height:44px;'));
console.log('PASS selected-reference money-only typography: wallet system600 tabular lining/zero; result Mincho/Georgia400 normal, earned900 tabular/.015em; left-aligned coin/value; current sizes and44px controls retained. Rendered/iOS verification remains separate.');
