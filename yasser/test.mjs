import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Queue} from './queue.mjs';
import {selectedPool,selectionLabel} from './selection.mjs';
import {recordingEra,normalizeDigits,usesRecentBudget,cappedIds} from './era.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url))),catalog=read('./catalog.json');
const canonical=read('./juz-map.json').juz,chapterLengths=read('./chapter-lengths.json').chapters;
assert.deepEqual(catalog.juz.map(juz=>juz.number),Array.from({length:30},(_,i)=>i+1));
const assigned=new Set(),mediaUrls=new Set();
for(const juz of catalog.juz){
 assert.deepEqual(juz.verses,canonical[juz.number-1].verses);
 assert(juz.ids.length>=50,`Juz ${juz.number} needs at least50 recordings`);assert.equal(juz.ids.length,new Set(juz.ids).size);
 assert(juz.ids.filter(id=>usesRecentBudget(catalog.videos[id])).length<=Math.floor(juz.ids.length*.3),`Recent/undated quota exceeded in Juz ${juz.number}`);
 for(const id of juz.ids){
  assert(!assigned.has(id),`${id} assigned to more than one principal Juz`);assigned.add(id);
  const video=catalog.videos[id],prayer=video.prayer;assert(prayer.yearEvidence);assert(['classic','other','recent','unknown'].includes(prayer.era));assert.equal(prayer.juz,juz.number);assert(prayer.evidence);
  assert(prayer.chapter!==1,'Al-Fatihah must not inflate Juz1 counts');
  assert(video.duration===null||video.duration>0);
  if(video.provider==='audio'){assert(!mediaUrls.has(video.mediaUrl),'Repeated original media URL');mediaUrls.add(video.mediaUrl);assert(/^audio-(?:prayers|taraweeh)-\d+$/.test(id));assert(/^https:\/\//.test(video.mediaUrl));assert(/yaldosry\.com\/(prayers|taraweeh)\//.test(video.sourceUrl))}else assert(/^[a-zA-Z0-9_-]{11}$/.test(id));
  const range=juz.verses[String(prayer.chapter)];assert(range,`${id} chapter not in Juz`);
  const [lo,hi]=range.split('-').map(Number),whole=lo===1&&hi===chapterLengths[prayer.chapter];
  const contained=Number.isInteger(prayer.verseStart)&&Number.isInteger(prayer.verseEnd)&&lo<=prayer.verseStart&&prayer.verseStart<=prayer.verseEnd&&prayer.verseEnd<=hi;
  const anchored=Number.isInteger(prayer.verifiedAnchorVerse)&&lo<=prayer.verifiedAnchorVerse&&prayer.verifiedAnchorVerse<=hi&&Boolean(prayer.anchorEvidence);
  assert(whole||contained||anchored,`${id} lacks documented in-Juz passage proof`);
  if(anchored)assert.equal(prayer.classification,'documented-passage');
  for(const part of prayer.chapterRanges||[]){assert(chapterLengths[part.chapter]);assert(part.verseStart>=1&&part.verseEnd>=part.verseStart&&part.verseEnd<=chapterLengths[part.chapter]);if(!anchored){const [min,max]=juz.verses[String(part.chapter)].split('-').map(Number);assert(min<=part.verseStart&&part.verseEnd<=max)}}
  if(prayer.companionRanges){assert.equal(prayer.singlePrayer,true);for(const part of prayer.companionRanges){assert(chapterLengths[part.chapter]);assert(part.verseStart>=1&&part.verseEnd>=part.verseStart&&part.verseEnd<=chapterLengths[part.chapter])}}
  assert(!/تجميع|تجميعة|الجزء|المصحف المرتل|جزء عم|جزء تبارك/.test(video.title),`Compilation/studio label in collection: ${id}`);
 }
}
const audit=read('./prayer-sources.json');
assert.equal(audit.videos.filter(entry=>entry.active!==false).length,assigned.size);
for(const entry of audit.videos){assert.equal(assigned.has(entry.id),entry.active!==false);assert(entry.query&&entry.evidence);if(entry.provider==='audio')assert(/^https:\/\/(?:www\.)?yaldosry\.com\//.test(entry.sourceUrl));else assert.equal(entry.sourceUrl,`https://www.youtube.com/watch?v=${entry.id}`)}
assert.equal(catalog.playlist.ids.length,157);assert.equal(new Set(catalog.playlist.ids).size,157);for(const id of catalog.playlist.ids)assert(catalog.videos[id]);
for(let trial=0;trial<100;trial++){const queue=new Queue(['a','b','c','d']);const first=Array.from({length:4},()=>queue.next());assert.equal(new Set(first).size,4);const fifth=queue.next();assert.notEqual(fifth,first.at(-1));assert.equal(queue.previous(),first.at(-1));assert.equal(queue.next(),fifth)}
const queue=new Queue(['a','b','c'],()=>.3);queue.repeat='off';const first=queue.next(),second=queue.next();queue.next();assert.equal(queue.next(false),null);assert(queue.next());queue.reject(first);queue.reject(second);for(let i=0;i<10;i++)assert(![first,second].includes(queue.next()));queue.reject(queue.current);assert.equal(queue.next(),null);
const empty=new Queue([]);assert.equal(empty.next(),null);const single=new Queue(['only']);assert.equal(single.next(),'only');assert.equal(single.next(),'only');single.reject('only');assert.equal(single.next(),null);
assert.deepEqual(selectedPool({juz:[{number:1,ids:['a','b']},{number:30,ids:['b','c']}]},new Set([1,30])),['a','b','c']);
assert.deepEqual(selectedPool(catalog,[]),[]);assert.deepEqual(selectedPool(catalog,[0,31]),[]);
assert.equal(selectionLabel([1]),'Juz 1');assert.equal(selectionLabel([23,1,23]),'Juz 1, 23');assert.equal(selectionLabel(catalog.juz.map(juz=>juz.number)),'Juz 1–30');
// Global ID disjointness + each Juz's integer quota prove the cap for every union.
// Check all pairs and a reproducible broad sample instead of enumerating2^30 subsets.
const subsets=[catalog.juz.map(juz=>juz.number)];
for(let a=1;a<=30;a++)for(let b=a;b<=30;b++)subsets.push(a===b?[a]:[a,b]);
let seed=0x4a75;for(let trial=0;trial<2000;trial++){const chosen=[];for(let n=1;n<=30;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;if(seed&0x80000000)chosen.push(n)}subsets.push(chosen)}
for(const numbers of subsets){const ids=selectedPool(catalog,numbers);assert.equal(ids.length,new Set(ids).size);assert(ids.every(id=>numbers.includes(catalog.videos[id].prayer.juz)));assert(ids.filter(id=>usesRecentBudget(catalog.videos[id])).length<=Math.floor(ids.length*.3))}
assert.equal(normalizeDigits('١٤٣٢ ۱۴۴۷'),'1432 1447');assert.equal(recordingEra({title:'فجر ١٤٤٦'}).era,'recent');assert.equal(recordingEra({title:'فجر ١٤٤٨'}).era,'recent');assert.equal(recordingEra({title:'تراويح ۱۴۳۲'}).era,'classic');assert.equal(recordingEra({title:'صلاة العشاء 2026'}).era,'recent');assert.equal(recordingEra({title:'فجرية بلا تاريخ'}).era,'unknown');assert.equal(recordingEra({title:'صلاة العشاء 2021'}).era,'other');
const fixture=Object.fromEntries(Array.from({length:10},(_,i)=>[String(i),{prayer:{era:i<5?'other':i<8?'recent':'unknown'}}]));const capped=cappedIds(Object.keys(fixture),fixture);assert(capped.filter(id=>usesRecentBudget(fixture[id])).length<=Math.floor(capped.length*.3));assert(!capped.some(id=>fixture[id].prayer.era==='unknown'));
console.log(`PASS: ${assigned.size} sourced recordings,30Ajza≥50each,canonicalpassageevidence,disjointprincipalassignments,30%modern/undatedcap,allpairs+2000subsetchecks,unchanged157-video playlist andshuffle/history/errorhandling`);
