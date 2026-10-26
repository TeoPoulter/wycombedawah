import {Queue} from './queue.mjs';
import {selectedPool} from './selection.mjs?v=20261026-curation-v11';
export const SESSION_KEY='yasser-archives:session:v1';
const numbers=value=>[...new Set((Array.isArray(value)?value:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=30))].sort((a,b)=>a-b);
export function readSession(storage,catalog){
 try{
  const value=JSON.parse(storage.getItem(SESSION_KEY));if(!value||value.version!==1)return null;
  const draft=numbers(value.draft),saved=value.playback;
  const result={draft,view:'chooser',playback:null};
  if(!saved||!['juz','playlist'].includes(saved.mode))return result;
  const ajza=numbers(saved.ajza),ids=saved.mode==='playlist'?catalog.playlist.ids:selectedPool(catalog,ajza),allowed=new Set(ids);
  if(!allowed.has(saved.currentId)||!catalog.videos[saved.currentId])return result;
  const history=Array.isArray(saved.history)?saved.history.slice(0,300):[];
  const oldIndex=Number.isInteger(saved.index)&&saved.index>=0&&saved.index<history.length?saved.index:-1;
  const prior=oldIndex<0?[]:history.slice(0,oldIndex).filter(id=>allowed.has(id));
  const after=oldIndex<0?[]:history.slice(oldIndex+1).filter(id=>allowed.has(id));
  const restoredHistory=[...prior,saved.currentId,...after];
  const bag=[...new Set((Array.isArray(saved.bag)?saved.bag:[]).filter(id=>allowed.has(id)))];
  const duration=Number(catalog.videos[saved.currentId].duration)||0;
  const position=typeof saved.position==='number'&&Number.isFinite(saved.position)?Math.max(0,Math.min(saved.position,duration?Math.max(0,duration-.25):86400)):0;
  result.playback={mode:saved.mode,ajza,currentId:saved.currentId,position,repeat:saved.repeat==='one'?'one':'all',history:restoredHistory,index:prior.length,bag};
  result.view=value.view==='player'?'player':'chooser';return result;
 }catch{return null}
}
export function queueFromSession(ids,saved,random=Math.random){
 const queue=new Queue(ids,random);queue.history=saved.history.slice();queue.index=saved.index;queue.bag=saved.bag.slice();queue.started=true;queue.repeat=saved.repeat;return queue;
}
export function saveSession(storage,{draft,view,mode,ajza,queue,position}){
 try{
  let playback=null;
  if(queue?.current){
   const offset=Math.max(0,queue.index-199),history=queue.history.slice(offset,queue.index+51);
   playback={mode:mode==='playlist'?'playlist':'juz',ajza:numbers(ajza),currentId:queue.current,position:Number.isFinite(position)?Math.max(0,position):0,repeat:queue.repeat==='one'?'one':'all',history,index:queue.index-offset,bag:queue.bag};
  }
  storage.setItem(SESSION_KEY,JSON.stringify({version:1,updatedAt:Date.now(),draft:numbers([...draft]),view:view==='player'?'player':'chooser',playback}));return true;
 }catch{return false}
}
