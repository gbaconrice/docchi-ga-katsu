// Solo house odds: ledger settlement, quote shape, and end-to-end commit via the booted UI.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const BattleFields=(()=>{'),end=html.indexOf('const GrowthGenerator=(()=>{',start);
const {SoloWallet:W,MatchOdds:O,Wallet:M}=vm.runInNewContext(html.slice(start,end)+'\n;({SoloWallet,MatchOdds,Wallet})');

function round(odds,side,stake,outcome,roundId=1,s=null){
  s=s||W.createSession({sessionId:'s',playerIds:['p']});
  s=W.openRound(s,{sessionId:'s',roundId,deadline:9,odds});
  s=W.commitPrediction(s,{sessionId:'s',roundId,playerId:'p',side,stake,now:0});
  return W.settleRound(s,{sessionId:'s',roundId,outcome,now:0});
}
const bal=s=>s.players[0].balance;
// Round 1-10 with odds: net profit stake*(odds-1), half-up to whole G. 10 G at x2.60 -> +16 G.
assert.equal(bal(round({A:260,B:140},'A',10,'A')),116);
assert.equal(bal(round({A:260,B:140},'B',50,'B')),120);
// Miss and draw unchanged.
assert.equal(bal(round({A:260,B:140},'A',25,'B')),75);
assert.equal(bal(round({A:260,B:140},'A',25,'draw')),100);
// Half-up rounding: 25 G at x1.85 -> 21.25 -> 21; 10 G at x1.35 -> 3.5 -> 4.
assert.equal(bal(round({A:185,B:200},'A',25,'A')),121);
assert.equal(bal(round({A:135,B:200},'A',10,'A')),104);
// Ledger entry records the odds used.
assert.equal(round({A:260,B:140},'A',10,'A').ledger[0].entries[0].odds,260);
// No odds passed -> the flat 1.5x profit rule (multiplayer path) is untouched.
assert.equal(bal(round(null,'A',10,'A')),115);
assert.throws(()=>round({A:100,B:200},'A',10,'A'),/INVALID_ODDS/);
let m=M.createSession({sessionId:'m',playerIds:['a','b']});m=M.openRound(m,{sessionId:'m',roundId:1,deadline:9});
m=M.commitPrediction(m,{sessionId:'m',roundId:1,playerId:'a',side:'A',stake:10,now:0});m=M.commitPrediction(m,{sessionId:'m',roundId:1,playerId:'b',side:'B',stake:10,now:0});
m=M.settleRound(m,{sessionId:'m',roundId:1,outcome:'A',now:0});assert.deepEqual(m.players.map(p=>p.balance),[115,90]);assert(!('odds' in m.ledger[0].entries[0]));
// Quote: champion favoured, opening favours the right side, bounded, never pays more than the flat-rule average.
const open=O.quote({champion:false}),champ=O.quote({champion:true,streak:1}),long=O.quote({champion:true,streak:4}),dbl=O.quote({champion:true,streak:1,doubleUp:true});
assert(open.odds.A>open.odds.B&&champ.odds.A<champ.odds.B&&long.odds.A<champ.odds.A&&dbl.odds.A<champ.odds.A);
for(const [q,ret] of [[open,O.RETURN_EARLY],[champ,O.RETURN_EARLY],[long,O.RETURN_EARLY],[dbl,O.RETURN_DOUBLEUP]]){
  assert(q.odds.A>=O.MIN&&q.odds.B<=O.MAX);
  assert(q.pA*q.odds.A/100<=ret+1e-9&&(1-q.pA)*q.odds.B/100<=ret+1e-9,'expected return per side must not exceed the flat-rule average');
}
assert.deepEqual({open:open.odds,champ:champ.odds,long:long.odds,dbl:dbl.odds},{open:{A:390,B:180},champ:{A:190,B:355},long:{A:165,B:500},dbl:{A:150,B:285}});
console.log('PASS ledger odds settlement, legacy multiplayer path, quote symmetry/bounds');

// End to end: boot, start solo, odds shown, commit, settle with exact payout.
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
const smoke=fs.readFileSync(__dirname+'/bet-ui-smoke.cjs','utf8');
const harness=smoke.slice(0,smoke.indexOf("for(const id of ['#red'"));
const run=new Function('require','__dirname',harness+`
 const ev=s=>vm.runInContext(s,context);
 const odds=ev('walletState.currentRound.odds');assert(odds&&odds.A>100&&odds.B>100,'round opened with odds');
 const badge=nodes.get('#redOdds');assert(badge&&!badge.hidden&&badge.textContent===MatchOddsLabel(odds.A),'badge shows left odds: '+(badge&&badge.textContent));
 for(const id of ['#red','#stake25','#confirm'])nodes.get(id).onclick({isTrusted:true});
 let g=0;while(ev('state')==='fight'&&g<4000){ev('step(1/60)');g++}
 const e=ev('walletState.ledger[0].entries[0]'),w=ev('winner');
 const expect=w===null?0:w===0?Math.floor((25*(odds.A-100)+50)/100):-25;
 assert.equal(e.delta,expect,'settled delta');
 console.log('PASS e2e: odds badge '+badge.textContent+', winner '+w+', delta '+e.delta);
`);
function MatchOddsLabel(x){return '×'+(x/100).toFixed(2)}
global.assert=assert;global.MatchOddsLabel=MatchOddsLabel;
run(require,__dirname);
