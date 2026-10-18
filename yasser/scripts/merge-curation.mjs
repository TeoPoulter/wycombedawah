import {readFileSync,writeFileSync} from 'node:fs';
import {recordingEra,cappedIds,usesRecentBudget} from '../era.mjs';
const root=new URL('../',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const catalog=read('catalog.json'),audit=read('prayer-sources.json');
const known=new Map(audit.videos.map(e=>[e.id,e]));
const added=[];
for(const path of process.argv.slice(2)){
 const entries=JSON.parse(readFileSync(path,'utf8'));
 for(const e of entries){
  if(known.has(e.id))continue;
  if(!/^[a-zA-Z0-9_-]{11}$/.test(e.id)||!e.evidence||!e.yearEvidence||!Number.isInteger(e.year)||e.year<1426||e.year>1436)throw Error(`Invalid older recording ${e.id}`);
  known.set(e.id,{...e,sourceUrl:`https://www.youtube.com/watch?v=${e.id}`});added.push(e.id);
 }
}
const corrections={
 '9kzMRQX40sA':{year:1440,yearEvidence:'Publisher description explicitly dates this prayer Fajr Thursday 7-3-1440; preserved in the source audit.'},
 'izFxtCdrO8w':{year:1434,yearEvidence:'Official prayer archive https://yaldosry.com/prayers/4060 dates this prayer Isha 7-11-1434; publisher title has a duplicated year digit.'}
};
for(const e of known.values()){
 const date=recordingEra({...e,...corrections[e.id]});
 let v=catalog.videos[e.id];
 if(!v){
  const title=e.title.replace(/\b(?:yas+er|yasir)\s+(?:ad[- ]?|al[- ]?)?(?:dos+s?a?ri|dossary|dosary|dawsari|dossari)\b/gi,'Yasser Al-Dosari');
  v={id:e.id,title,channel:e.channel||'',duration:e.duration};if(title!==e.title)v.sourceTitle=e.title;catalog.videos[e.id]=v;
 }
 v.prayer={juz:e.juz,chapter:e.chapter,evidence:e.evidence,...date};
 for(const key of ['verseStart','verseEnd','chapterRanges','companionRanges','singlePrayer'])if(e[key]!==undefined)v.prayer[key]=e[key];
 if(e.companionRanges)v.prayer.singlePrayer=true;
 e.recordingDate=date;
}
for(const j of catalog.juz){
 const candidates=[...known.values()].filter(e=>e.juz===j.number).map(e=>e.id);
 j.ids=cappedIds(candidates,catalog.videos,.3);
 if(j.ids.length<50)throw Error(`Juz ${j.number} would fall below 50: ${j.ids.length}`);
}
const active=new Set(catalog.juz.flatMap(j=>j.ids));
for(const e of known.values()){e.active=active.has(e.id);if(!e.active)e.holdbackReason='Held outside active Juz selections to enforce the 30% recent-or-undated quota.';else delete e.holdbackReason}
catalog.checked='2026-10-18';catalog.curation='classic-salah-multiselect-v3';
catalog.selectionPolicy={recentHijriYears:[1446,1447],maxRecentShare:.3,undatedCountsAsRecent:true,preferredHijriYearRange:[1426,1436],scope:'Juz collections and any combined Juz selection; original personal playlist is unchanged.'};
audit.checked=catalog.checked;audit.method='Arabic source metadata and prayer provenance; explicit recording-year evidence. Recent and undated clips share a conservative maximum 30% quota per active Juz.';audit.videos=[...known.values()];
for(const [name,value] of [['catalog.json',catalog],['prayer-sources.json',audit]])writeFileSync(new URL(name,root),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({added:added.length,active:active.size,heldBack:known.size-active.size,juz:catalog.juz.map(j=>({juz:j.number,total:j.ids.length,classic:j.ids.filter(id=>catalog.videos[id].prayer.era==='classic').length,recent:j.ids.filter(id=>catalog.videos[id].prayer.era==='recent').length,unknown:j.ids.filter(id=>catalog.videos[id].prayer.era==='unknown').length,budgetShare:j.ids.filter(id=>usesRecentBudget(catalog.videos[id])).length/j.ids.length}))},null,2));
