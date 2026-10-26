export const ADMIN_HISTORY='yasser:admin-history:v1',OUTBOX='yasser:admin-sync:v1';
export function mergeHistory(...lists){const records=new Map();for(const list of lists)for(const e of list||[]){if(!e||typeof e.key!=='string'||typeof e.id!=='string'||!Number.isFinite(e.at)||!Number.isFinite(e.position))continue;const old=records.get(e.key);if(!old||(e.updatedAt||e.at)>(old.updatedAt||old.at))records.set(e.key,e)}return [...records.values()].sort((a,b)=>b.at-a.at).slice(0,200)}
export function createListeningSync({storage,api,isAdmin,getHistory,setHistory,getState,restoreState,getActivity=()=>0,onStatus}){
 let ready=false,working=false,connecting=false,offline=false,dirty=new Map(),pending=null,last='',timer=null,lastStamp=0;
 const read=(key,fallback)=>{try{return JSON.parse(storage()?.getItem(key))||fallback}catch{return fallback}};
 const write=(key,value)=>{try{storage()?.setItem(key,JSON.stringify(value))}catch{}};
 function save(){write(OUTBOX,{history:[...dirty.values()].slice(-200),state:pending});write(ADMIN_HISTORY,getHistory())}
 function schedule(){clearTimeout(timer);timer=setTimeout(flush,1000)}
 function capture(){if(!isAdmin()||!ready&&!offline)return;const value=getState(),signature=JSON.stringify(value);if(signature===last)return;last=signature;lastStamp=Math.max(Date.now(),lastStamp+1);pending={value,updatedAt:lastStamp};save();schedule()}
 function record(entry){if(!isAdmin())return entry;const value={...entry,updatedAt:Math.max(Date.now(),(entry.updatedAt||0)+1)};dirty.set(value.key,value);if(dirty.size>200)dirty.delete(dirty.keys().next().value);save();schedule();return value}
 async function flush(){
  if(!isAdmin()||!ready||working||(!dirty.size&&!pending))return;working=true;const history=[...dirty.values()],state=pending;
  try{await api('sync-listening',{history,state});if(!isAdmin())return;for(const e of history)if(dirty.get(e.key)===e)dirty.delete(e.key);if(pending===state)pending=null;save();onStatus(dirty.size||pending?'Syncing across devices…':'Synced across devices')}
  catch{onStatus('Sync pending · changes saved on this device')}
  finally{working=false}
 }
 async function connect(){
  if(!isAdmin()||connecting)return;connecting=true;const activity=getActivity();ready=false;onStatus('Syncing across devices…');
  const outbox=read(OUTBOX,{});for(const e of mergeHistory(outbox.history||[],[...dirty.values()]))dirty.set(e.key,{...e,updatedAt:e.updatedAt||e.at});pending=pending||outbox.state||null;
  const local=mergeHistory(getHistory(),read(ADMIN_HISTORY,[]));setHistory(local);
  try{
   const remote=await api('listening');if(!isAdmin())return;const cloud=Array.isArray(remote.history)?remote.history:[];const known=new Map(cloud.map(e=>[e.key,e]));
   for(const e of local)if(!known.has(e.key)||(e.updatedAt||e.at)>(known.get(e.key).updatedAt||known.get(e.key).at))dirty.set(e.key,{...e,updatedAt:e.updatedAt||e.at});
   setHistory(mergeHistory(local,cloud,[...dirty.values()]));
   if(remote.state&&(!pending||remote.state.updatedAt>=pending.updatedAt))pending=null;
   const latest=pending||remote.state;const restored=latest?restoreState(latest.value,activity):false;
   ready=true;offline=false;last=restored?JSON.stringify(getState()):'';if(!restored){const state=getState();if(state.playback||state.draft.length)capture()}
   save();onStatus('Synced across devices');await flush();
  }catch{offline=true;save();onStatus('Sync pending · changes saved on this device')}
  finally{connecting=false}
 }
 async function refresh(){if(!isAdmin())return;if(!ready)return connect();await flush();try{const remote=await api('listening');if(!isAdmin())return;const merged=mergeHistory(getHistory(),remote.history,[...dirty.values()]);if(JSON.stringify(merged)!==JSON.stringify(getHistory()))setHistory(merged);save();if(!dirty.size&&!pending)onStatus('Synced across devices')}catch{onStatus('Sync pending · changes saved on this device')}}
 function disconnect(){ready=false;offline=false;clearTimeout(timer);dirty=new Map();pending=null;last='';onStatus('History is saved on this device.')}
 return {connect,refresh,flush,capture,record,disconnect};
}
