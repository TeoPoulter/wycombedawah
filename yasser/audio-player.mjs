// A small adapter lets the existing transport work with original archive audio.
export function audioPlayer(audio,lookup,onState,onError){
 let pendingStart=0,wantsPlay=false,destroyed=false;
 const handlers={
  loadedmetadata(){if(pendingStart>0){audio.currentTime=Math.min(pendingStart,Number.isFinite(audio.duration)?Math.max(0,audio.duration-.1):pendingStart)}if(wantsPlay)play()},
  playing(){onState(1)},pause(){onState(2)},waiting(){onState(3)},ended(){onState(0)},error(){onError()}
 };
 for(const [name,handler] of Object.entries(handlers))audio.addEventListener(name,handler);
 function play(){if(destroyed)return;wantsPlay=true;const result=audio.play();if(result?.catch)result.catch(error=>{if(error?.name==='NotAllowedError'){wantsPlay=false;onState(2)}else if(error?.name!=='AbortError')onError()})}
 function load(id,start,autoplay){pendingStart=Math.max(0,start||0);wantsPlay=autoplay;audio.src=lookup(id).mediaUrl;audio.load();if(autoplay)play()}
 return {
  loadVideoById(id,start=0){load(id,start,true)},cueVideoById(id,start=0){load(id,start,false)},
  playVideo:play,pauseVideo(){wantsPlay=false;audio.pause()},
  seekTo(seconds){pendingStart=Math.max(0,seconds||0);if(audio.readyState>0)audio.currentTime=pendingStart},
  getCurrentTime(){return audio.readyState>0?audio.currentTime:pendingStart},getDuration(){return Number.isFinite(audio.duration)?audio.duration:0},
  destroy(){destroyed=true;wantsPlay=false;for(const [name,handler] of Object.entries(handlers))audio.removeEventListener(name,handler);audio.pause();audio.removeAttribute('src');audio.load()}
 };
}
