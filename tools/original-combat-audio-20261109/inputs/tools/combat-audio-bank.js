/* Original Combat Foley, revision 1, 2026-11-09.
 * Newly authored mathematical synthesis; no sampled recordings or encoded audio.
 * Each buffer contains a contact transient, material body, and decaying debris.
 * Independent fixed-seed noise, immutable recipes, bounded lazy cache (33 buffers).
 * Public API intentionally compatible with createBattleContactBank(context).
 */
(function(root){
  'use strict';
  const SR=32000, VARIANTS=3, TAU=Math.PI*2;
  // Numbers describe material resonances in Hz, decay in seconds and relative mix.
  // Modes are deliberately inharmonic except for the brief magical shimmer.
  const RECIPES=Object.freeze({
    blade: {length:.40,gain:.18,body:155,fall:110,thud:.18,noise:.64,cut:6200,grit:.020,tail:.060,ring:.21,modes:[780,1321,2237,3629,5107],decay:.085,scatter:.052,seed:101},
    blunt: {length:.26,gain:.19,body:112,fall:94,thud:.70,noise:.56,cut:2600,grit:.014,tail:.024,ring:.055,modes:[247,491,833],decay:.028,scatter:.030,seed:211},
    claw: {length:.33,gain:.18,body:164,fall:87,thud:.38,noise:.78,cut:4100,grit:.018,tail:.038,ring:.07,modes:[381,893,1621],decay:.032,scatter:.045,seed:307},
    stone: {length:.56,gain:.23,body:77,fall:57,thud:.77,noise:.57,cut:2100,grit:.027,tail:.115,ring:.13,modes:[119,207,367,619],decay:.066,scatter:.090,seed:419},
    ice: {length:.48,gain:.18,body:211,fall:107,thud:.20,noise:.65,cut:5500,grit:.015,tail:.050,ring:.25,modes:[1231,2113,3517,4799,6113],decay:.106,scatter:.080,seed:523},
    thunder: {length:.65,gain:.20,body:67,fall:68,thud:.62,noise:.90,cut:3600,grit:.014,tail:.145,ring:.065,modes:[97,181,389],decay:.100,scatter:.110,seed:631},
    fire: {length:.49,gain:.19,body:128,fall:111,thud:.28,noise:.84,cut:3000,grit:.026,tail:.110,ring:.025,modes:[317,689],decay:.045,scatter:.080,seed:739},
    blast: {length:.63,gain:.24,body:62,fall:108,thud:.80,noise:.80,cut:3200,grit:.026,tail:.130,ring:.07,modes:[89,151,277],decay:.076,scatter:.090,seed:853},
    magic: {length:.52,gain:.16,body:273,fall:170,thud:.25,noise:.42,cut:4300,grit:.018,tail:.050,ring:.19,modes:[631,947,1583,2249],decay:.114,scatter:.065,seed:967},
    release: {length:.22,gain:.055,body:382,fall:170,thud:.10,noise:.72,cut:2900,grit:.026,tail:.025,ring:.045,modes:[699,1429],decay:.022,scatter:.030,seed:1087},
    magicRelease: {length:.27,gain:.045,body:487,fall:-130,thud:.06,noise:.47,cut:3700,grit:.020,tail:.030,ring:.12,modes:[887,1433,2311],decay:.057,scatter:.037,seed:1193}
  });
  const FAMILIES=Object.freeze({blade:'blade',metal:'blade',shield:'blade',hit:'blunt',punch:'blunt',arrow:'blunt',claw:'claw',drake:'claw',heavy:'stone',golem:'stone',emerge:'stone',frost:'ice',snare:'magic',storm:'thunder',zap:'thunder',flame:'fire',bomb:'blast',blast:'blast',magic:'magic',summon:'magic',split:'magic',heal:'magic'});
  const own=(obj,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(obj,key);
  function randomStream(seed){
    let state=seed>>>0;
    return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  }
  function synthesize(context,family,variation){
    const p=RECIPES[family],random=randomStream(p.seed+variation*7919);
    const size=Math.ceil(p.length*SR),buffer=context.createBuffer(1,size,SR),out=buffer.getChannelData(0);
    const pitch=[1,.943,1.058][variation],texture=.91+random()*.18;
    // Damped second-order oscillators: bounded work, no per-mode per-sample trig.
    const modes=p.modes.map((f,index)=>{
      const frequency=f*pitch*(.985+random()*.03),decay=p.decay*(1-index*.085);
      const radius=Math.exp(-1/(decay*SR)),angle=TAU*frequency/SR;
      return {a:2*radius*Math.cos(angle),b:radius*radius,y1:0,y2:-Math.sin(angle)/radius,weight:1/(1+index*.65)};
    });
    // Three short secondary chips/crackles. Timing and resonances change per take.
    const debris=Array.from({length:3},(_,j)=>{
      const time=(.011+j*p.scatter*.62)*(.85+random()*.30),strength=.23+random()*.21,decay=.005+random()*.009;
      return {start:Math.round(time*SR),strength,step:Math.exp(-1/(decay*SR)),envelope:1,attack:1};
    });
    const cutoff=p.cut*texture,alpha=1-Math.exp(-TAU*cutoff/SR),slowAlpha=1-Math.exp(-TAU*320/SR);
    const bodyDecay=(family==='stone'||family==='blast'||family==='thunder')?.063:.026;
    const step={attack:Math.exp(-1/(SR*.00065)),grit:Math.exp(-1/(SR*p.grit)),tailAttack:Math.exp(-1/(SR*.009)),tail:Math.exp(-1/(SR*p.tail)),body:Math.exp(-1/(SR*bodyDecay)),fall:Math.exp(-1/(SR*.015)),chipAttack:Math.exp(-1/(SR*.0008))};
    let attackState=1,gritState=1,tailAttack=1,tailState=1,bodyState=1,fallState=1;
    let low=0,slow=0,previousIn=0,dc=0,phase=0,peak=0;
    for(let i=0;i<size;i++){
      const t=i/SR,noise=random()*2-1;
      low+=alpha*(noise-low);slow+=slowAlpha*(low-slow);
      // Softened noise band avoids brittle full-band digital white-noise clicks.
      const contact=low-slow*.70;
      const attack=1-attackState;
      let envelope=gritState,chips=0;
      for(const d of debris){if(i>=d.start){chips+=d.strength*(1-d.attack)*d.envelope;d.attack*=step.chipAttack;d.envelope*=d.step;}}
      // Low-passed air/rubble gives heft without becoming a sustained tone.
      const tailEnvelope=(1-tailAttack)*tailState;
      if(family==='claw')envelope*=.70+.30*Math.cos(TAU*67*t);
      if(family==='fire')envelope+=.32*tailEnvelope*(.65+.35*Math.sin(TAU*39*t));
      if(family==='thunder')envelope+=.40*tailEnvelope;
      if(family==='blast')envelope+=.28*tailEnvelope;
      const frequency=(p.body+p.fall*fallState)*pitch;
      phase+=TAU*frequency/SR;
      const body=Math.sin(phase)*bodyState*p.thud;
      let ring=0;
      for(const m of modes){const y=m.a*m.y1-m.b*m.y2;m.y2=m.y1;m.y1=y;ring+=y*m.weight;}
      ring*=p.ring;
      let value=attack*(p.noise*contact*(envelope+chips)+slow*tailEnvelope*.8+body+ring);
      // 35 Hz DC blocker followed by gentle bounded saturation, never hard clipping.
      const filtered=value-previousIn+.99315*dc;previousIn=value;dc=filtered;
      value=Math.tanh(filtered*1.25);
      // Last 18 ms taper guarantees a quiet, click-free buffer boundary.
      value*=Math.min(1,(size-1-i)/(SR*.018));
      out[i]=value;peak=Math.max(peak,Math.abs(value));
      attackState*=step.attack;gritState*=step.grit;tailAttack*=step.tailAttack;tailState*=step.tail;bodyState*=step.body;fallState*=step.fall;
    }
    // Uniform headroom; loudness between families still controlled by their gain.
    const scale=.82/Math.max(.82,peak);
    for(let i=0;i<size;i++)out[i]*=scale;
    return buffer;
  }
  function createBattleContactBank(context){
    if(!context||typeof context.createBuffer!=='function')return null;
    const cache=new Map(),counts=new Map();
    function has(kind){return own(FAMILIES,kind);}
    function pick(kind,lane){
      if(!has(kind))return null;
      const family=lane==='release'?(kind==='arrow'?'release':'magicRelease'):FAMILIES[kind];
      const n=counts.get(family)||0,variation=n%VARIANTS,id='original-'+family+'-'+(variation+1);
      if(!cache.has(id))cache.set(id,synthesize(context,family,variation));
      // Counter remains bounded. Reset rewinds selection, retaining allocated buffers.
      counts.set(family,(n+1)%9);
      return {id,family,buffer:cache.get(id),rate:[1,.985,1.015][Math.floor(n/VARIANTS)],gain:RECIPES[family].gain*[1,.97,.985][variation]};
    }
    return Object.freeze({pick,has,reset:()=>counts.clear()});
  }
  root.createBattleContactBank=createBattleContactBank;
})(typeof globalThis!=='undefined'?globalThis:this);
