import {readHistory,writeHistory,startVisit,updateVisit,recordingHeading,recordingDetail} from './listening-log.mjs?v=20261026-curation-v11';
const API='https://yasser-archive-curation.teopoulter.chatgpt.site/api/curation',TOKEN='yasser:admin:v1',CACHE='yasser:excluded:v1';
const $=id=>document.getElementById(id);
export function createLibrary({storage,getCatalog,getCurrent,onExclusions,onResume}){
 if(!$('library-dialog'))return null;
 let history=readHistory(storage()),visit=null,excluded=[],token=null,admin=false,busy=false,tab='history',lastUndo=null,opener=null,revision=0;
 const dialog=$('library-dialog'),list=$('library-list'),message=$('library-message');
 try{const saved=JSON.parse(storage()?.getItem(TOKEN));if(saved?.expires>Date.now())token=saved.token;const cached=JSON.parse(storage()?.getItem(CACHE));if(Array.isArray(cached))excluded=cached.filter(e=>typeof e?.id==='string')}catch{}
 const say=text=>message.textContent=text;
 async function api(action,body={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch(API,{method:action?'POST':'GET',mode:'cors',cache:'no-store',signal:controller.signal,headers:action?{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}:{},...(action?{body:JSON.stringify({action,...body})}:{})});const result=await response.json();if(!response.ok){if(response.status===401&&action!=='login'){token=null;admin=false;try{storage()?.removeItem(TOKEN)}catch{}paintAdmin()}throw Error(result.error||'Could not save. Please retry.')}return result}finally{clearTimeout(timer)}
 }
 function paintAdmin(){$('remove-recording').hidden=!admin;$('removed-tab').hidden=!admin;$('admin-signout').hidden=!admin;$('admin-signin').hidden=admin;$('admin-state').textContent=admin?'Admin':''}
 function apply(){try{storage()?.setItem(CACHE,JSON.stringify(excluded))}catch{}onExclusions(excluded.map(e=>e.id));render()}
 async function refresh(){const started=revision;try{const result=await api();if(started===revision&&Array.isArray(result.excluded)&&JSON.stringify(result.excluded)!==JSON.stringify(excluded)){excluded=result.excluded;apply()}}catch{if(dialog.open)say('Offline: showing the last saved library. Removals need a connection.')}}
 function button(label,fn,className){const b=document.createElement('button');b.type='button';b.textContent=label;if(className)b.className=className;b.onclick=fn;return b}
 function render(){
  if(!dialog.open)return;list.replaceChildren();$('history-tab').setAttribute('aria-pressed',String(tab==='history'));$('removed-tab').setAttribute('aria-pressed',String(tab==='removed'));$('admin-form').hidden=tab!=='signin';list.hidden=tab==='signin';if(tab==='signin')return;
  const catalog=getCatalog();if(!catalog)return;const items=tab==='removed'?excluded:history;let group='';
  for(const entry of items){const video=catalog.videos[entry.id];if(!video)continue;const isRemoved=excluded.some(e=>e.id===entry.id);const date=new Date(tab==='removed'?entry.removed_at:entry.at),now=new Date(),yesterday=new Date();yesterday.setDate(now.getDate()-1);const day=date.toDateString()===now.toDateString()?'Today':date.toDateString()===yesterday.toDateString()?'Yesterday':date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
   if(group!==day){group=day;const h=document.createElement('h3');h.textContent=day;list.append(h)}
   const row=document.createElement('article');row.className='history-row';const copy=document.createElement('div');copy.className='history-copy';const title=document.createElement('strong');title.textContent=recordingHeading(video)||video.title;const original=document.createElement('p');original.dir='auto';original.textContent=video.sourceTitle||video.title;const meta=document.createElement('small');meta.textContent=[recordingDetail(video),tab==='history'?date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'',tab==='history'?(entry.ended?'Finished':`${Math.floor(entry.position/60)}:${String(Math.floor(entry.position%60)).padStart(2,'0')}`):'Removed from everyone’s playback'].filter(Boolean).join(' · ');copy.append(title,original,meta);row.append(copy);
   const actions=document.createElement('div');actions.className='history-actions';
   if(tab==='history'&&!isRemoved)actions.append(button('Resume',()=>{close();onResume(entry)},'resume-recording'));
   if(admin)actions.append(button(isRemoved?'Restore':'Remove',()=>mutate(entry.id,!isRemoved),'row-manage'));
   else if(isRemoved){const label=document.createElement('small');label.textContent='Removed';actions.append(label)}
   row.append(actions);list.append(row);
  }
  if(!list.children.length){const empty=document.createElement('p');empty.className='library-empty';empty.textContent=tab==='history'?'Your listening history will appear here.':'No recordings removed.';list.append(empty)}
 }
 function open(next='history'){opener=document.activeElement;tab=next;say('');if(!dialog.open)dialog.showModal();render();refresh();if(tab==='signin')$('admin-password').focus()}
 function close(){dialog.close();opener?.focus?.({preventScroll:true})}
 async function mutate(id,remove){
  if(!admin||busy)return;busy=true;$('remove-recording').disabled=true;say('');
  try{await api(remove?'remove':'restore',{id});revision++;excluded=excluded.filter(e=>e.id!==id);if(remove)excluded.unshift({id,removed_at:Date.now()});apply();lastUndo=remove?id:null;$('library-toast-text').textContent=remove?'Recording removed':'Recording restored';$('undo-removal').hidden=!remove;$('library-toast').hidden=false;say(remove?'Removed from everyone’s playback.':'Restored to the archive.');}
  catch(error){say(error.message);$('library-toast-text').textContent=error.message;$('undo-removal').hidden=true;$('library-toast').hidden=false}
  finally{busy=false;$('remove-recording').disabled=false}
 }
 $('library-open').onclick=()=>open();$('library-close').onclick=close;dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}});dialog.addEventListener('close',()=>opener?.focus?.({preventScroll:true}));
 $('history-tab').onclick=()=>{tab='history';say('');render()};$('removed-tab').onclick=()=>{tab='removed';say('');render()};$('admin-signin').onclick=()=>{tab='signin';say('');render();$('admin-password').focus()};
 $('admin-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;$('admin-submit').disabled=true;say('');try{const result=await api('login',{password:$('admin-password').value});$('admin-password').value='';token=result.token;admin=true;let remembered=true;try{storage().setItem(TOKEN,JSON.stringify(result))}catch{remembered=false}paintAdmin();tab='history';render();say(remembered?'Signed in on this device.':'Signed in for this visit. This browser blocked saving your sign-in.')}catch(error){say(error.message)}finally{busy=false;$('admin-submit').disabled=false}};
 $('admin-signout').onclick=async()=>{try{await api('logout');token=null;admin=false;storage()?.removeItem(TOKEN);paintAdmin();tab='history';render();say('Signed out.')}catch(error){say(error.message)}};
 $('remove-recording').onclick=()=>{const current=getCurrent();if(current?.id)mutate(current.id,true)};$('undo-removal').onclick=()=>{if(lastUndo)mutate(lastUndo,false)};$('toast-close').onclick=()=>$('library-toast').hidden=true;
 paintAdmin();
 return {
  async init(){apply();await refresh();if(token)try{await api('session');admin=true;paintAdmin()}catch{}setInterval(()=>{if(!document.hidden)refresh()},45000)},
  newTrack(){visit=null},
  started(){const current=getCurrent();if(!current)return;if(!visit){history=startVisit(history,current);visit=history[0].key}this.progress(current.position);},
  progress(position,ended){if(!visit)return;history=updateVisit(history,visit,position,ended);writeHistory(storage(),history)},
  refresh,
 };
}
