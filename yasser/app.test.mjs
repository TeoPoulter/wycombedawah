import assert from 'node:assert/strict';
import {SESSION_KEY} from './session.mjs';
class Element{
 constructor(tag,env){this.tagName=tag.toUpperCase();this.env=env;this.children=[];this.listeners=new Map();this.attrs={};this.dataset={};this.hidden=false;this.disabled=false;this.value=0;this.style={setProperty(){}};this.className='';this.classList={contains:name=>this.classes?.has(name)||false,add:name=>(this.classes??=new Set()).add(name),remove:name=>this.classes?.delete(name),toggle:(name,force)=>{this.classes??=new Set();const yes=force??!this.classes.has(name);yes?this.classes.add(name):this.classes.delete(name);return yes}}}
 set id(value){this._id=value;this.env.ids.set(value,this)}get id(){return this._id}
 append(...elements){this.children.push(...elements);elements.forEach(element=>element.parent=this)}
 replaceChildren(...elements){this.children=[];this.append(...elements)}
 replaceWith(element){if(this.parent){const i=this.parent.children.indexOf(this);this.parent.children[i]=element;element.parent=this.parent}this.env.ids.set(element.id,element)}
 setAttribute(name,value){this.attrs[name]=String(value)}getAttribute(name){return this.attrs[name]??null}removeAttribute(name){delete this.attrs[name]}
 addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list)}
 removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==fn))}
 emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn(event)}
 focus(){this.env.document.activeElement=this}click(){if(!this.disabled)this.onclick?.({target:this})}
 closest(){return null}
}
class Audio extends Element{
 constructor(env){super('audio',env);this.currentTime=0;this.duration=240;this.readyState=0;this.playCount=0;this.paused=true;env.audio=this}
 load(){this.readyState=1;this.currentTime=0;this.emit('loadedmetadata')}
 play(){this.playCount++;this.paused=false;queueMicrotask(()=>this.emit('playing'));return Promise.resolve()}
 pause(){this.paused=true;this.emit('pause')}
}
const fixture={juz:Array.from({length:30},(_,i)=>({number:i+1,ids:i===0?['yt-one','audio-prayers-1']:[`yt-${i+1}`]})),playlist:{ids:['yt-one','audio-prayers-1']},videos:{}};
for(const juz of fixture.juz)for(const id of juz.ids)fixture.videos[id]={id,title:`Recording ${id}`,channel:'Publisher',duration:240,prayer:{juz:juz.number,hijriYear:1434}};
Object.assign(fixture.videos['audio-prayers-1'],{provider:'audio',mediaUrl:'https://publisher.example/prayer.mp3',sourceUrl:'https://yaldosry.com/prayers/1'});
let revision=0;
function setup(value=null,denied=false,withLibrary=false){
 const env={ids:new Map(),intervals:[],timeouts:[],value};
 const make=tag=>tag==='audio'?new Audio(env):new Element(tag,env);
 const ids=['splash','skip-intro','home','change-selection','arabic-name','page-title','brand-name','chooser','listening','select-all','clear-selection','status','playback-recovery','recovery-message','open-recording','recording-year','track-title','channel','watch','duration','elapsed','seek','play','back','forward','next','previous','repeat','selection-label','retry-playback','recovery-next','juz-grid','play-selection','playlist-count','random','selection-action','selected-count','selection-total','load-error'];
 for(const id of ids){const element=make('div');element.id=id}
 env.ids.get('listening').hidden=true;env.ids.get('playback-recovery').hidden=true;
 if(withLibrary)for(const id of ['favourite-recording','favourites-tab','library-dialog','library-list','library-message','remove-recording','removed-tab','admin-signout','admin-signin','admin-state','history-tab','admin-form','admin-password','admin-submit','library-toast','library-toast-text','undo-removal','toast-close','library-open','library-close','recording-heading','recording-detail']){const element=make('div');element.id=id;element.showModal=()=>element.open=true;element.close=()=>element.open=false;}
 const body=make('body'),header=make('header'),main=make('main'),head=make('head'),video=make('div');const slot=make('div');slot.id='player';video.append(slot);
 env.document={body,head,activeElement:body,hidden:false,getElementById:id=>env.ids.get(id),createElement:make,querySelector:selector=>({header,main,'.video':video})[selector],querySelectorAll:selector=>selector==='.juz'?env.ids.get('juz-grid').children:[],addEventListener(){}};
 env.extra=new Map();
 env.store={removeItem(key){env.extra.delete(key)},getItem(key){if(key!==SESSION_KEY)return env.extra.get(key)||null;if(denied)throw Error('denied');return env.value},setItem(key,value){if(denied)throw Error('denied');if(key===SESSION_KEY)env.value=value;else env.extra.set(key,value)}};
 const YT={Player:class{
  constructor(element,options){this.options=options;this.time=0;this.loads=0;this.cues=0;env.yt=this;queueMicrotask(()=>options.events.onReady({target:this}))}
  loadVideoById(id,start=0){this.id=id;this.time=start;this.loads++;this.options.events.onStateChange({data:1})}
  cueVideoById(id,start=0){this.id=id;this.time=start;this.cues++}
  playVideo(){this.options.events.onStateChange({data:1})}pauseVideo(){this.options.events.onStateChange({data:2})}
  getCurrentTime(){return this.time}getDuration(){return 240}seekTo(value){this.time=value}destroy(){}
 }};
 Object.assign(globalThis,{document:env.document,window:{YT,addEventListener(){}},YT,localStorage:env.store,location:{origin:'https://wycombedawah.com'},matchMedia:()=>({matches:true}),requestAnimationFrame(){},setTimeout(fn){env.timeouts.push(fn);return env.timeouts.length},clearTimeout(){},setInterval(fn){env.intervals.push(fn);return env.intervals.length},fetch:async(url,options)=>{if(String(url).includes('api/curation')){const body=options.body?JSON.parse(options.body):{};env.calls??=[];env.calls.push(body);env.favourites??=[];if(body.action==='favourite')env.favourites.push({id:body.id,saved_at:Date.now()});if(body.action==='unfavourite')env.favourites=env.favourites.filter(e=>e.id!==body.id);if(body.action==='favourites')return {ok:true,json:async()=>({favourites:env.favourites})};if(env.failWrite&&body.action==='remove')return {ok:false,status:503,json:async()=>({error:'Save failed'})};return {ok:true,json:async()=>body.action==='login'?{token:'test-token',expires:Date.now()+86400000}:body.action==='session'?{admin:true}:body.action?{ok:true}:{excluded:[]}}}return {ok:true,json:async()=>structuredClone(fixture)}}});
 env.click=id=>env.ids.get(id).click();env.tick=()=>env.intervals.forEach(fn=>fn());env.boot=async()=>{await import(`./app.js?controller-test=${++revision}`);for(let i=0;i<8;i++)await Promise.resolve()};return env;
}
const originalRandom=Math.random;Math.random=()=>0;
try{
 let env=setup();await env.boot();assert.equal(env.ids.get('juz-grid').children.length,30);
 env.ids.get('juz-grid').children[0].click();env.click('play-selection');for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(env.yt.loads,1);env.yt.time=73;env.tick();let saved=JSON.parse(env.value);assert.equal(saved.playback.position,73);assert.deepEqual(saved.draft,[1]);
 env=setup(env.value);await env.boot();assert.equal(env.yt.loads,0,'refresh must not autoplay');assert.equal(env.yt.cues,1);assert.equal(env.ids.get('elapsed').textContent,'1:13');
 env.tick();assert.equal(JSON.parse(env.value).playback.position,73,'cued player must not overwrite saved time');
 env.click('play');assert.equal(env.yt.time,73);assert.equal(env.ids.get('play').getAttribute('aria-label'),'Pause recording');
 env.click('next');for(let i=0;i<8;i++)await Promise.resolve();assert(env.audio);assert(env.audio.playCount>0);env.audio.currentTime=44;env.tick();saved=JSON.parse(env.value);assert.equal(saved.playback.currentId,'audio-prayers-1');assert.equal(saved.playback.position,44);
 env=setup(env.value);await env.boot();assert.equal(env.audio.playCount,0,'restored audio must stay paused');assert.equal(env.audio.currentTime,44);env.click('play');for(let i=0;i<8;i++)await Promise.resolve();assert.equal(env.audio.currentTime,44);assert(env.audio.playCount>0);
 env.click('change-selection');env.ids.get('juz-grid').children[29].click();saved=JSON.parse(env.value);assert.deepEqual(saved.draft,[1,30]);assert.deepEqual(saved.playback.ajza,[1]);assert.equal(saved.view,'chooser');
 env=setup(env.value);await env.boot();assert.equal(env.ids.get('listening').hidden,true);assert.equal(env.ids.get('juz-grid').children[29].getAttribute('aria-pressed'),'true');
 env=setup(null,true);await env.boot();env.ids.get('juz-grid').children[0].click();assert.equal(env.ids.get('play-selection').disabled,false);
 env=setup(null,false,true);await env.boot();env.click('library-open');assert.equal(env.ids.get('library-dialog').open,true);assert(!env.extra.has('yasser:history:v1'),'merely loading must not add history');
 env.ids.get('admin-password').value='test';await env.ids.get('admin-form').onsubmit({preventDefault(){}});assert.equal(env.ids.get('remove-recording').hidden,false);assert(env.extra.has('yasser:admin:v1'));
 env.click('library-close');env.ids.get('juz-grid').children[0].click();env.click('play-selection');for(let i=0;i<12;i++)await Promise.resolve();env.yt.time=52;env.tick();let heard=JSON.parse(env.extra.get('yasser:history:v1'));assert.equal(heard[0].position,52);
 env.click('favourite-recording');for(let i=0;i<16;i++)await Promise.resolve();assert.equal(env.ids.get('favourite-recording').getAttribute('aria-pressed'),'true');assert.equal(env.favourites[0].id,'yt-one');env.click('library-open');env.click('favourites-tab');assert.equal(env.ids.get('favourites-tab').getAttribute('aria-pressed'),'true');env.click('library-close');env.click('favourite-recording');for(let i=0;i<16;i++)await Promise.resolve();assert.equal(env.favourites.length,0);assert.equal(env.ids.get('favourite-recording').getAttribute('aria-pressed'),'false');
 env.click('remove-recording');for(let i=0;i<16;i++)await Promise.resolve();assert(env.calls.some(c=>c.action==='remove'));assert(env.audio,'removing current video advances to eligible audio');assert.equal(JSON.parse(env.extra.get('yasser:excluded:v1'))[0].id,'yt-one');
 env.click('undo-removal');for(let i=0;i<16;i++)await Promise.resolve();assert.equal(JSON.parse(env.extra.get('yasser:excluded:v1')).length,0);assert(env.calls.some(c=>c.action==='restore'));
 env.failWrite=true;const currentAudio=env.audio;env.click('remove-recording');for(let i=0;i<16;i++)await Promise.resolve();assert.equal(env.audio,currentAudio);assert.equal(JSON.parse(env.extra.get('yasser:excluded:v1')).length,0);assert.equal(env.ids.get('library-toast-text').textContent,'Save failed');
 console.log('PASS: library login/session, real-play history, shared removal skips current recording, undo restores eligibility');
 console.log('PASS: complete controller renders30ajza, savesprogress, restoresYT/audio paused atsame timestamp, resumesonPlay, switchesproviders, keepsdraft separatefromactivepool and survives deniedstorage');
}finally{Math.random=originalRandom}
