import {Queue} from './queue.mjs';
import {selectedPool,selectionLabel} from './selection.mjs?v=20261018-classic-multi-v3';
const chosenAjza=new Set();
const $=id=>document.getElementById(id);
let data,queue,player,ready=false,apiPromise,selected,failures=0,playing=false,dragging=false,loadTimer;
const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
const status=message=>$('status').textContent=message;
function api(){if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;apiPromise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('YouTube did not respond. Open the recording on YouTube, or try again.')),15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);reject(Error('YouTube could not load. Check your connection and try again.'))};document.head.append(script)}).catch(e=>{apiPromise=null;throw e});return apiPromise}
function controls(){const enabled=ready&&Boolean(selected);for(const id of ['play','back','forward','next'])$(id).disabled=!enabled;$('previous').disabled=!enabled||queue.index<=0;$('seek').disabled=!enabled;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause recording':'Play recording')}
function track(id){if(!id){status('No more recordings are available in this selection. Choose another juz.');return}selected=id;const v=data.videos[id];$('recording-year').textContent=v.prayer?.hijriYear?`${v.prayer.hijriYear} AH`:'YOUTUBE';$('track-title').textContent=v.title;$('channel').textContent=v.channel;$('watch').href=`https://www.youtube.com/watch?v=${id}`;$('duration').textContent=time(v.duration);$('elapsed').textContent='0:00';$('seek').value=0;playing=false;controls();status('Loading recording…');clearTimeout(loadTimer);loadTimer=setTimeout(()=>status('Tap Play in the video if playback has not started. You can also open it on YouTube.'),16000);if(ready)player.loadVideoById(id)}
async function choose(ids,label){queue=new Queue(ids);failures=0;$('repeat').querySelector('span').textContent='Repeat all';$('selection-label').textContent=label;$('choose-title').textContent=`Change selection · ${label}`;$('chooser').open=false;$('listening').hidden=false;document.body.classList.add('active');track(queue.next());$('listening').scrollIntoView({block:'start',behavior:'instant'});try{await api();if(ready){controls();return}if(player){return}const iframe=document.createElement('iframe');iframe.id='player';iframe.title='YouTube recitation player';iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=`https://www.youtube-nocookie.com/embed/${selected}?enablejsapi=1&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(location.origin)}`;$('player').replaceWith(iframe);player=new YT.Player(iframe,{events:{onReady:()=>{ready=true;player.loadVideoById(selected);controls()},onStateChange:e=>{playing=e.data===1;controls();if(e.data===1){failures=0;clearTimeout(loadTimer);status('Playing')}if(e.data===2)status('Paused');if(e.data===3)status('Buffering…');if(e.data===0){if(queue.repeat==='one'){player.seekTo(0,true);player.playVideo()}else{const id=queue.next(false);if(id)track(id);else status('Selection complete. Tap Next to begin again.')}}},onAutoplayBlocked:()=>{clearTimeout(loadTimer);status('Tap Play to start the video. Your browser paused autoplay.');playing=false;controls()},onError:e=>{clearTimeout(loadTimer);playing=false;controls();if([100,101,150].includes(e.data)&&failures<5){queue.reject(selected);failures++;const id=queue.next();if(id){track(id);status('That video is unavailable here. Trying another…');return}}status(e.data===153?'YouTube could not verify this player. Use Open on YouTube.':'This video cannot play here. Try Next, or open it on YouTube.')}}})}catch(e){status(e.message);controls()}}
$('play').onclick=()=>{if(!ready)return;if(playing)player.pauseVideo();else player.playVideo()};$('next').onclick=()=>{failures=0;track(queue.next())};$('previous').onclick=()=>track(queue.previous());
for(const [id,delta] of [['back',-10],['forward',10]])$(id).onclick=()=>{if(ready)player.seekTo(Math.max(0,Math.min(player.getDuration(),player.getCurrentTime()+delta)),true)};
$('repeat').onclick=()=>{queue.repeat=({all:'one',one:'off',off:'all'})[queue.repeat];$('repeat').querySelector('span').textContent=`Repeat ${queue.repeat}`};
$('seek').addEventListener('input',()=>{dragging=true;$('elapsed').textContent=time(Number($('seek').value))});$('seek').addEventListener('change',()=>{if(ready)player.seekTo(Number($('seek').value),true);dragging=false});
setInterval(()=>{if(!ready||dragging)return;const duration=player.getDuration(),current=player.getCurrentTime();if(duration>0){$('seek').max=duration;$('seek').value=current;$('elapsed').textContent=time(current);$('duration').textContent=time(duration)}},500);
controls();
fetch('catalog.json?v=20261018-classic-multi-v3').then(r=>{if(!r.ok)throw Error('Could not load the archive. Please refresh to try again.');return r.json()}).then(c=>{
 data=c;
 for(const j of c.juz){
  const b=document.createElement('button');b.className='juz';b.type='button';b.dataset.juz=j.number;
  b.setAttribute('aria-label',`Juz ${j.number}, ${j.ids.length} recordings`);b.setAttribute('aria-pressed','false');
  b.innerHTML=`<small>JUZ</small><strong>${j.number}</strong><small class="count">${j.ids.length} recordings</small><span class="selection-check" aria-hidden="true">✓</span>`;
  b.onclick=()=>{chosenAjza.has(j.number)?chosenAjza.delete(j.number):chosenAjza.add(j.number);updateSelection()};
  $('juz-grid').append(b);
 }
 $('select-all').onclick=()=>{c.juz.forEach(j=>chosenAjza.add(j.number));updateSelection()};
 $('clear-selection').onclick=()=>{chosenAjza.clear();updateSelection()};
 $('play-selection').onclick=()=>{const ids=selectedPool(data,chosenAjza);if(ids.length)choose(ids,selectionLabel(chosenAjza))};
 $('random').disabled=false;$('playlist-count').textContent=`${c.playlist.ids.length} videos · From your playlist`;
 $('random').onclick=()=>choose(c.playlist.ids,'Your playlist');
 updateSelection();
}).catch(e=>{$('load-error').hidden=false;$('load-error').textContent=e.message});
function updateSelection(){
 document.querySelectorAll('.juz').forEach(b=>b.setAttribute('aria-pressed',String(chosenAjza.has(Number(b.dataset.juz)))));
 const ids=selectedPool(data,chosenAjza);$('selected-count').textContent=`${chosenAjza.size} selected`;
 $('play-selection').disabled=!ids.length;$('selection-total').textContent=ids.length?`${ids.length} recordings`:'Choose ajza';
 $('clear-selection').disabled=!chosenAjza.size;$('select-all').disabled=chosenAjza.size===data.juz.length;
}
