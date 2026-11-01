import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileClips,sampleClip,sampleAttack,samplePresentation,deathHoldTicks} from './clip-sampler.mjs';
const spec=JSON.parse(fs.readFileSync(new URL('./shield.clips.json',import.meta.url)));
const before=JSON.stringify(spec),r=compileClips(spec);
assert.equal(r.frames.length,59); assert.equal(new Set(r.frames.map(f=>f.index)).size,59);
for(const [name,c] of Object.entries(r.clips))for(const f of c.frames){assert.equal(sampleClip(r,name,f.startMs).index,f.index);assert.equal(f.sourceFrame,spec.clips[name].frames[f.local].sourceFrame);}
assert.equal(sampleAttack(r,1000,1000).local,8);assert.equal(sampleAttack(r,999,1000).local,7);
assert.equal(sampleAttack(r,0,1000).local,0);assert.equal(sampleAttack(r,99999,1000).local,12);
assert.equal(samplePresentation(r,{nowMs:1000,contactAtMs:1000,hitAtMs:1000}).local,8);
assert.equal(samplePresentation(r,{nowMs:1000,deadAtMs:1000,contactAtMs:1000}).clip,'death');
assert.equal(samplePresentation(r,{nowMs:1000,moving:true}).clip,'run');
assert.equal(samplePresentation(r,{nowMs:1000,anticipatedContactAtMs:1001}).local,7);
assert.equal(deathHoldTicks(r),55);assert.equal(sampleClip(r,'death',913).local,10);
assert.equal(JSON.stringify(spec),before);assert(Object.isFrozen(r.frames[0].rect));
const bad=structuredClone(spec);bad.clips.attack.contactFrame=13;assert.throws(()=>compileClips(bad));
assert.throws(()=>sampleClip(r,'idle',NaN));
console.log('PASS 59 full source frames; contact, priority, death55ticks, bounds, immutability');
