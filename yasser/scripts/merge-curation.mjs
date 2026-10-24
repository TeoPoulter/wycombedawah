import {readFileSync,writeFileSync} from 'node:fs';
import {recordingEra,cappedIds,usesRecentBudget} from '../era.mjs';
const root=new URL('../',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const catalog=read('catalog.json'),audit=read('prayer-sources.json'),mapping=read('juz-map.json').juz;
const chapters=read('chapter-lengths.json').chapters,known=new Map(audit.videos.map(entry=>[entry.id,entry]));
let added=0;
for(const path of process.argv.slice(2)){
 for(const entry of JSON.parse(readFileSync(path,'utf8'))){
  if(known.has(entry.id))continue;
  if(entry.verifiedAnchorVerse===undefined&&Number.isInteger(entry.anchorVerse))entry.verifiedAnchorVerse=entry.anchorVerse;
  if(!entry.evidence||!entry.query||!Number.isInteger(entry.juz)||entry.juz<1||entry.juz>30)throw Error(`Missing source proof: ${entry.id}`);
  if(entry.provider==='audio'){
   if(!/^audio-(?:prayers|taraweeh)-\d+$/.test(entry.id)||!/^https:\/\//.test(entry.mediaUrl)||!/^https:\/\/(?:www\.)?yaldosry\.com\/(?:prayers|taraweeh)\/\d+/.test(entry.sourceUrl))throw Error(`Invalid official audio: ${entry.id}`);
  }else if(!/^[a-zA-Z0-9_-]{11}$/.test(entry.id))throw Error(`Invalid video: ${entry.id}`);
  if(entry.year!==undefined&&entry.year!==null&&(!Number.isInteger(entry.year)||entry.year<1400||entry.year>1500||!entry.yearEvidence))throw Error(`Unproven recording year: ${entry.id}`);
  if(entry.duration!==null&&!(Number.isFinite(entry.duration)&&entry.duration>0))throw Error(`Invalid duration: ${entry.id}`);
  if(entry.duration===null&&!/yaldosry\.com/.test(entry.evidenceUrl||entry.sourceUrl))throw Error(`Unknown duration without official archive proof: ${entry.id}`);
  const verses=mapping[entry.juz-1].verses[String(entry.chapter)];if(!verses)throw Error(`Chapter not in Juz: ${entry.id}`);
  const [lo,hi]=verses.split('-').map(Number),whole=lo===1&&hi===chapters[entry.chapter];
  const contained=Number.isInteger(entry.verseStart)&&Number.isInteger(entry.verseEnd)&&entry.verseStart>=lo&&entry.verseEnd>=entry.verseStart&&entry.verseEnd<=hi;
  const anchored=Number.isInteger(entry.verifiedAnchorVerse)&&entry.verifiedAnchorVerse>=lo&&entry.verifiedAnchorVerse<=hi&&Boolean(entry.anchorEvidence);
  if(!whole&&!contained&&!anchored)throw Error(`Unproven split-chapter assignment: ${entry.id} Juz ${entry.juz}`);
  known.set(entry.id,{...entry,location:entry.location||entry.venue,locationEvidence:entry.locationEvidence||entry.venueEvidence,sourceUrl:entry.sourceUrl||`https://www.youtube.com/watch?v=${entry.id}`,classification:anchored?'documented-passage':contained?'contained-range':'contained-chapter'});added++;
 }
}
const corrections={
 '9kzMRQX40sA':{year:1440,yearEvidence:'Publisher description explicitly dates this prayer Fajr Thursday 7-3-1440; preserved in the source audit.'},
 'izFxtCdrO8w':{year:1434,yearEvidence:'Official prayer archive https://yaldosry.com/prayers/4060 dates this prayer Isha 7-11-1434; publisher title has a duplicated year digit.'}
};
// Prefer original publisher audio to a YouTube delivery of the very same official item.
const sourceKey=entry=>{const match=(entry.evidenceUrl||entry.sourceUrl||'').match(/yaldosry\.com\/(prayers|taraweeh)\/(\d+)/);return match?`${match[1]}/${match[2]}`:null};
const officialAudio=new Map([...known.values()].filter(entry=>entry.provider==='audio').map(entry=>[sourceKey(entry),entry.id]));
const excluded=new Map();
for(const entry of known.values())if(entry.provider==='audio'){
 for(const id of entry.alternateDeliveryIds||[])if(known.has(id))excluded.set(id,`Verified YouTube delivery of original audio ${entry.id}; ${entry.alternateDeliveryEvidence}`);
}
const mediaSeen=new Map();
for(const entry of known.values()){
 if(entry.provider!=='audio')continue;
 if(mediaSeen.has(entry.mediaUrl))excluded.set(entry.id,`Same original media as ${mediaSeen.get(entry.mediaUrl)}.`);
 else mediaSeen.set(entry.mediaUrl,entry.id);
}
for(const entry of known.values()){
 const key=sourceKey(entry);if(key&&entry.provider!=='audio'&&officialAudio.has(key))excluded.set(entry.id,`Alternate delivery of the same official prayer; original audio ${officialAudio.get(key)} is used.`);
 const date=recordingEra({...entry,...corrections[entry.id]});
 let video=catalog.videos[entry.id];
 if(!video){
  const title=entry.title.replace(/\b(?:yas+er|yasir)\s+(?:ad[- ]?|al[- ]?)?(?:dos+s?a?ri|dossary|dosary|dawsari|dossari)\b/gi,'Yasser Al-Dosari');
  video={id:entry.id,title,channel:entry.channel||'',duration:entry.duration};if(title!==entry.title)video.sourceTitle=entry.title;catalog.videos[entry.id]=video;
 }
 if(entry.provider==='audio'){video.provider='audio';video.mediaUrl=entry.mediaUrl;video.sourceUrl=entry.sourceUrl}
 video.prayer={juz:entry.juz,chapter:entry.chapter,evidence:entry.evidence,...date};
 for(const key of ['verseStart','verseEnd','chapterRanges','companionRanges','singlePrayer','verifiedAnchorVerse','anchorEvidence','classification','location','locationEvidence'])if(entry[key]!==undefined)video.prayer[key]=entry[key];
 if(entry.companionRanges)video.prayer.singlePrayer=true;
 entry.recordingDate=date;
}
const juz=mapping.map(item=>({...item,ids:cappedIds([...known.values()].filter(entry=>entry.juz===item.number&&!excluded.has(entry.id)).map(entry=>entry.id),catalog.videos,.3)}));
const short=juz.filter(item=>item.ids.length<50);if(short.length)throw Error(`Cannot publish underfilled ajza: ${short.map(item=>`${item.number}:${item.ids.length}`).join(', ')}`);
catalog.juz=juz;
const active=new Set(juz.flatMap(item=>item.ids));
for(const entry of known.values()){
 entry.active=active.has(entry.id);
 if(entry.active)delete entry.holdbackReason;
 else entry.holdbackReason=excluded.get(entry.id)||'Held outside active selections to enforce the maximum 30% recent-or-undated share.';
}
catalog.checked='2026-10-24';catalog.curation='full-mushaf-salah-v4';
catalog.selectionPolicy={recentHijriYearFloor:1446,maxRecentShare:.3,undatedCountsAsRecent:true,preferredHijriYearRange:[1426,1436],scope:'All 30 Juz collections and combined selections; original personal playlist unchanged.',classification:'A recording is associated with a documented in-Juz passage; complete single prayers may include companion or additional passages. Exact range and verified-verse-anchor evidence are distinguished.'};
audit.checked=catalog.checked;audit.method='Arabic publisher metadata, original official prayer archive sources, explicit dates and verified passage ranges or Quran verse anchors. Unknown and AH1446+ sources share the 30% maximum. Counts are distinct sourced clips, not claims of unique prayer performances.';audit.videos=[...known.values()];
for(const [name,value] of [['catalog.json',catalog],['prayer-sources.json',audit]])writeFileSync(new URL(name,root),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({added,active:active.size,audio:[...active].filter(id=>catalog.videos[id].provider==='audio').length,heldBack:known.size-active.size,juz:juz.map(item=>({juz:item.number,total:item.ids.length,audio:item.ids.filter(id=>catalog.videos[id].provider==='audio').length,classic:item.ids.filter(id=>catalog.videos[id].prayer.era==='classic').length,budgetShare:item.ids.filter(id=>usesRecentBudget(catalog.videos[id])).length/item.ids.length}))},null,2));
