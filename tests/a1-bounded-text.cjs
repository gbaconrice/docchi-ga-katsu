const fs=require('fs'),assert=require('assert');const html=fs.readFileSync('index.html','utf8');
for(const id of ['fieldStatus','balance']){const tag=html.match(new RegExp('<[^>]+id="'+id+'"[^>]*>'))[0];for(const a of ['role="region"','tabindex="0"','aria-label=','aria-describedby="headerScrollHelp"'])assert(tag.includes(a));}
assert.equal((html.match(/id="headerScrollHelp"/g)||[]).length,1);assert(html.includes('上下にスクロールすると全文'));
for(const [id,max,line]of [['fieldStatus',2.6,1.3],['balance',2.2,1.1]]){
 const marker='#app #gameScreen > .game-topline #'+id+' {',start=html.lastIndexOf(marker),rule=html.slice(start,html.indexOf('}',start));
 assert(rule.includes('max-height:'+max+'em;'));assert(rule.includes('overflow-y:auto;'));assert(rule.includes('overflow-x:hidden;'));assert(!/text-overflow|line-clamp/.test(rule));
 for(const viewport of [280,320,375,390,430,900,1180]){const font=id==='balance'?Math.max(16,Math.min(20,viewport*.04)):12;assert(Math.abs(max/line-2)<1e-10);assert(font*max<=44+1e-8);}
}
assert(html.includes('#gameScreen > .game-topline > #pause[hidden] {\n  display: grid !important;'));assert(html.includes('padding:6px 8px;'));assert(html.includes('flex-basis:auto;'));assert(html.includes('grid-template-columns:minmax(0,1.15fr) max-content minmax(0,1fr) 44px'));
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
console.log('PASS exact 0–600 digit values before fight/result and unchanged amount formatting; two-line CSS maxima <=44px, stable pause slot, focusable named scroll regions. Browser dimensions/AT remain unmeasured.');
`)(require,assert);
