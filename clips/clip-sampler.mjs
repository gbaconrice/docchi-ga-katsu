// Pure presentation only. Global frame indices are role-local codec registry IDs.
export function compileClips(spec) {
  if(spec.schema!=='variable-clips-v1') throw Error('clip-schema');
  const frames=[], clips={};
  for(const [name,raw] of Object.entries(spec.clips)) {
    if(!raw.frames?.length) throw Error('empty-clip');
    let end=0;
    const entries=raw.frames.map((f,local)=>{
      if(!Number.isFinite(f.durationMs)||f.durationMs<=0||!Array.isArray(f.rect)||f.rect.length!==4) throw Error('invalid-frame');
      const [x,y,w,h]=f.rect;
      if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<=0||h<=0||x+w>spec.atlasSize[0]||y+h>spec.atlasSize[1]||frames.length>4095) throw Error('frame-bounds');
      const frame=Object.freeze({index:frames.length,clip:name,local,rect:Object.freeze([...f.rect]),sourceFrame:f.sourceFrame,startMs:end,endMs:end+f.durationMs});
      end=frame.endMs; frames.push(frame); return frame;
    });
    const contact=raw.contactFrame;
    if(contact!==undefined&&(!Number.isInteger(contact)||contact<0||contact>=entries.length)) throw Error('contact-frame');
    clips[name]=Object.freeze({frames:Object.freeze(entries),durationMs:end,loop:!!raw.loop,contactFrame:contact,contactMs:contact===undefined?null:entries[contact].startMs});
  }
  return Object.freeze({role:spec.role,frames:Object.freeze(frames),clips:Object.freeze(clips),anchor:Object.freeze([...spec.anchor])});
}
export function sampleClip(registry,name,elapsedMs,{loop}={}) {
  const c=registry.clips[name]; if(!c||!Number.isFinite(elapsedMs)) throw Error('sample-input');
  let t=Math.max(0,elapsedMs);
  if(loop??c.loop)t%=c.durationMs;
  for(const f of c.frames) if(t<f.endMs)return f;
  return c.frames[c.frames.length-1];
}
// Contact is authoritative: at contactMs the designated contact frame is exact.
// Short lead time skips early anticipation, never postpones a physical hit.
export function sampleAttack(registry,nowMs,contactAtMs) {
  const c=registry.clips.attack;
  if(!c||c.contactMs===null||!Number.isFinite(nowMs)||!Number.isFinite(contactAtMs))throw Error('attack-input');
  return sampleClip(registry,'attack',c.contactMs+nowMs-contactAtMs,{loop:false});
}
export function deathHoldTicks(registry,tickMs=1000/60) {
  if(!Number.isFinite(tickMs)||tickMs<=0) throw Error('tick-duration');
  const n=Math.ceil(registry.clips.death.durationMs/tickMs);
  if(n>600)throw Error('death-hold-cap'); return n;
}
// Caller supplies authoritative cue times; this function never infers attacks from CD changes.
export function samplePresentation(registry,{nowMs,deadAtMs=null,contactAtMs=null,hitAtMs=null,anticipatedContactAtMs=null,moving=false,cycleStartMs=0}) {
  if(!Number.isFinite(nowMs))throw Error('presentation-time');
  if(deadAtMs!==null)return sampleClip(registry,'death',nowMs-deadAtMs,{loop:false});
  const attack=registry.clips.attack;
  if(contactAtMs!==null&&nowMs>=contactAtMs&&nowMs-contactAtMs<attack.durationMs-attack.contactMs)return sampleAttack(registry,nowMs,contactAtMs);
  if(hitAtMs!==null&&nowMs>=hitAtMs&&nowMs-hitAtMs<registry.clips.hit.durationMs)return sampleClip(registry,'hit',nowMs-hitAtMs,{loop:false});
  if(anticipatedContactAtMs!==null&&anticipatedContactAtMs>=nowMs&&anticipatedContactAtMs-nowMs<=attack.contactMs)return sampleAttack(registry,nowMs,anticipatedContactAtMs);
  return sampleClip(registry,moving?'run':'idle',nowMs-cycleStartMs);
}
