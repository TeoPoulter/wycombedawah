import assert from 'node:assert/strict';
import {createListeningSync,mergeHistory,OUTBOX} from './cloud-listening.mjs';
const original=setTimeout;globalThis.setTimeout=()=>0;
let cloud={history:[],state:null},online=true,writes=0,now=Date.now();
function device(seed=[],stored=new Map()){
 let history=seed,state={version:1,draft:[1],view:'chooser',playback:null},admin=true,restores=0,status='';
 const api=async(action,input)=>{if(!online)throw Error('offline');if(action==='listening')return structuredClone(cloud);writes++;cloud.history=mergeHistory(cloud.history,input.history);if(input.state&&(!cloud.state||input.state.updatedAt>cloud.state.updatedAt))cloud.state=structuredClone(input.state);return {ok:true}};
 const sync=createListeningSync({storage:()=>({getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}),api,isAdmin:()=>admin,getHistory:()=>history,setHistory:h=>history=h,getState:()=>state,restoreState:s=>{state=s;restores++;return true},onStatus:s=>status=s});
 return {sync,stored,get history(){return history},get state(){return state},get restores(){return restores},get status(){return status},setState:s=>state=s,setHistory:h=>history=h,logout(){admin=false;sync.disconnect()}};
}
try{
 const visit={key:'a-visit',id:'abcdefghijk',at:now-10000,position:12,mode:'juz',ajza:[1],ended:false};const a=device([visit]);await a.sync.connect();assert.equal(cloud.history.length,1);
 const b=device();await b.sync.connect();assert.equal(b.history[0].position,12);assert.equal(b.restores,1);const before=writes;b.sync.capture();await b.sync.flush();assert.equal(writes,before,'idle device must not publish unchanged state');
 online=false;const updated=a.sync.record({...a.history[0],position:76});a.setHistory([updated]);a.setState({...a.state,draft:[20,21]});a.sync.capture();await a.sync.flush();assert(a.stored.get(OUTBOX));assert.equal(cloud.history[0].position,12);
 online=true;const reloaded=device([],a.stored);await reloaded.sync.connect();assert.equal(cloud.history[0].position,76);assert.deepEqual(cloud.state.value.draft,[20,21]);await b.sync.refresh();assert.equal(b.history[0].position,76);assert.equal(b.restores,1,'background history refresh must not interrupt playback');
 b.logout();const prior=writes;b.sync.capture();await b.sync.flush();assert.equal(writes,prior,'signed-out device cannot sync');
 console.log('PASS two-device history merge, existing-history import, remote state restoration, idle-device protection, offline outbox/reload retry and logout');
}finally{globalThis.setTimeout=original}
