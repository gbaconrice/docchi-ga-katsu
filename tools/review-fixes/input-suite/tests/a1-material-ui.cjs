'use strict';
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(process.env.GAME_HTML||'index.html','utf8'),start=html.indexOf('/* A1 material pass.'),end=html.indexOf('/* Stable upper game UI:',start);assert(start>=0&&end>start);
const css=html.slice(start,end);assert(html.includes('#app #gameScreen > #gameToolbar {'));assert(html.slice(end).includes('background:var(--a1-grain),var(--a1-wood);'),'Persistent toolbar retains wood in every phase');
assert.equal((css.match(/data:image\/svg\+xml,/g)||[]).length,3,'Exactly three new SVG decorations');
for(const token of ['--a1-paper:','var(--tavern-table-art)','pointer-events:none','border-image:var(--a1-paper-edge)','border-image:var(--a1-brass-edge)','font-size:10px','content:"あなた・"'])assert(css.includes(token),token);
for(const forbidden of ['#homeScreen','.home-choice','--gravity-top-inset','--gravity-bottom-inset','transform:','filter:drop-shadow','position:fixed','overflow:hidden','display:none','!important'])assert(!css.includes(forbidden),'Material patch must not contain '+forbidden);
for(const side of ['red','blue']){
 const button=html.indexOf('id="'+side+'" class="army-card'),picks=html.indexOf('id="'+side+'Picks"',button),stats=html.indexOf('id="'+side+'Stats"',button),close=html.indexOf('</button>',button);
 assert(button>=0&&button<picks&&picks<stats&&stats<close,side+' avatars precede stats within the existing selection button');
}
assert(css.includes('#app #gameScreen.game-screen #pause'),'Utility paint wins prior theme specificity without moving it');
assert(css.includes('.wallet-pill { background:none; border:0; outline:0; box-shadow:none; }'),'Currency has no pill frame');
console.log('PASS A1 scoped materials, preserved home and host inset, noninteractive decoration, three SVGs, avatar order and currency surface');
