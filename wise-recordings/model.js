export const clock = seconds => { const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0; return n >= 3600 ? `${Math.floor(n/3600)}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}` : `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
export const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f]/g,'').toLowerCase();
export const bounded = (n, duration) => Math.max(0, Math.min(Number.isFinite(duration) ? Math.max(0,duration) : Infinity, Number.isFinite(n) ? n : 0));
export function parseManifest(data, base) {
 if (data?.version !== 1 || !Array.isArray(data.recordings)) throw new Error('Invalid recording index');
 const ids = new Set();
 return data.recordings.map(item => {
  if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.filename !== 'string' || !item.filename.trim() || typeof item.url !== 'string') throw new Error('Invalid or duplicate recording');
  const url = new URL(item.url, base); if (!['https:','http:'].includes(url.protocol) || url.username || url.password || (url.protocol==='http:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Invalid audio URL');
  ids.add(item.id);
  return {...item,filename:item.filename,url:url.href,duration:Number.isFinite(item.duration)&&item.duration>0?item.duration:null};
 });
}
export function selectRecordings(records,{query='',savedOnly=false,saved=[],sort='original'}={}) {
 const q=normalize(query); const filtered=records.filter(r=>(!savedOnly||saved.includes(r.id))&&normalize([r.filename,r.surah||'',r.teacher||'',r.date||'',r.ayahs||''].join(' ')).includes(q));
 if(sort==='name')filtered.sort((a,b)=>a.filename.localeCompare(b.filename,undefined,{numeric:true}));
 if(sort==='ramadan')filtered.sort((a,b)=>(b.ramadanYear||0)-(a.ramadanYear||0)||(b.ramadanDay||0)-(a.ramadanDay||0));
 if(sort==='newest')filtered.sort((a,b)=>((/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')?Date.parse(b.date):0)||0)-((/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')?Date.parse(a.date):0)||0));
 return filtered;
}
export function restoreState(raw) {
 const data=raw && typeof raw==='object' ? raw : {};
 const positions={}; for(const [id,n] of Object.entries(data.positions||{})) if(Number.isFinite(n)&&n>=0&&n<604800) positions[id]=n;
 return {positions,saved:Array.isArray(data.saved)?[...new Set(data.saved.filter(x=>typeof x==='string'))]:[],last:typeof data.last==='string'?data.last:null,speed:[.75,1,1.25,1.5,2].includes(data.speed)?data.speed:1,autonext:data.autonext===true};
}
