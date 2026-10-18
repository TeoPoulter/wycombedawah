import {Queue} from './queue.mjs';
import {selectedPool,selectionLabel} from './selection.mjs?v=20261018-ihsan-v6';
const chosenAjza=new Set();
const $=id=>document.getElementById(id);
let data,queue,player,ready=false,apiPromise,selected,failures=0,playing=false,dragging=false,loadTimer;
const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
const status=message=>$('status').textContent=message;
const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#i-${name}"/></svg>`;
const splash=$('splash');
let introOpen=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function closeIntro(){if(!introOpen)return;introOpen=false;splash.classList.add('closing');document.querySelector('header').inert=false;document.querySelector('main').inert=false;if(document.activeElement===$('skip-intro'))$('home').focus({preventScroll:true});setTimeout(()=>splash.hidden=true,1000)}
if(introOpen){splash.hidden=false;document.querySelector('header').inert=true;document.querySelector('main').inert=true;setTimeout(closeIntro,2800)}
$('skip-intro').onclick=closeIntro;
splash.addEventListener('click',closeIntro);
document.addEventListener('keydown',event=>{if(introOpen&&['Escape',' ','Enter'].includes(event.key)){event.preventDefault();closeIntro()}});
function heading(personal=false){document.body.classList.toggle('playlist',personal);$('arabic-name').hidden=personal;$('page-title').innerHTML=personal?'Teo’s Playlist<span>.</span>':'Yasser Archives<span>.</span>';$('brand-name').innerHTML=personal?'TEO’S<span class="word">PLAYLIST</span>':'YASSER<span class="word">ARCHIVES</span>';document.title=personal?'Teo’s Playlist':'Yasser Archives'}
function showChooser(){if(ready)player.pauseVideo();$('chooser').hidden=false;$('listening').hidden=true;document.body.classList.remove('active');heading();$('select-all').focus({preventScroll:true})}
$('home').onclick=showChooser;$('change-selection').onclick=showChooser;

function api(){if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;apiPromise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('YouTube did not respond. Open the recording on YouTube, or try again.')),15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);reject(Error('YouTube could not load. Check your connection and try again.'))};document.head.append(script)}).catch(e=>{apiPromise=null;throw e});return apiPromise}
function controls(){const enabled=ready&&Boolean(selected);for(const id of ['play','back','forward','next'])$(id).disabled=!enabled;$('previous').disabled=!enabled||queue.index<=0;$('seek').disabled=!enabled;$('play').innerHTML=icon(playing?'pause':'play');$('play').setAttribute('aria-label',playing?'Pause recording':'Play recording')}
function track(id){if(!id){status('No more recordings are available in this selection. Choose another juz.');return}selected=id;clock=0;clockAt=performance.now();lastSample=clockAt+600;length=data.videos[id].duration||0;const v=data.videos[id];$('recording-year').textContent=v.prayer?.hijriYear?`${v.prayer.hijriYear} AH`:'';$('track-title').textContent=v.title;$('channel').textContent=v.channel;$('watch').href=`https://www.youtube.com/watch?v=${id}`;$('duration').textContent=time(v.duration);$('elapsed').textContent='0:00';$('seek').max=length||100;paintSeek(0);playing=false;controls();status('');clearTimeout(loadTimer);loadTimer=setTimeout(()=>status(''),16000);if(ready)player.loadVideoById(id)}
async function choose(ids,label,personal=false){heading(personal);queue=new Queue(ids);failures=0;$('repeat').setAttribute('aria-pressed','false');$('selection-label').textContent=label;$('chooser').hidden=true;$('listening').hidden=false;document.body.classList.add('active');track(queue.next());$('change-selection').focus({preventScroll:true});try{await api();if(ready){controls();return}if(player){return}const iframe=document.createElement('iframe');iframe.id='player';iframe.title='YouTube recitation player';iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=`https://www.youtube-nocookie.com/embed/${selected}?enablejsapi=1&playsinline=1&controls=0&disablekb=1&rel=0&origin=${encodeURIComponent(location.origin)}`;$('player').replaceWith(iframe);player=new YT.Player(iframe,{events:{onReady:()=>{ready=true;player.loadVideoById(selected);controls()},onStateChange:e=>{playing=e.data===1;controls();if(e.data===1){failures=0;clearTimeout(loadTimer);status('')}if(e.data===2)status('');if(e.data===3)status('');if(e.data===0){if(queue.repeat==='one'){player.seekTo(0,true);player.playVideo()}else{const id=queue.next(false);if(id)track(id);else status('Selection complete. Tap Next to begin again.')}}},onAutoplayBlocked:()=>{clearTimeout(loadTimer);status('');playing=false;controls()},onError:e=>{clearTimeout(loadTimer);playing=false;controls();if([100,101,150].includes(e.data)&&failures<5){queue.reject(selected);failures++;const id=queue.next();if(id){track(id);status('That video is unavailable here. Trying another…');return}}status(e.data===153?'YouTube could not verify this player. Use Open on YouTube.':'This video cannot play here. Try Next, or open it on YouTube.')}}})}catch(e){status(e.message);controls()}}
$('play').onclick=()=>{if(!ready)return;if(playing)player.pauseVideo();else player.playVideo()};$('next').onclick=()=>{failures=0;track(queue.next())};$('previous').onclick=()=>track(queue.previous());
for(const [id,delta] of [['back',-10],['forward',10]])$(id).onclick=()=>{if(ready)player.seekTo(Math.max(0,Math.min(player.getDuration(),player.getCurrentTime()+delta)),true)};
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||introOpen||!ready||!selected||$('listening').hidden||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(event.target.closest('input:not([type="range"]),textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
 if(![' ','ArrowRight','ArrowLeft'].includes(event.key))return;
 event.preventDefault();if(event.repeat)return;
 if(event.key===' ')$('play').click();else $(event.key==='ArrowRight'?'forward':'back').click();
});
$('repeat').onclick=()=>{if(!queue)return;queue.repeat=queue.repeat==='one'?'all':'one';$('repeat').setAttribute('aria-pressed',String(queue.repeat==='one'))};
// Sample the iframe clock, then interpolate between samples for a fluid seek bar.
let clock=0,clockAt=performance.now(),length=0,lastSample=0;
function paintSeek(current){$('seek').value=current;$('seek').style.setProperty('--progress',`${length?Math.min(100,current/length*100):0}%`);$('elapsed').textContent=time(current);$('seek').setAttribute('aria-valuetext',`${time(current)} of ${time(length)}`)}
function sample(){if(!ready)return;const n=player.getDuration();if(n>0){length=n;$('seek').max=n;$('duration').textContent=time(n)}clock=player.getCurrentTime()||0;clockAt=performance.now()}
function commitSeek(){if(!dragging)return;const n=Number($('seek').value);dragging=false;if(ready){player.seekTo(n,true);clock=n;clockAt=performance.now();lastSample=clockAt+500}}
$('seek').addEventListener('pointerdown',()=>dragging=true);
$('seek').addEventListener('input',()=>{dragging=true;paintSeek(Number($('seek').value))});
$('seek').addEventListener('change',commitSeek);
$('seek').addEventListener('pointerup',commitSeek);
$('seek').addEventListener('pointercancel',()=>{dragging=false;sample()});
$('seek').addEventListener('blur',commitSeek);
$('seek').addEventListener('keydown',event=>{const moves={ArrowRight:10,ArrowUp:10,ArrowLeft:-10,ArrowDown:-10};if(!(event.key in moves)&&!['Home','End'].includes(event.key))return;event.preventDefault();dragging=true;paintSeek(event.key==='Home'?0:event.key==='End'?length:Math.max(0,Math.min(length,Number($('seek').value)+moves[event.key])));commitSeek()});
function animateSeek(now){if(ready&&!dragging){if(now-lastSample>=400){sample();lastSample=now}paintSeek(Math.min(length,clock+(playing?(now-clockAt)/1000:0)))}requestAnimationFrame(animateSeek)}
requestAnimationFrame(animateSeek);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sample()});
controls();
fetch('catalog.json?v=20261018-ihsan-v6').then(r=>{if(!r.ok)throw Error('Could not load the archive. Please refresh to try again.');return r.json()}).then(c=>{
 data=c;
 for(const j of c.juz){
  const b=document.createElement('button');b.className='juz';b.type='button';b.dataset.juz=j.number;
  b.setAttribute('aria-label',`Juz ${j.number}, ${j.ids.length} recordings`);b.setAttribute('aria-pressed','false');
  b.innerHTML=`<small>JUZ</small><strong>${j.number}</strong><small class="count">${j.ids.length} recordings</small><span class="selection-check" aria-hidden="true">${icon('check')}</span>`;
  b.onclick=()=>{chosenAjza.has(j.number)?chosenAjza.delete(j.number):chosenAjza.add(j.number);updateSelection()};
  $('juz-grid').append(b);
 }
 $('select-all').onclick=()=>{c.juz.forEach(j=>chosenAjza.add(j.number));updateSelection()};
 $('clear-selection').onclick=()=>{chosenAjza.clear();updateSelection()};
 $('play-selection').onclick=()=>{const ids=selectedPool(data,chosenAjza);if(ids.length)choose(ids,selectionLabel(chosenAjza))};
 $('random').disabled=false;$('playlist-count').textContent='Teo’s Playlist';
 $('random').onclick=()=>choose(c.playlist.ids,'Teo’s Playlist',true);
 updateSelection();
}).catch(e=>{$('load-error').hidden=false;$('load-error').textContent=e.message});
function updateSelection(){
 document.querySelectorAll('.juz').forEach(b=>b.setAttribute('aria-pressed',String(chosenAjza.has(Number(b.dataset.juz)))));
 const ids=selectedPool(data,chosenAjza);$('selected-count').textContent=chosenAjza.size?`${chosenAjza.size} selected`:'Choose your ajza';
 $('play-selection').disabled=!ids.length;$('selection-action').classList.toggle('visible',Boolean(ids.length));$('selection-action').inert=!ids.length;$('selection-action').setAttribute('aria-hidden',String(!ids.length));$('selection-total').textContent=ids.length?`${ids.length} recordings`:'Choose ajza';
 $('clear-selection').disabled=!chosenAjza.size;$('select-all').disabled=chosenAjza.size===data.juz.length;
}
