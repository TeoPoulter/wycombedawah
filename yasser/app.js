import {embedUrl,watchUrl,playbackError} from './embed.mjs?v=20261024-full-mushaf-v9';
import {Queue} from './queue.mjs';
import {selectedPool,selectionLabel} from './selection.mjs?v=20261024-full-mushaf-v9';
import {readSession,saveSession,queueFromSession} from './session.mjs?v=20261024-full-mushaf-v9';
import {audioPlayer} from './audio-player.mjs?v=20261024-full-mushaf-v9';
const $=id=>document.getElementById(id),chosenAjza=new Set();
let data,queue,player,provider,selected,ready=false,playing=false,apiPromise,failures=0,generation=0,loadTimer;
let clock=0,clockAt=performance.now(),length=0,lastSample=0,dragging=false,waitingToResume=false;
let view='chooser',mode='juz',playbackAjza=[],storageReady=false;
const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#i-${name}"/></svg>`;
const status=message=>$('status').textContent=message;
const storage=()=>{try{return localStorage}catch{return null}};
const providerFor=id=>data.videos[id].provider==='audio'?'audio':'youtube';
function sourceLink(){return providerFor(selected)==='audio'?data.videos[selected].sourceUrl:watchUrl(selected,clock)}
function persist(){if(storageReady)saveSession(storage(),{draft:chosenAjza,view,mode,ajza:playbackAjza,queue,position:clock})}

const splash=$('splash');
let introOpen=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function closeIntro(){
 if(!introOpen)return;introOpen=false;splash.classList.add('closing');
 document.querySelector('header').inert=false;document.querySelector('main').inert=false;
 if(document.activeElement===$('skip-intro'))$('home').focus({preventScroll:true});
 setTimeout(()=>splash.hidden=true,1000);
}
if(introOpen){splash.hidden=false;document.querySelector('header').inert=true;document.querySelector('main').inert=true;setTimeout(closeIntro,2800)}
$('skip-intro').onclick=closeIntro;splash.addEventListener('click',closeIntro);
document.addEventListener('keydown',event=>{if(introOpen&&['Escape',' ','Enter'].includes(event.key)){event.preventDefault();closeIntro()}});
function heading(personal=false){
 document.body.classList.toggle('playlist',personal);$('arabic-name').hidden=personal;
 $('page-title').innerHTML=personal?'Teo’s Playlist<span>.</span>':'Yasser Archives<span>.</span>';
 $('brand-name').innerHTML=personal?'TEO’S<span class="word">PLAYLIST</span>':'YASSER<span class="word">ARCHIVES</span>';
 document.title=personal?'Teo’s Playlist':'Yasser Archives';
}
function showChooser(){
 if(ready){sample();player.pauseVideo()}clearTimeout(loadTimer);view='chooser';
 $('chooser').hidden=false;$('listening').hidden=true;document.body.classList.remove('active');heading();persist();
 $('select-all').focus({preventScroll:true});
}
$('home').onclick=showChooser;$('change-selection').onclick=showChooser;
function api(){
 if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('YouTube did not respond. Retry, or open the recording.')),15000);
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve()};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
  script.onerror=()=>{clearTimeout(timer);reject(Error('YouTube could not load. Retry, or open the recording.'))};document.head.append(script);
 }).catch(error=>{apiPromise=null;throw error});return apiPromise;
}
function controls(){
 const enabled=ready&&Boolean(selected);
 for(const id of ['play','back','forward','next'])$(id).disabled=!enabled;
 $('previous').disabled=!enabled||queue.index<=0;$('seek').disabled=!enabled;
 $('play').innerHTML=icon(playing?'pause':'play');$('play').setAttribute('aria-label',playing?'Pause recording':'Play recording');
}
function clearRecovery(){document.body.classList.remove('has-player-error');$('playback-recovery').hidden=true;status('')}
function recover(message){
 playing=false;clearTimeout(loadTimer);controls();$('recovery-message').textContent=message;
 $('open-recording').href=sourceLink();$('playback-recovery').hidden=false;document.body.classList.add('has-player-error');status('');persist();
}
function armLoadTimer(){
 clearTimeout(loadTimer);loadTimer=setTimeout(()=>{
  if(!playing&&view==='player'&&!waitingToResume)recover('Playback has not started. Retry, or open the original recording.');
 },18000);
}
function paintSeek(current){
 $('seek').value=current;$('seek').style.setProperty('--progress',`${length?Math.min(100,current/length*100):0}%`);
 $('elapsed').textContent=time(current);$('seek').setAttribute('aria-valuetext',`${time(current)} of ${length?time(length):'unknown duration'}`);
}
function sample(){
 if(!ready||document.body.classList.contains('has-player-error'))return;
 const duration=player.getDuration();if(duration>0){length=duration;$('seek').max=duration;$('duration').textContent=time(duration)}
 if(!waitingToResume){clock=player.getCurrentTime()||0;clockAt=performance.now()}
}
function track(id,start=0,paused=false){
 if(!id){recover('No more recordings are available in this selection. Choose another juz.');return}
 clearRecovery();selected=id;clock=Math.max(0,start);clockAt=performance.now();lastSample=clockAt+600;
 waitingToResume=paused;length=data.videos[id].duration||0;playing=false;
 const recording=data.videos[id];$('recording-year').textContent=recording.prayer?.hijriYear?`${recording.prayer.hijriYear} AH`:'';
 $('track-title').textContent=recording.title;$('channel').textContent=recording.channel;
 $('watch').href=sourceLink();$('open-recording').href=sourceLink();$('open-recording').textContent=providerFor(id)==='audio'?'Open original':'Open on YouTube';
 $('duration').textContent=length?time(length):'—:—';$('seek').max=length||Math.max(100,clock);paintSeek(clock);
 clearTimeout(loadTimer);if(!paused)armLoadTimer();
 if(player&&ready&&provider===providerFor(id)){
  if(paused)player.cueVideoById(id,clock);else player.loadVideoById(id,clock);
 }else mountPlayer(clock,!paused).catch(error=>recover(error.message));
 controls();persist();
}
function stateChanged(state,token){
 if(token!==generation)return;playing=state===1;controls();
 if(playing){waitingToResume=false;failures=0;clearTimeout(loadTimer);clearRecovery();sample();persist()}
 if(state===2){clearTimeout(loadTimer);sample();persist()}
 if(state===0){
  if(queue.repeat==='one'){player.seekTo(0,true);player.playVideo()}
  else track(queue.next(false));
 }
}
async function mountPlayer(start=0,autoplay=true){
 const token=++generation;ready=false;playing=false;controls();
 if(player){player.destroy();player=null}
 const video=document.querySelector('.video');provider=providerFor(selected);
 if(provider==='audio'){
  const card=document.createElement('div');card.id='player';card.className='audio-art';
  const logo=document.createElement('img');logo.src='logo.png';logo.alt='';logo.width=160;logo.height=160;
  const label=document.createElement('p');label.textContent='Audio recording';
  const audio=document.createElement('audio');audio.preload='metadata';audio.hidden=true;
  card.append(logo,label,audio);video.replaceChildren(card);
  player=audioPlayer(audio,id=>data.videos[id],state=>stateChanged(state,token),()=>{
   if(token===generation)recover('This audio could not load. Retry, or open the original recording.');
  });
  ready=true;if(autoplay&&view==='player')player.loadVideoById(selected,start);else player.cueVideoById(selected,start);
  controls();return;
 }
 const slot=document.createElement('div');slot.id='player';video.replaceChildren(slot);
 await api();if(token!==generation)return;
 const iframe=document.createElement('iframe');iframe.id='player';iframe.title='YouTube recitation player';
 iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;
 iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=embedUrl(selected,location.origin,start);slot.replaceWith(iframe);
 player=new YT.Player(iframe,{events:{
  onReady:event=>{
   if(token!==generation)return;ready=true;
   if((!autoplay&&waitingToResume)||view==='chooser')event.target.cueVideoById(selected,clock);
   else event.target.loadVideoById(selected,start);
   controls();
  },
  onStateChange:event=>stateChanged(event.data,token),
  onAutoplayBlocked:()=>{if(token===generation){clearTimeout(loadTimer);playing=false;controls();persist()}},
  onError:event=>{
   if(token!==generation)return;playing=false;controls();const result=playbackError(event.data,failures);
   if(result.advance){queue.reject(selected);failures++;const id=queue.next();if(id){track(id);return}}
   recover(result.message);
  }
 }});
}
function choose(ids,label,personal=false,saved=null){
 mode=personal?'playlist':'juz';playbackAjza=personal?[]:saved?saved.ajza:[...chosenAjza].sort((a,b)=>a-b);
 queue=saved?queueFromSession(ids,saved):new Queue(ids);failures=0;view='player';heading(personal);
 $('repeat').setAttribute('aria-pressed',String(queue.repeat==='one'));$('selection-label').textContent=label;
 $('chooser').hidden=true;$('listening').hidden=false;document.body.classList.add('active');
 track(saved?saved.currentId:queue.next(),saved?saved.position:0,Boolean(saved));
 if(!saved)$('change-selection').focus({preventScroll:true});
}
$('retry-playback').onclick=()=>{if(selected){clearRecovery();waitingToResume=false;armLoadTimer();mountPlayer(clock,true).catch(error=>recover(error.message))}};
$('recovery-next').onclick=()=>{failures=0;track(queue.next())};
$('play').onclick=()=>{
 if(!ready)return;
 if(playing)player.pauseVideo();else if(waitingToResume){armLoadTimer();player.loadVideoById(selected,clock)}else{armLoadTimer();player.playVideo()}
};
$('next').onclick=()=>{failures=0;track(queue.next())};$('previous').onclick=()=>track(queue.previous());
function seekTo(position){
 if(!ready)return;clock=Math.max(0,Math.min(length||86400,position));clockAt=performance.now();lastSample=clockAt+500;
 player.seekTo(clock,true);paintSeek(clock);persist();
}
for(const [id,delta] of [['back',-10],['forward',10]])$(id).onclick=()=>seekTo((waitingToResume?clock:player.getCurrentTime())+delta);
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||introOpen||!ready||!selected||view!=='player'||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(event.target.closest('input:not([type="range"]),textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
 if(![' ','ArrowRight','ArrowLeft'].includes(event.key))return;
 event.preventDefault();if(event.repeat)return;
 if(event.key===' ')$('play').click();else $(event.key==='ArrowRight'?'forward':'back').click();
});
$('repeat').onclick=()=>{if(queue){queue.repeat=queue.repeat==='one'?'all':'one';$('repeat').setAttribute('aria-pressed',String(queue.repeat==='one'));persist()}};
function commitSeek(){if(dragging){const position=Number($('seek').value);dragging=false;seekTo(position)}}
$('seek').addEventListener('pointerdown',()=>dragging=true);
$('seek').addEventListener('input',()=>{dragging=true;paintSeek(Number($('seek').value))});
for(const event of ['change','pointerup','blur'])$('seek').addEventListener(event,commitSeek);
$('seek').addEventListener('pointercancel',()=>{dragging=false;sample()});
$('seek').addEventListener('keydown',event=>{
 const moves={ArrowRight:10,ArrowUp:10,ArrowLeft:-10,ArrowDown:-10};
 if(!(event.key in moves)&&!['Home','End'].includes(event.key))return;
 event.preventDefault();seekTo(event.key==='Home'?0:event.key==='End'?length:Number($('seek').value)+moves[event.key]);
});
function animateSeek(now){
 if(ready&&!dragging&&!document.body.classList.contains('has-player-error')){
  if(now-lastSample>=400){sample();lastSample=now}
  paintSeek(Math.min(length||86400,clock+(playing?(now-clockAt)/1000:0)));
 }requestAnimationFrame(animateSeek);
}
requestAnimationFrame(animateSeek);
setInterval(()=>{if(view==='player'){sample();persist()}},4000);
document.addEventListener('visibilitychange',()=>{sample();persist()});window.addEventListener('pagehide',()=>{sample();persist()});
controls();
fetch('catalog.json?v=20261024-full-mushaf-v9').then(response=>{
 if(!response.ok)throw Error('Could not load the archive. Please refresh to try again.');return response.json();
}).then(catalog=>{
 data=catalog;const session=readSession(storage(),data);
 for(const number of session?.draft||[])chosenAjza.add(number);
 for(const juz of data.juz){
  const button=document.createElement('button');button.className='juz';button.type='button';button.dataset.juz=juz.number;
  button.setAttribute('aria-label',`Juz ${juz.number}, ${juz.ids.length} recordings`);button.setAttribute('aria-pressed','false');
  button.innerHTML=`<small>JUZ</small><strong>${juz.number}</strong><small class="count">${juz.ids.length} recordings</small><span class="selection-check" aria-hidden="true">${icon('check')}</span>`;
  button.onclick=()=>{chosenAjza.has(juz.number)?chosenAjza.delete(juz.number):chosenAjza.add(juz.number);updateSelection();persist()};$('juz-grid').append(button);
 }
 $('select-all').onclick=()=>{data.juz.forEach(juz=>chosenAjza.add(juz.number));updateSelection();persist()};
 $('clear-selection').onclick=()=>{chosenAjza.clear();updateSelection();persist()};
 $('play-selection').onclick=()=>{const ids=selectedPool(data,chosenAjza);if(ids.length)choose(ids,selectionLabel(chosenAjza))};
 $('random').disabled=false;$('playlist-count').textContent='Teo’s Playlist';$('random').onclick=()=>choose(data.playlist.ids,'Teo’s Playlist',true);
 updateSelection();storageReady=true;
 if(session?.playback){
  const saved=session.playback,ids=saved.mode==='playlist'?data.playlist.ids:selectedPool(data,saved.ajza);
  if(session.view==='player')choose(ids,saved.mode==='playlist'?'Teo’s Playlist':selectionLabel(saved.ajza),saved.mode==='playlist',saved);
  else{queue=queueFromSession(ids,saved);selected=saved.currentId;clock=saved.position;mode=saved.mode;playbackAjza=saved.ajza}
 }
}).catch(error=>{$('load-error').hidden=false;$('load-error').textContent=error.message});
function updateSelection(){
 document.querySelectorAll('.juz').forEach(button=>button.setAttribute('aria-pressed',String(chosenAjza.has(Number(button.dataset.juz)))));
 const ids=selectedPool(data,chosenAjza);$('selected-count').textContent=chosenAjza.size?`${chosenAjza.size} selected`:'Choose your ajza';
 $('play-selection').disabled=!ids.length;$('selection-action').classList.toggle('visible',Boolean(ids.length));
 $('selection-action').inert=!ids.length;$('selection-action').setAttribute('aria-hidden',String(!ids.length));
 $('selection-total').textContent=ids.length?`${ids.length} recordings`:'';
 $('clear-selection').disabled=!chosenAjza.size;$('select-all').disabled=chosenAjza.size===data.juz.length;
}
