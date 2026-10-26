// Usage: yt-dlp --flat-playlist --dump-single-json URL > snapshot.json
// Then: node yasser/scripts/refresh-playlist.mjs snapshot.json
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),path=new URL('catalog.json',root),catalog=JSON.parse(readFileSync(path));
const snapshot=JSON.parse(readFileSync(process.argv[2],'utf8'));
if(snapshot.id!==catalog.playlist.id||!Array.isArray(snapshot.entries)||snapshot.entries.length<50)throw Error('Incomplete or wrong playlist snapshot; existing catalogue preserved.');
const entries=snapshot.entries.filter(e=>/^[\w-]{11}$/.test(e.id)&&e.title&&!/^\[(Deleted|Private) video\]$/.test(e.title));
const ids=[...new Set(entries.map(e=>e.id))];
for(const entry of entries)if(!catalog.videos[entry.id])catalog.videos[entry.id]={id:entry.id,title:entry.title,channel:entry.channel||entry.uploader||'',duration:entry.duration||null};
catalog.playlist={...catalog.playlist,title:snapshot.title||catalog.playlist.title,totalEntries:snapshot.entries.length,ids,checked:new Date().toISOString().slice(0,10)};
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
writeFileSync(new URL('playlist-snapshot.json',root),JSON.stringify({id:snapshot.id,checked:catalog.playlist.checked,totalEntries:snapshot.entries.length,ids},null,2)+'\n');
console.log(`Refreshed original playlist: ${ids.length} distinct playable metadata entries; all reciters retained.`);
