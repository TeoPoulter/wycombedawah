// Use YouTube's standard supported embed. Authentication remains controlled by YouTube.
export function embedUrl(id,origin,start=0){
 const url=new URL(`https://www.youtube.com/embed/${encodeURIComponent(id)}`);
 url.search=new URLSearchParams({enablejsapi:'1',playsinline:'1',controls:'0',disablekb:'1',rel:'0',origin,start:String(Math.max(0,Math.floor(start||0)))});
 return url.href;
}
export function watchUrl(id,start=0){
 const url=new URL('https://www.youtube.com/watch');url.searchParams.set('v',id);
 if(start>0)url.searchParams.set('t',String(Math.floor(start)));
 return url.href;
}
export function playbackError(code,failures=0){
 // 101/150 can be an embed/account restriction: do not discard a recording or
 // churn through the queue when the browser's YouTube session is blocked.
 return {advance:code===100&&failures<5,message:code===100?'This recording is unavailable. Try another recording.':code===153?'YouTube could not verify this player. Retry, or open this recording on YouTube.':'YouTube blocked playback here. Retry, or open this recording on YouTube.'};
}
