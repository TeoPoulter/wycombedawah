import {ready,slot} from './timeline.mjs';
const b=document.querySelector('button'),a=document.querySelector('audio'),status=document.querySelector('#status');
let m,base,stamp,active=false,gen=0,track='',busy=false,pending,watchdog;
const now=()=>base+performance.now()-stamp;
function paint(label,playing=false,wait=false){status.textContent=label;b.classList.toggle('busy',wait);b.setAttribute('aria-label',active?'Pause radio':'Play radio');b.setAttribute('aria-pressed',String(playing));if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused'}
function config(){return pending??=(async()=>{let t=performance.now(),r=await fetch('station.json?clock='+crypto.randomUUID(),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();let date=Date.parse(r.headers.get('Date'));if(!Number.isFinite(date))throw Error();let received=performance.now(),v=await r.json();base=date+500+(received-t)/2;stamp=received;m=v})().finally(()=>pending=null)}
function stop(msg='Tap to tune in'){active=false;gen++;clearTimeout(watchdog);a.pause();busy=false;paint(msg)}
function waiting(){clearTimeout(watchdog);paint('Connecting…',false,true);watchdog=setTimeout(()=>stop('Connection interrupted · Tap to retry'),20000)}
function align(force=false){if(!active)return;const s=slot(m,now());if(!s)return stop('Broadcast starts soon');if(track!==s.track.audio){track=s.track.audio;a.src=track;waiting()}if(a.readyState>0&&(force||Math.abs(a.currentTime-s.pos)>3))a.currentTime=s.pos}
function run(){if(!active)return;align();if(!active)return;const g=gen;a.play().catch(()=>{if(g===gen)stop('Couldn’t connect · Tap to retry')})}
function start(){if(active)return;if(!ready(m)){paint('Checking station…');config().then(()=>paint(ready(m)?'Tap to tune in':'Awaiting authorised recordings')).catch(()=>paint('Station unavailable · Tap to retry'));return}active=true;gen++;waiting();run()}
b.onclick=()=>active?stop():start();
a.onloadedmetadata=()=>align(true);a.onplaying=()=>{if(active){clearTimeout(watchdog);paint('On air',true)}};a.onwaiting=()=>{if(active)waiting()};a.onended=()=>{if(active){setTimeout(()=>{if(active)run()},200)}};a.onerror=()=>{if(active)stop('Audio unavailable · Tap to retry')};
async function refresh(){if(busy)return;busy=true;try{await config();if(active&&ready(m))run();else if(active)stop('Station unavailable');else paint(ready(m)?'Tap to tune in':'Awaiting authorised recordings')}catch{if(!active)paint('Station unavailable · Tap to retry')}finally{busy=false}}
refresh();setInterval(refresh,60000);setInterval(()=>{if(active&&ready(m)){let old=track;align();if(old!==track)run()}},1000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('pagehide',()=>stop());
if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'Yasser Radio',artist:'Yasser Al-Dosari',album:'Masjid Dakhil',artwork:[{src:'../yasser/icon-512.png',sizes:'512x512',type:'image/png'}]});navigator.mediaSession.setActionHandler('play',start);navigator.mediaSession.setActionHandler('pause',()=>stop())}
