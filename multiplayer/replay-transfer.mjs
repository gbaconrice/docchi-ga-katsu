/** Bounded, paced replay broadcast. FNV checksum is corruption detection, NOT authentication. */
export const RAW_CHUNK_BYTES=6000, MAX_REPLAY_BYTES=2*1024*1024, TRANSFER_TIMEOUT_MS=120000;
const utf8=new TextEncoder();
export function digest(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return `fnv1a32-${(h>>>0).toString(16).padStart(8,'0')}`;}
function base64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function unbase64(s){if(typeof s!=='string'||s.length>8000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw new Error('invalid-chunk');return Uint8Array.from(atob(s),x=>x.charCodeAt(0));}
export function packReplay(replay,battleId){const bytes=utf8.encode(JSON.stringify(replay));if(bytes.length>MAX_REPLAY_BYTES)throw new RangeError('replay-buffer-cap');const chunks=[];for(let i=0;i<bytes.length;i+=RAW_CHUNK_BYTES)chunks.push(base64(bytes.slice(i,i+RAW_CHUNK_BYTES)));return{meta:{battleId,digest:digest(bytes),totalBytes:bytes.length,totalChunks:chunks.length},chunks};}
export function validMeta(m){return m&&typeof m.battleId==='string'&&m.battleId.length<=128&&/^fnv1a32-[0-9a-f]{8}$/.test(m.digest)&&Number.isSafeInteger(m.totalBytes)&&m.totalBytes>0&&m.totalBytes<=MAX_REPLAY_BYTES&&m.totalChunks===Math.ceil(m.totalBytes/RAW_CHUNK_BYTES);}
export function createReceiver({meta,sendAck,onComplete}){
 if(!validMeta(meta))throw new Error('invalid-replay-meta');const chunks=new Map();let complete=null;
 return{receive(m){if(m.battleId!==meta.battleId||m.digest!==meta.digest||!Number.isSafeInteger(m.index)||m.index<0||m.index>=meta.totalChunks)return false;
 let data;try{data=unbase64(m.data);}catch{return false;}const size=m.index===meta.totalChunks-1?meta.totalBytes-m.index*RAW_CHUNK_BYTES:RAW_CHUNK_BYTES;if(data.length!==size||digest(data)!==m.chunkDigest)return false;
 const old=chunks.get(m.index);if(old&&base64(old)!==m.data)return false;chunks.set(m.index,data);
 if(chunks.size===meta.totalChunks&&!complete){const all=new Uint8Array(meta.totalBytes);for(let i=0;i<meta.totalChunks;i++)all.set(chunks.get(i),i*RAW_CHUNK_BYTES);if(digest(all)!==meta.digest)return false;
 try{complete=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{return false;}onComplete(complete);}
 sendAck({battleId:meta.battleId,digest:meta.digest,index:m.index});return true;},getReplay:()=>complete};
}
export function createSender({packed,recipients,send,now=Date.now,intervalMs=100,retryMs=1000}){
 const ack=new Map(recipients.map(id=>[id,new Set()])),lastSent=new Map();const start=now();let lastPump=-Infinity,cursor=0;
 return{ack(sender,m){if(m.battleId!==packed.meta.battleId||m.digest!==packed.meta.digest||!ack.has(sender)||!Number.isSafeInteger(m.index)||m.index<0||m.index>=packed.chunks.length)return false;ack.get(sender).add(m.index);return true;},
 addRecipient(id){ack.set(id,new Set());},
 ready(ids=[...ack.keys()]){return ids.every(id=>ack.get(id)?.size===packed.chunks.length);},
 expired(){return now()-start>=TRANSFER_TIMEOUT_MS;},
 pump(){if(now()-lastPump<intervalMs)return false;for(let k=0;k<packed.chunks.length;k++){const index=(cursor+k)%packed.chunks.length;if([...ack.values()].every(s=>s.has(index)))continue;if(now()-(lastSent.get(index)??-Infinity)<retryMs)continue;cursor=(index+1)%packed.chunks.length;lastSent.set(index,now());lastPump=now();send({type:'replay-chunk',...packed.meta,index,chunkDigest:digest(unbase64(packed.chunks[index])),data:packed.chunks[index]});return true;}return false;}
 };
}
