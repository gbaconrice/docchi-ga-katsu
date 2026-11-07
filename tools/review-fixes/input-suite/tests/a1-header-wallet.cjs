const fs=require('fs'),assert=require('assert'),source=fs.readFileSync('index.html','utf8');
const header=source.slice(source.indexOf('<div id="gameTopline" class="game-topline">'),source.indexOf('<h2 id="phaseTitle"'));
assert(header.indexOf('id="fieldStatus"')<header.indexOf('id="status"'));assert(header.indexOf('id="status"')<header.indexOf('class="wallet-pill"'));assert(header.indexOf('class="wallet-pill"')<header.indexOf('id="soundToggle"'));assert(!/💎|ダイヤ/.test(header));
assert(header.includes('class="wallet-coin" src="data:image/png;base64,')&&header.includes('alt="" aria-hidden="true"'));assert(/id="balance"[^>]*>100<\/strong>/.test(header));
const added=source.slice(source.indexOf('/* A1 header:'),source.indexOf('</style>'));const finalHeader=source.slice(source.indexOf('/* terrain-inline-20261106:'),source.indexOf('</style>'));const amountRules=source.slice(source.indexOf('/* gold-full-amount-20261106:'),source.indexOf('/* Utility dialogs'));assert(amountRules.includes('grid-template-columns:max-content minmax(0,1fr) 44px;'));assert(amountRules.includes('scrollbar-width:thin;'));assert(finalHeader.includes('grid-template-rows:40px 20px;'));assert(added.includes('width:calc((100% - 18px) / 4)'));assert(added.includes('overflow-x:auto; overflow-y:hidden'));for(const rule of added.matchAll(/([^{}]+)\{([^{}]*)\}/g))if(/(?:game-topline|wallet-pill|#balance|wallet-coin)/.test(rule[1]))assert(!/(?:box-shadow|text-shadow)\s*:(?!none\b)/.test(rule[2]),'Header rules do not add shadows');
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context),click=id=>elem(id).onclick({isTrusted:true});
assert.equal(elem('#status').textContent,'第1／10戦');assert.equal(elem('#balance').textContent,'100');
assert.equal(elem('#fieldStatus').textContent,run('inlineFieldLabel(battleEnvironment)'));
for(const [input,want]of [[0,'0'],[100,'100'],[12430,'12,430'],['99999999999999999999','99,999,999,999,999,999,999']]){assert.equal(run('walletBalanceText('+JSON.stringify(input)+')'),want);assert.equal(run('MoneyUI.balanceText('+JSON.stringify(input)+')'),want+' G');}
const saved=run('JSON.stringify(walletState)');run("walletBalanceText('99999999999999999999')");assert.equal(run('JSON.stringify(walletState)'),saved,'formatting changed ledger');
click('#red');click('#confirm');assert.equal(elem('#pause').hidden,false);assert.equal(elem('#balance').textContent,'100');
click('#pause');assert(run('paused'));click('#pauseResume');assert(!run('paused'));
run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:'A',now:0});state='result';winner=0;update();syncPersonalResult(1000)");
assert(!elem('#balance').textContent.endsWith(' G'));assert.equal(elem('#pause').hidden,false);assert.equal(elem('#pause').disabled,false);
run('nextPrediction()');assert.equal(elem('#status').textContent,'第2／10戦');assert.equal(elem('#fieldStatus').textContent,run('inlineFieldLabel(battleEnvironment)'));assert(!elem('#balance').textContent.endsWith(' G'));
console.log('PASS field/round/coin/audio order; numeric wallet, BigInt formatting, unchanged G labels elsewhere, pause/result/new-round updates');
`)(require,assert);
