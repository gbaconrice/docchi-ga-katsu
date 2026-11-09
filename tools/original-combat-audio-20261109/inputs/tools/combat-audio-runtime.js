    let contactBank = null;
    let lastReleaseAt = -Infinity, lastStatusAt = -Infinity;
    const contactCues = new Set(['blade','metal','shield','hit','punch','arrow','claw','drake','heavy','golem','emerge','frost','snare','storm','zap','flame','bomb','blast','magic']);
    function playContactCue(kind,intensity,guard) {
      if (!enabled()) return false;
      if (!contactBank) contactBank = globalThis.createBattleContactBank?.(context);
      if (!contactBank?.has(kind)) return null;
      const lane=guard?.audioLane || 'impact';
      let t=now();
      // Six global voices remain unchanged. One detail voice maximum, with a
      // reserved foreground slot; incoming contact can reclaim a spent tail.
      for(const v of Array.from(voices)) if(v.contactLane && v.contactEndsAt<=t) stopVoice(v);
      const details=Array.from(voices).filter(v=>v.contactLane && v.contactLane!=='impact');
      if(lane!=='impact' && (details.length || voices.size>=MAX_VOICES-1)) return false;
      if(lane==='impact' && voices.size>=MAX_VOICES){
        const victim=details[0] || Array.from(voices).filter(v=>v.contactLane==='impact'&&t-v.contactStartedAt>=.08).sort((a,b)=>a.contactStartedAt-b.contactStartedAt)[0];
        if(victim)stopVoice(victim);
      }
      let picked;
      try {picked=contactBank.pick(kind,lane);}catch(_){return null;}
      if(!picked?.buffer)return null;
      const duration=picked.buffer.duration/picked.rate, voice=startVoice(duration);
      if(!voice)return false;
      // Cold synthesis may advance the audio clock; schedule from playback time.
      t=now();
      voice.contactLane=lane;voice.contactStartedAt=t;voice.contactEndsAt=t+.008+duration;
      let source;
      try{
        source=managed(context.createBufferSource());source.buffer=picked.buffer;source.playbackRate.value=picked.rate;
        const gain=picked.gain*clamp(intensity,.25,1)*(lane==='status'?.36:1),p=voice.bus.gain;
        p.cancelScheduledValues(t);p.setValueAtTime(gain,t);p.setValueAtTime(gain,t+.008+Math.max(0,duration-.012));p.linearRampToValueAtTime(.0001,t+.008+duration);
        let output=voice.bus;
        // The bus and source consume the two reserved nodes; panning is optional.
        if(typeof context.createStereoPanner==='function' && nodeCount()<MAX_NODES){
          const pan=managed(context.createStereoPanner());pan.pan.value=Number.isFinite(guard?.x)?clamp((guard.x-240)/240,-1,1)*.42:0;
          pan.connect(voice.bus);voice.nodes.add(pan);output=pan;
        }
        if(!attachSource(voice,source,0,duration,0,output)){endVoice(voice);return false;}
        if(lane==='impact'&&['stone','blast','thunder'].includes(picked.family))duckAmbient(.78,.24);
        return true;
      }catch(_){if(source){releaseNode(source);voice.nodes.delete(source);}endVoice(voice);return false;}
    }
