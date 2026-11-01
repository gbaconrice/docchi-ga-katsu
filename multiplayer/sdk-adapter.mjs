import {PROTOCOL,encode,decode,createSession} from './protocol.mjs';
/** No native call happens until install / create / join is explicitly called. */
const installedRooms=new WeakSet();
export async function install({sdk,nonce,sessionFactory=createSession,wait=ms=>new Promise(r=>setTimeout(r,ms)),discoveryMs=800,sessionOptions={}}) {
  if(typeof nonce!=='function')throw new TypeError('unique nonce factory required');
  if(installedRooms.has(sdk.room))throw new Error('adapter-already-installed');
  const profile=await sdk.user.getMyUserInfo();
  if(profile?.errno!==0||!profile.data?.user_id)throw new Error('profile-unavailable');
  const userId=String(profile.data.user_id);
  let session=null,roomId=null,hostId=null,sessionId=null,discovery=null,pending=false,nativeJoined=false;
  const send=async message=>{try{const r=await sdk.room.sendMessage({message});if(r?.errno!==undefined&&r.errno!==0)throw new Error('send-failed');return r;}catch(error){session?.close();return {errno:-1,error:String(error)};}};
  const control=body=>send(encode({protocol:PROTOCOL,version:1,roomId,...body}));
  const tickets=new Map();
  // Install once per adapter. SDK unsubscribe availability is not established.
  installedRooms.add(sdk.room);
  sdk.room.receiveMessage(payload=>{
    const d=payload?.data;if(!d||!roomId)return;
    if(d.room_id!==undefined&&String(d.room_id)!==roomId)return;
    const sender=String(d.user_id||'');
    if(payload.type==='aitools_game_exitroom'){
      // Never apply unscoped departure: it can be a delayed previous-room event.
      if(d.room_id!==undefined)session?.memberLeft(sender);return;
    }
    if(payload.type!=='aitools_game_sendmsg')return;
    const m=decode(d.msg_data);if(!m||m.roomId!==roomId||!sender)return;
    if(m.type==='discover'&&hostId===userId&&typeof m.nonce==='string'){
      if(tickets.size>=16&&!tickets.has(sender))return;
      const ticket=nonce();tickets.set(sender,{nonce:m.nonce,ticket});
      void control({type:'claim',nonce:m.nonce,ticket,sessionId});return;
    }
    if(m.type==='claim'&&discovery&&m.nonce===discovery.nonce&&discovery.roster.has(sender)){
      discovery.claims.set(sender,m);
      if(hostId&&sender!==hostId)session?.close();return;
    }
    if(m.type==='confirm'&&hostId===userId){
      const t=tickets.get(sender);
      if(t&&m.ticket===t.ticket&&m.nonce===t.nonce&&m.sessionId===sessionId){
        tickets.delete(sender);session.receive(sender,encode({...m,type:'hello'}));
      }return;
    }
    // Unknown senders cannot use hello to bypass admission confirmation.
    if(m.type==='hello'&&hostId===userId&&!session?.getState().participants.includes(sender)&&!session?.getState().spectators.includes(sender))return;
    session?.receive(sender,d.msg_data);
  });
  async function enter(kind,id,permission=0){
    if(pending||nativeJoined)throw new Error('already-entered-or-pending');
    pending=true;
    try{
      const r=await (kind==='create'?sdk.room.create({max_players:8,room_permission:permission}):sdk.room.join({room_id:id}));
      if(r?.errno!==0)throw new Error('entry-failed');nativeJoined=true;
      roomId=String(r.data?.room_id||id||'');if(!roomId)throw new Error('room-id-missing');
      const roster=(r.data?.user_list||[]).map(x=>String(x.user_id));
      if(kind==='create'){hostId=userId;sessionId=nonce();}
      else{
        discovery={nonce:nonce(),roster:new Set(roster.filter(x=>x!==userId)),claims:new Map()};
        await control({type:'discover',nonce:discovery.nonce});await wait(discoveryMs);
        if(discovery.claims.size!==1)throw new Error('host-discovery-ambiguous-or-unavailable');
        [hostId]=discovery.claims.keys();sessionId=discovery.claims.get(hostId).sessionId;
      }
      session=sessionFactory({...sessionOptions,roomId,sessionId,userId,hostId,members:roster,send});
      if(kind==='join')await control({type:'confirm',sessionId,nonce:discovery.nonce,ticket:discovery.claims.get(hostId).ticket});
      session.hello();return session;
    }catch(error){
      // Preserve nativeJoined on failed cleanup: a later exit retry is required.
      if(nativeJoined){try{const r=await sdk.room.exit();if(r?.errno===0)nativeJoined=false;}catch{}}
      session?.close();session=null;throw error;
    }finally{pending=false;}
  }
  return Object.freeze({userId,
    create(permission=0){if(![0,1].includes(permission))throw new Error('invalid-permission');return enter('create',null,permission);},
    join(id){if(typeof id!=='string'||!id)throw new Error('invalid-room-id');return enter('join',id);},
    async exit(){if(pending)throw new Error('entry-pending');const r=await sdk.room.exit();if(r?.errno!==0)throw new Error('exit-failed');nativeJoined=false;session?.close();session=null;roomId=null;tickets.clear();discovery=null;},
    async list(){return sdk.room.getPublicRoomList();},
    getRoomId:()=>roomId,getSession:()=>session
  });
}
