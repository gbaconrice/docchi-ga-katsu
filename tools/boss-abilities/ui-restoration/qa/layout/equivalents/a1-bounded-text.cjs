// Demand-loading release variant: original canonical test is preserved.
const fs=require('fs'),assert=require('assert');const html=fs.readFileSync('index.html','utf8');
// Exact-value accessibility remains on the wallet. Terrain remains a plain complete line.
const walletTag=html.match(/<strong\b[^>]*id="balance"[^>]*>/)[0];
for(const a of ['role="region"','tabindex="0"','aria-label="所持ゴールド"','aria-describedby="headerScrollHelp"'])assert(walletTag.includes(a),a);
assert.equal((html.match(/id="headerScrollHelp"/g)||[]).length,1);
assert(html.includes('長い所持ゴールドは左右にスクロールすると全文を確認できます。'));
const fieldTag=html.match(/<p\b[^>]*id="fieldStatus"[^>]*>/)[0];
assert(fieldTag.includes('tabindex="0"')&&fieldTag.includes('role="region"')&&fieldTag.includes('aria-label="地形と効果"'));assert(!/role="button"|aria-haspopup|aria-controls/.test(fieldTag));
for(const token of ['fieldDetails','field-detail-icon','TerrainHeader','fieldStatusText'])assert(!html.includes(token));
assert(html.includes('fieldStatus.textContent=inlineFieldLabel(battleEnvironment);'));
// Inspect the exact 26px wallet layout block, not an earlier overridden 24px rule.
const layoutStart=html.indexOf('/* Keep terrain/effect, round, coin amount and audio'),layoutEnd=html.indexOf("/* Restore the selected A1 screenshot's distinct",layoutStart);
assert(layoutStart>0&&layoutEnd>layoutStart);
const walletLayout=html.slice(layoutStart,layoutEnd),walletMarker='#app #gameScreen > #gameTopline #balance {',walletStart=walletLayout.indexOf(walletMarker),walletRule=walletLayout.slice(walletStart,walletLayout.indexOf('}',walletStart));
assert(walletStart>=0);
for(const a of ['font-size:26px;','line-height:32px;','max-height:32px;','white-space:nowrap;','overflow-x:auto;','overflow-y:hidden;'])assert(walletRule.includes(a),a);
assert(!/text-overflow|line-clamp/.test(walletRule));
const fontStart=html.indexOf('#app #gameScreen > #gameTopline #balance {',layoutEnd),walletFont=html.slice(fontStart,html.indexOf('}',fontStart));
assert(walletFont.includes('font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'));
assert(walletFont.includes('font-variant-numeric:tabular-nums lining-nums;'));
for(const viewport of [280,320,375,390,430,900,1180]){const font=26,line=32,max=40;assert.equal(max-line,8);assert(font<=line);assert(max<=40);}
const terrainStart=html.indexOf('/* reference-layout-restoration-20261107 */'),terrainEnd=html.indexOf('</style>',terrainStart);assert(terrainStart>0&&terrainEnd>terrainStart);
const terrainCSS=html.slice(terrainStart,terrainEnd),rule=selector=>{const i=terrainCSS.indexOf(selector+' {');assert(i>=0,selector);return terrainCSS.slice(i,terrainCSS.indexOf('}',i));};
const fieldRule=rule('#app #gameScreen > #gameTopline #fieldStatus');
for(const a of ['font-size:13px;','line-height:20px;','height:20px;','max-height:20px;','white-space:nowrap;','overflow-x:auto;','overflow-y:hidden;','grid-column:1; grid-row:1;'])assert(fieldRule.includes(a),a);
assert(!/text-overflow|line-clamp/.test(fieldRule));assert(fieldRule.includes('touch-action:pan-x pinch-zoom;'));
assert(html.includes('地上に最大HP${p/2}%ダメージ/8秒'));
const header=rule('#app #gameScreen > #gameTopline.game-topline');
for(const a of ['grid-template-rows:44px;','row-gap:0;'])assert(header.includes(a),a);
assert.equal(44,44);
for(const [selector,col,row]of [['#status',2,'1'],['#fieldStatus',1,'1'],['.wallet-pill',3,'1'],['> #soundToggle',4,'1']]){const s=rule('#app #gameScreen > #gameTopline '+selector);assert(s.includes('grid-column:'+col+';')&&s.includes('grid-row:'+row+';'));}
const amountStart=html.indexOf('/* reference-layout-restoration-20261107 */'),amountRules=html.slice(amountStart,html.indexOf('/* Utility dialogs',amountStart));assert.equal(amountStart,terrainStart);for(const a of ['grid-template-columns:minmax(0,1fr) max-content 88px 44px;','align-self:center;','margin-block-start:0;','max-height:40px;','scrollbar-width:thin;'])assert(amountRules.includes(a));
assert(html.includes('#gameScreen > .game-topline > #soundToggle[hidden] {\n  display: grid !important;'));assert(html.includes('padding:6px 8px;'));assert(html.includes('flex-basis:auto;'));
const harness=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',harness+`
const run=s=>vm.runInContext(s,context);assert.equal(run('Money.MAX_AMOUNT_DIGITS'),600);
for(const value of ['0','100','12430','99999999999999999999','9'.repeat(600)]){
 const expected=value.replace(/\\B(?=(\\d{3})+(?!\\d))/g,',');
 assert.equal(run('walletBalanceText('+JSON.stringify(value)+')'),expected);
 run('walletState=SoloWallet.createSession({sessionId:"bounded-value",playerIds:[PLAYER],});walletState=JSON.parse(JSON.stringify(walletState));walletState.players[0].balance=Money.amountValue('+JSON.stringify(value)+');walletState=SoloWallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:1,deadline:100});round=1;selectedSide=null;selectedStake=minimumBetForBalance(currentWallet().balance);state="choose";update()');
 assert.equal(elem('#balance').textContent,expected);
 run('state="fight";update()');assert.equal(elem('#balance').textContent,expected);
 run('walletState=SoloWallet.commitPrediction(walletState,{sessionId:walletState.sessionId,roundId:1,playerId:PLAYER,side:"A",stake:selectedStake,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:"B",now:0});state="result";winner=1;update()');
 assert.equal(elem('#balance').textContent,run('walletBalanceText(currentWallet().balance)'));
 assert(!/[eE+]/.test(elem('#balance').textContent));
}
console.log('PASS exact 0–600 digit values before fight/result and unchanged amount formatting; readable26px amount with native scrollbar inside the40px top row, stable sound slot, focusable named scroll regions. Browser dimensions/AT remain unmeasured.');
`)(require,assert);
