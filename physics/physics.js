// Independent collision candidate. Circle footprints are gameplay geometry.
const RADII={sword:9,shield:12,spear:9,archer:8,cannon:14,rider:15,healer:8};
// Preserve roughly the old center-to-center engagement distances, but measure
// reach from body surfaces. Large bodies now occupy actual battlefield space.
const REACH={sword:6,shield:3,spear:25,archer:132,cannon:102,rider:4,healer:72};
for(const k of keys){TYPES[k].radius=RADII[k];TYPES[k].reach=REACH[k]}
function stableOrder(a,b){return (a.priority??0)-(b.priority??0)||a.k.localeCompare(b.k)||(a.id??0)-(b.id??0)}
function nearbyGrid(list,positions=null){
 const cells=new Map(),size=48;
 for(const u of list){const p=positions?positions.get(u):u,key=Math.floor(p.x/size)+','+Math.floor(p.y/size);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(u)}
 return (x,y)=>{const found=[],cx=Math.floor(x/size),cy=Math.floor(y/size);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const u of cells.get((cx+dx)+','+(cy+dy))||[])found.push(u);return found.sort(stableOrder)};
}
function snapPosition(v){return Math.round(v*4096)/4096}
function resolveBodies(alive,positions){
 // Jacobi: each pass reads one shared position state, sums both sides of every
 // unordered pair, then writes all bodies together. No sequential push bias.
 for(let pass=0;pass<8;pass++){
  const near=nearbyGrid(alive,positions),index=new Map(alive.map((u,i)=>[u,i])),delta=new Map(alive.map(u=>[u,{x:0,y:0}]));let maximum=0;
  for(const u of alive){const p=positions.get(u),ru=RADII[u.k];for(const v of near(p.x,p.y)){if(index.get(v)<=index.get(u))continue;const q=positions.get(v),rv=RADII[v.k],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),penetration=ru+rv-d;if(penetration<=.01)continue;maximum=Math.max(maximum,penetration);const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,iu=1/(ru*ru),iv=1/(rv*rv),a=delta.get(u),b=delta.get(v),correction=penetration+.005;a.x-=nx*correction*iu/(iu+iv);a.y-=ny*correction*iu/(iu+iv);b.x+=nx*correction*iv/(iu+iv);b.y+=ny*correction*iv/(iu+iv)}}
  for(const u of alive){const p=positions.get(u),d=delta.get(u),r=RADII[u.k],length=Math.hypot(d.x,d.y),scale=length>r*.5?r*.5/length:1;p.x=Math.max(r,Math.min(480-r,p.x+d.x*scale));p.y=Math.max(r,Math.min(538-r,p.y+d.y*scale));p.x=snapPosition(p.x);p.y=snapPosition(p.y)}
  if(maximum<.04)break;
 }
}
function step(dt){
 elapsed+=dt;const alive=units.filter(u=>!u.dead).sort(stableOrder),pending=new Map(),moves=new Map(),attacks=[],near=nearbyGrid(alive);
 function hit(u,n,ranged){pending.set(u,(pending.get(u)||0)-n*(ranged?(TYPES[u.k].armor||1):1))}
 for(const u of alive){
  if(u.originForward===undefined)u.originForward=u.y<=269?1:-1;
  const t=TYPES[u.k],enemies=alive.filter(v=>v.side!==u.side);moves.set(u,{x:u.x,y:u.y});if(!enemies.length)continue;
  const gap=v=>Math.hypot(v.x-u.x,v.y-u.y)-t.radius-RADII[v.k];let dist=Math.min(...enemies.map(gap));const target=enemies.filter(v=>Math.abs(gap(v)-dist)<1e-7).sort(stableOrder)[0];u.cd-=dt;
  if(t.heal){const hurt=alive.filter(v=>v.side===u.side&&v.hp<TYPES[v.k].hp&&Math.hypot(v.x-u.x,v.y-u.y)<90+1e-7);if(hurt.length&&u.cd<=0){hurt.sort((a,b)=>a.hp/TYPES[a.k].hp-b.hp/TYPES[b.k].hp||stableOrder(a,b));const v=hurt[0];pending.set(v,(pending.get(v)||0)+t.heal);u.cd=t.rate;continue}}
  if(dist>t.reach+1/2048){
   let dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
   // Local avoidance is a movement intention, evaluated from the same snapshot.
   // originForward transforms with a reflected battlefield, not iteration order.
   const blocked=near(u.x,u.y).some(v=>v!==u&&v!==target&&((v.x-u.x)*nx+(v.y-u.y)*ny)>0&&Math.hypot(v.x-u.x,v.y-u.y)<t.radius+RADII[v.k]+5);
   if(blocked){const turn=(u.priority??.25)<.5?-1:1,tx=ny*u.originForward*turn,ty=-nx*u.originForward*turn;nx+=tx*1.35;ny+=ty*1.35;const length=Math.hypot(nx,ny);nx/=length;ny/=length}
   const travel=Math.min(t.speed*dt,Math.max(0,dist-t.reach));moves.set(u,{x:u.x+nx*travel,y:u.y+ny*travel});
  }else if(u.cd<=0){u.cd=t.rate;attacks.push([u,target,t])}
 }
 for(const [u,target,t]of attacks){if(t.projectile)shots.push({side:u.side,x:u.x,y:u.y,target,damage:t.dmg,splash:t.splash||0});else hit(target,t.dmg,false)}
 resolveBodies(alive,moves);for(const u of alive){const p=moves.get(u);u.x=p.x;u.y=p.y}
 for(const s of shots){const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);if(d<=210*dt+1e-7){if(s.splash){alive.filter(v=>v.side!==s.side&&Math.hypot(v.x-s.target.x,v.y-s.target.y)<=s.splash+1e-7).forEach(v=>hit(v,s.damage,true))}else if(!s.target.dead)hit(s.target,s.damage,true);s.done=true}else{s.x=snapPosition(s.x+dx/d*210*dt);s.y=snapPosition(s.y+dy/d*210*dt)}}
 shots=shots.filter(s=>!s.done);for(const [u,delta]of pending){u.hp=Math.min(TYPES[u.k].hp,u.hp+delta);if(u.hp<=0)u.dead=true}
 const a=units.some(u=>!u.dead&&u.side===0),b=units.some(u=>!u.dead&&u.side===1);if(!a||!b||elapsed>=60){winner=a&&!b?0:b&&!a?1:null;if(winner!==null){if(winner!==choice)mistakes++;else correct++}state='result';update()}
}
