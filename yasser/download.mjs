import {recordingHeading,recordingDetail} from './listening-log.mjs?v=20261026-cloud-v13';
import {radioDownloads} from './download-sources.mjs?v=20261118';

const service='https://yasser-archive-curation.teopoulter.chatgpt.site/api/download';
export function downloadSource(recording){
 if(!recording)return null;
 if(radioDownloads[recording.id])return radioDownloads[recording.id];
 return recording.provider==='audio'&&recording.mediaUrl?`${service}?id=${encodeURIComponent(recording.id)}`:null;
}
export function downloadFilename(recording){
 const label=[recordingHeading(recording)||recording.sourceTitle||recording.title||'Recording',recordingDetail(recording)].filter(Boolean).join(' - ');
 const clean=label.normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
 const extension=new URL(recording.mediaUrl||radioDownloads[recording.id]||'https://example.com/audio.mp3','https://wycombedawah.com').pathname.match(/\.(mp3|m4a|aac|ogg|wav|flac)$/i)?.[1].toLowerCase()||'mp3';
 return `Yasser Archives - ${clean} - ${recording.id}.${extension}`;
}
export async function fetchRecording(source,{fetcher=fetch,signal}={}){
 // This is a separate, complete GET: never read the media element or its buffers.
 const response=await fetcher(source,{credentials:'omit',signal,cache:'no-store'});
 if(response.status!==200||response.headers.get('Content-Range'))throw Error('The full recording could not be downloaded. Please try again.');
 const type=response.headers.get('Content-Type')||'';
 if(!/^(audio\/|application\/octet-stream)/i.test(type))throw Error('The source did not return an audio file. Please try again later.');
 const blob=await response.blob(),expected=Number(response.headers.get('X-Audio-Length')||response.headers.get('Content-Length'));
 if(!blob.size||(expected>0&&blob.size!==expected))throw Error('The download was incomplete. Please try again.');
 return blob;
}
export function createDownloadControl({button,message,getRecording,fetcher,saveBlob=saveDownload}){
 let busy=false,lastId;
 const unavailable='An audio download is not available for this YouTube-only recording.';
 function update(){
  const recording=getRecording(),available=Boolean(downloadSource(recording));
  if(recording?.id!==lastId){lastId=recording?.id;if(!busy)message.textContent='';}
  button.disabled=!recording||busy;
  button.setAttribute('aria-busy',String(busy));
  button.classList.toggle('download-unavailable',Boolean(recording)&&!available);
  button.setAttribute('aria-label',busy?'Preparing full recording download':available?'Download full recording':'Audio download unavailable for this recording');
  button.title=busy?'Preparing download…':available?'Download full recording':unavailable;
 }
 button.onclick=async()=>{
  if(busy)return;
  // Capture both the file and name before awaiting; Next/Previous remain usable.
  const recording=getRecording(),source=downloadSource(recording);
  if(!source){message.textContent=unavailable;return;}
  const filename=downloadFilename(recording);busy=true;message.textContent='Preparing full recording…';update();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),600000);
  try{
   const blob=await fetchRecording(source,{fetcher,signal:controller.signal});
   saveBlob(blob,filename);
   message.textContent='Download sent to your browser.';
  }catch(error){message.textContent=error?.name==='AbortError'?'Download timed out. Please try again.':error instanceof TypeError?'Download unavailable. Check your connection and try again.':error.message||'Download failed. Please try again.';}
  finally{clearTimeout(timer);busy=false;update();}
 };
 update();return {update};
}
function saveDownload(blob,filename){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.hidden=true;document.body.append(link);
 try{link.click()}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
