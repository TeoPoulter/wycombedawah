import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Queue} from './queue.mjs';
import {selectedPool,selectionLabel} from './selection.mjs';
import {recordingEra,normalizeDigits,usesRecentBudget,cappedIds} from './era.mjs';
const c=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));
assert.deepEqual(c.juz.map(j=>j.number),Array.from({length:11},(_,i)=>i+20));
const chapterLengths=JSON.parse(readFileSync(new URL('./chapter-lengths.json',import.meta.url))).chapters;
const whole={20:[28],21:[30,31,32],22:[34,35],23:[37,38],24:[40],25:[42,43,44,45],26:[46,47,48,49,50],27:[52,53,54,55,56,57],28:[58,59,60,61,62,63,64,65,66],29:[67,68,69,70,71,72,73,74,75,76,77],30:Array.from({length:37},(_,i)=>78+i)};
const assigned=new Set();
for(const j of c.juz){
 assert(j.ids.filter(id=>usesRecentBudget(c.videos[id])).length<=Math.floor(j.ids.length*.3),`Recent/undated quota exceeded in Juz ${j.number}`);
 assert(j.ids.length>=50,`Juz ${j.number} needs at least 50 recordings`);assert.equal(j.ids.length,new Set(j.ids).size);
 for(const id of j.ids){
  assert(!assigned.has(id),`${id} assigned to more than one Juz`);assigned.add(id);
  const v=c.videos[id];assert(v);assert(v.prayer.yearEvidence);assert(['classic','other','recent','unknown'].includes(v.prayer.era));assert(v.duration>0);assert.equal(v.prayer.juz,j.number);assert(v.prayer.evidence);assert(j.verses[String(v.prayer.chapter)]);
  if(!whole[j.number].includes(v.prayer.chapter)){const [lo,hi]=j.verses[String(v.prayer.chapter)].split('-').map(Number);assert(v.prayer.verseStart>=lo&&v.prayer.verseEnd<=hi&&v.prayer.verseEnd>=v.prayer.verseStart)}
  for(const range of v.prayer.chapterRanges||[]){const [lo,hi]=j.verses[String(range.chapter)].split('-').map(Number);assert(lo<=range.verseStart&&range.verseStart<=range.verseEnd&&range.verseEnd<=hi)}
  if(v.prayer.companionRanges){assert.equal(v.prayer.singlePrayer,true);for(const r of v.prayer.companionRanges){assert(chapterLengths[r.chapter]);assert(r.verseStart>=1&&r.verseEnd>=r.verseStart&&r.verseEnd<=chapterLengths[r.chapter])}}
  assert(!/تجميع|تجميعة|الجزء|المصحف المرتل|جزء عم|جزء تبارك/.test(v.title),`Compilation in Juz collection: ${id}`);
 }
}
const audit=JSON.parse(readFileSync(new URL('./prayer-sources.json',import.meta.url)));
assert.equal(audit.videos.filter(e=>e.active!==false).length,assigned.size);for(const e of audit.videos){assert.equal(assigned.has(e.id),e.active!==false);assert.equal(e.sourceUrl,`https://www.youtube.com/watch?v=${e.id}`);assert(e.query&&e.evidence)}
assert.equal(c.playlist.ids.length,157);assert.equal(new Set(c.playlist.ids).size,157);for(const id of c.playlist.ids)assert(c.videos[id]);
for(let trial=0;trial<100;trial++){const q=new Queue(['a','b','c','d']);const first=Array.from({length:4},()=>q.next());assert.equal(new Set(first).size,4);const fifth=q.next();assert.notEqual(fifth,first.at(-1));assert.equal(q.previous(),first.at(-1));assert.equal(q.next(),fifth)}
const q=new Queue(['a','b','c'],()=>.3);q.repeat='off';const first=q.next();const second=q.next();q.next();assert.equal(q.next(false),null);assert(q.next());q.reject(first);q.reject(second);for(let i=0;i<10;i++)assert(![first,second].includes(q.next()));q.reject(q.current);assert.equal(q.next(),null);
const empty=new Queue([]);assert.equal(empty.next(),null);const single=new Queue(['only']);assert.equal(single.next(),'only');assert.equal(single.next(),'only');single.reject('only');assert.equal(single.next(),null);
assert.deepEqual(selectedPool({juz:[{number:20,ids:['a','b']},{number:21,ids:['b','c']}]},new Set([20,21])),['a','b','c']);
assert.deepEqual(selectedPool(c,new Set()),[]);assert.deepEqual(selectedPool(c,[19,99]),[]);
assert.equal(selectionLabel([20]),'Juz 20');assert.equal(selectionLabel([23,20,23]),'Juz 20, 23');assert.equal(selectionLabel(c.juz.map(j=>j.number)),'Juz 20–30');
for(let mask=1;mask<(1<<11);mask++){
 const numbers=c.juz.filter((j,i)=>mask&(1<<i)).map(j=>j.number),ids=selectedPool(c,numbers);
 assert.equal(ids.length,new Set(ids).size);assert(ids.every(id=>numbers.includes(c.videos[id].prayer.juz)));
 assert(ids.filter(id=>usesRecentBudget(c.videos[id])).length<=Math.floor(ids.length*.3),`Quota failed for ${numbers}`);
}
assert.equal(normalizeDigits('١٤٣٢ ۱۴۴۷'),'1432 1447');assert.equal(recordingEra({title:'فجر ١٤٤٦'}).era,'recent');assert.equal(recordingEra({title:'تراويح ۱۴۳۲'}).era,'classic');assert.equal(recordingEra({title:'صلاة العشاء 2025'}).era,'recent');assert.equal(recordingEra({title:'فجرية بلا تاريخ'}).era,'unknown');assert.equal(recordingEra({title:'صلاة العشاء 2021'}).era,'other');
const quotaFixture=Object.fromEntries(Array.from({length:10},(_,i)=>[String(i),{prayer:{era:i<5?'other':i<8?'recent':'unknown'}}]));
const capped=cappedIds(Object.keys(quotaFixture),quotaFixture);assert(capped.filter(id=>usesRecentBudget(quotaFixture[id])).length<=Math.floor(capped.length*.3));assert(!capped.some(id=>quotaFixture[id].prayer.era==='unknown'));
console.log('PASS: multi-select union and all 2047 combinations, conservative 30% quota, Arabic/Persian dates,  catalog integrity, 11 prayer-only Juz pools with at least 50 recordings each, 157 playlist entries, shuffle cycles, history, repeat-off and unavailable-video exhaustion');
