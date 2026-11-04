// Summarize paired seed runs. Bootstrap whole sessions, not individual dependent fights.
const fs=require('fs'),path=require('path');const dir=process.argv[2]||'../balance-study',seeds=['123456789','4242','987654321'];
let random=(()=>{let x=20261103;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)})();
for(const label of ['prior','pr3','fixed']){
 let rows=seeds.flatMap(seed=>JSON.parse(fs.readFileSync(path.join(dir,`${label}-${seed}.json`),'utf8')).map(r=>({...r,seed})));let groups=[],g;for(const row of rows){if(!g||row.seed!==g.seed||row.round===1){g={seed:row.seed,rows:[]};groups.push(g)}g.rows.push(row)}
 const valid=r=>r.winner===0||r.winner===1,rate=arr=>{let a=arr.filter(valid);return {left:a.filter(r=>r.winner===0).length,right:a.filter(r=>r.winner===1).length,draw:arr.length-a.length,rate:a.length?a.filter(r=>r.winner===0).length/a.length:null}};
 const first=rate(rows.filter(r=>r.round===1)),champion=rate(rows.filter(r=>r.round>1)),boot=[];
 for(let i=0;i<3000;i++){let sample=[];for(let j=0;j<groups.length;j++)sample.push(...groups[Math.floor(random()*groups.length)].rows.filter(r=>r.round>1));let v=rate(sample).rate;if(v!==null)boot.push(v)}boot.sort((a,b)=>a-b);
 let streaks={};for(let n of [1,2,3,4])streaks[n]=rate(rows.filter(r=>r.round>1&&(n===4?r.streak>=4:r.streak===n)));
 console.log(JSON.stringify({label,fights:rows.length,sessions:groups.length,first,champion,championClusterBootstrap95:[boot[Math.floor(boot.length*.025)],boot[Math.floor(boot.length*.975)]],streaks,errors:rows.filter(r=>r.nextError&&r.nextError!=='restart').map(r=>({seed:r.seed,round:r.round,error:r.nextError})),timedOut:rows.filter(r=>r.timedOut).length,fallbacks:rows.filter(r=>r.fallback).length,avoidance:rows.filter(r=>r.avoidance).length,meanSeconds:rows.reduce((n,r)=>n+r.ticks,0)/rows.length/60,meanLeft:rows.reduce((n,r)=>n+r.nL,0)/rows.length,meanRight:rows.reduce((n,r)=>n+r.nR,0)/rows.length}));
}
const firstSeeds=['24680','13579'];
for(const label of ['prior','pr3','fixed']){
 const files=firstSeeds.map(seed=>path.join(dir,`first-${label}-${seed}.json`));if(!files.every(fs.existsSync))continue;
 const rows=files.flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8'))),left=rows.filter(r=>r.winner===0).length,right=rows.filter(r=>r.winner===1).length,n=left+right,p=n?left/n:0,z=1.96,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
 console.log(JSON.stringify({label,firstRoundSeparate:{left,right,draw:rows.length-n,rate:p,wilson95:[center-half,center+half],timedOut:rows.filter(r=>r.timedOut).length,errors:rows.filter(r=>r.nextError&&r.nextError!=='restart').length}}));
}
for(const file of ['edge-duels.json','edge-candidates.json','edge-wide.json']){const p=path.join(dir,file);if(!fs.existsSync(p))continue;const rows=JSON.parse(fs.readFileSync(p,'utf8'));for(const kind of [...new Set(rows.map(r=>r.kL))]){const a=rows.filter(r=>r.kL===kind);console.log(JSON.stringify({edgeFile:file,kind,n:a.length,left:a.filter(r=>r.winner===0).length,right:a.filter(r=>r.winner===1).length,draw:a.filter(r=>r.winner===null).length,errors:a.filter(r=>r.error).length,opponents:[...new Set(a.map(r=>r.kR))]}));}}
