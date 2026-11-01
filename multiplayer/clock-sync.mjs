/** Application clock estimate, not native/server clock synchronization. */
export const CLOCK_SAMPLE_MAX_AGE_MS=15000, CLOCK_MAX_UNCERTAINTY_MS=500;
export function createClockEstimator({now=Date.now,send}){
 let sequence=0,lastProbe=-Infinity;const pending=new Map();let samples=[];
 function probe(force=false){const t=now();if(!Number.isSafeInteger(t)||t<0)return false;if(!force&&t-lastProbe<5000)return false;
  for(const [key,value]of pending)if(t-value>10000||t<value)pending.delete(key);
  if(pending.size>=4)return false;
  const token=String(++sequence);pending.set(token,t);lastProbe=t;send({type:'clock-probe',token,clientTime:t});return true;
 }
 function accept(m){const sent=pending.get(m.token),received=now();if(sent===undefined||m.clientTime!==sent||!Number.isSafeInteger(m.hostTime)||m.hostTime<0)return false;
  pending.delete(m.token);const rtt=received-sent;if(rtt<0||rtt>10000)return false;
  samples=samples.filter(s=>received-s.at>=0&&received-s.at<=CLOCK_SAMPLE_MAX_AGE_MS);
  samples.push({at:received,offset:m.hostTime-(sent+received)/2,rtt});if(samples.length>8)samples.shift();return true;
 }
 function estimate(){const t=now();const valid=samples.filter(s=>t-s.at>=0&&t-s.at<=CLOCK_SAMPLE_MAX_AGE_MS);
  if(!valid.length)return{known:false,estimatedHostNow:null,uncertaintyMs:null,sampleAgeMs:null,status:samples.length?'stale-clock':'unknown-clock'};
  const s=valid.reduce((a,b)=>b.rtt<a.rtt||b.rtt===a.rtt&&b.at>a.at?b:a);const uncertainty=s.rtt/2;
  return{known:uncertainty<=CLOCK_MAX_UNCERTAINTY_MS,estimatedHostNow:t+s.offset,uncertaintyMs:uncertainty,sampleAgeMs:t-s.at,status:uncertainty>CLOCK_MAX_UNCERTAINTY_MS?'imprecise-clock':'estimated-clock'};
 }
 return{probe,accept,estimate};
}
