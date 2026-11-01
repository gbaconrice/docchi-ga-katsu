/** Read-only deterministic baseline. No production edits, outcome rerolls, browser, renderer or native calls. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=__dirname,args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),runCount=Number(args.runs||20),output=path.resolve(__dirname,args.out||'candidate-audit.json'),seedStart=Number(args.seedStart||1),policy=args.config?JSON.parse(fs.readFileSync(path.resolve(__dirname,args.config),'utf8')):JSON.parse(fs.readFileSync(path.join(__dirname,'calibration/selected-policy.json'),'utf8'));
assert(Number.isInteger(runCount)&&runCount>=1&&runCount<=20,'runs must be 1..20');
const sourceFiles=['index.html','physics/physics.js','source/solo-v3.template','wallet/wallet.mjs'],hashes=()=>Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),sourceHashes=hashes();
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),originalScript=html.match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1],script=originalScript.replace("options[Math.floor(r()*options.length)]||['sword']","options[Math.floor(r()*options.length)]||(()=>{throw Error('EMPTY OPTIONS FALLBACK')})()");
function randomFor(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function app(seed){const nodes={},ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const m of html.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),value:'',setAttribute(){},addEventListener(){},scrollIntoView(){},getContext:()=>ctx};}const math=Object.create(Math);math.random=randomFor(seed);const c={TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},Math:math,document:{hidden:false,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null,getElementById:id=>nodes['#'+id]||null,addEventListener(){},createElement(){throw Error('unexpected DOM/network creation during balance audit')},head:{appendChild(){throw Error('unexpected network script load')}}},requestAnimationFrame:()=>{},addEventListener(){},console};c.window=c;vm.createContext(c);vm.runInContext(script,c);const run=s=>vm.runInContext(s,c);run('openSoloScreen()');assert.equal(run('Wallet.GAME_MODE'),'GRAVITY_QUICK10_V1');assert.equal(run('walletState.config.totalRounds'),10);return{run,c};}

const a=app(1);let checks=0;
for(let rr=1;rr<=10;rr++)for(let sample=0;sample<100;sample++){
 a.c.auditRound=rr;a.c.auditSample=sample;
 const x=JSON.parse(JSON.stringify(a.run(`(()=>{
  round=auditRound;carryStreak=auditSample%8;const stage=progressRound(),unlock={goblin:3,boar:3,slime:3,bombbug:6,frostmage:6,golem:8,stormmage:10,burrower:12,drake:12,wraith:12};
  const allowed=keys.filter(k=>stage>=(unlock[k]||1)&&(stage>5||['sword','shield','spear','archer','rider','goblin','boar','slime'].includes(k)));
  const cap=round===1?8:stage<=5?12:stage<=11?16:stage<=16?24:32;
  const n=1+auditSample%cap;const carry=Array.from({length:n},(_,i)=>allowed[(auditSample+(auditSample%3?i:0))%allowed.length]);
  pendingCarryKinds=round===1?null:carry;setup(700000+auditSample*17+round);
  const right=units.filter(u=>u.side===1),kinds=[...new Set(right.map(u=>u.k))];
  return {round,stage,cap,leftKinds:previousArmyKinds,rightKinds:kinds,n:right.length,healers:right.filter(u=>u.k==='healer').length,budget:budgets[1],spent:right.reduce((n,u)=>n+BALANCE_COST[u.k],0),needAir:previousArmyKinds.includes('drake'),hasAir:kinds.some(k=>TYPES[k].attackTargetMask?.includes('air')),eligibleDrake:previousArmyKinds.some(k=>TYPES[k].attackTargetMask?.includes('air'))};
 })()`)));
 assert(x.n<=x.cap);assert(x.spent<=x.budget.planned);assert.equal(x.spent,x.budget.spent);
 assert(x.healers<=Math.max(1,Math.floor(x.n*.35)));
 if(rr>1){assert.equal(x.rightKinds.length,rr<=3?1:rr<=6?2:3);if(x.needAir)assert(x.hasAir);if(!x.eligibleDrake)assert(!x.rightKinds.includes('drake'));}
 checks++;
}
const result={pass:true,checks,policy,assertions:['no empty-option fallback','exact 1/2/3 types','active unit cap','generation-budget ceiling/accounting','healer share','anti-air required','no uncounterable drake'],method:'100 deterministic synthetic eligible carry rosters per round, sizes 1..cap, pure and mixed, streaks0..7; not outcome-selected',sourceHashes};
fs.writeFileSync(path.join(__dirname,'v10-calibrated-generation-results.json'),JSON.stringify(result,null,2));console.log(result);
