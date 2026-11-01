const fs=require('fs'),{performance}=require('perf_hooks'),crypto=require('crypto');
const source=process.argv[2]||__dirname+'/../index.html';
const html=fs.readFileSync(source,'utf8');
const core=html.match(/<script>([\s\S]*)<\/script>/)[1].split('function damage(')[0];
const api=new Function('document',core+`;update=()=>{};function draw(){};return {TYPES,COST,rng,generated(s,r){round=r;setup(s);return units.map(u=>({...u}))},run(initial){units=initial.map(u=>({...u}));shots=[];elapsed=0;state='fight';choice=null;let ticks=0;while(state==='fight'&&ticks<3601){step(1/60);ticks++}return {winner,seconds:elapsed,ticks,hp:units.map(u=>u.hp)}}}`)({querySelector:()=>({getContext:()=>({})})});
const kinds=Object.keys(api.TYPES),cost=api.COST;
function form(a,b,s,spread=90,gap=298){let r=api.rng(s);return [a,b].flatMap((army,side)=>army.map((k,i)=>({id:side*100+i,side,k,x:90+(i%4)*spread,y:269+(side?gap/2:-gap/2)+(side?-1:1)*Math.floor(i/4)*36,hp:api.TYPES[k].hp,cd:r()*.5,priority:r(),dead:false})));}
function metric(rows){let decisive=rows.filter(x=>x.winner!==null),diff=decisive.filter(x=>x.na!==x.nb),eq=rows.filter(x=>x.ca===x.cb),budgetDiff=decisive.filter(x=>x.ca!==x.cb);return {n:rows.length,draws:rows.length-decisive.length,countOnlyAccuracy:decisive.length?decisive.reduce((v,x)=>v+(x.na===x.nb?.5:+(x.winner===(x.na>x.nb?0:1))),0)/decisive.length:null,unequalCountN:diff.length,moreCountWin:diff.length?diff.filter(x=>x.winner===(x.na>x.nb?0:1)).length/diff.length:null,equalBudgetN:eq.length,equalBudgetMoreCountWin:metricShallow(eq),moreBudgetWin:budgetDiff.length?budgetDiff.filter(x=>x.winner===(x.ca>x.cb?0:1)).length/budgetDiff.length:null,meanSeconds:rows.reduce((v,x)=>v+x.seconds,0)/rows.length};}
function metricShallow(rows){let d=rows.filter(x=>x.na!==x.nb&&x.winner!==null);return {n:d.length,rate:d.length?d.filter(x=>x.winner===(x.na>x.nb?0:1)).length/d.length:null}}
function record(a,b,s,extra={}){return {...extra,na:a.length,nb:b.length,ca:a.reduce((v,k)=>v+cost[k],0),cb:b.reduce((v,k)=>v+cost[k],0),...api.run(form(a,b,s))}}
const rep=(k,n)=>Array(n).fill(k);const out={source,sha256:crypto.createHash('sha256').update(html).digest('hex'),cost,types:api.TYPES};
if(require.main===module){
 let matrix=[];for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){let rows=[];for(let seed=1;seed<=4;seed++)rows.push(record(rep(kinds[i],4),rep(kinds[j],4),seed));matrix.push({a:kinds[i],b:kinds[j],aWins:rows.filter(x=>x.winner===0).length,bWins:rows.filter(x=>x.winner===1).length,draws:rows.filter(x=>x.winner===null).length})}out.equalCount4v4=matrix;console.log('equal-count',JSON.stringify(matrix));
 out.original={};for(let round of [1,5,10,16,20]){let rows=[];for(let i=0;i<200;i++){let initial=api.generated(100000+i*7919,round),a=initial.filter(x=>x.side===0).map(x=>x.k),b=initial.filter(x=>x.side===1).map(x=>x.k);rows.push({...recordMeta(a,b),...api.run(initial)})}out.original[round]=metric(rows);console.log('original',round,JSON.stringify(out.original[round]))}
 fs.writeFileSync(__dirname+'/initial-results.json',JSON.stringify(out,null,2));
}
function recordMeta(a,b){return {na:a.length,nb:b.length,ca:a.reduce((v,k)=>v+cost[k],0),cb:b.reduce((v,k)=>v+cost[k],0)}}
module.exports={api,form,metric,record,recordMeta,rep,kinds,cost};
