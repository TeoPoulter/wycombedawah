import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Queue} from './queue.mjs';
const c=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));
assert.deepEqual(c.juz.map(j=>j.number),Array.from({length:11},(_,i)=>i+20));
const whole={20:[28],21:[30,31,32],22:[34,35],23:[37,38],24:[40],25:[42,43,44,45],26:[46,47,48,49,50],27:[52,53,54,55,56,57],28:[58,59,60,61,62,63,64,65,66],29:[67,68,69,70,71,72,73,74,75,76,77],30:Array.from({length:37},(_,i)=>78+i)};
const assigned=new Set();
for(const j of c.juz){
 assert(j.ids.length>=50,`Juz ${j.number} needs at least 50 recordings`);assert.equal(j.ids.length,new Set(j.ids).size);
 for(const id of j.ids){
  assert(!assigned.has(id),`${id} assigned to more than one Juz`);assigned.add(id);
  const v=c.videos[id];assert(v);assert(v.duration>0);assert.equal(v.prayer.juz,j.number);assert(v.prayer.evidence);assert(j.verses[String(v.prayer.chapter)]);
  if(!whole[j.number].includes(v.prayer.chapter)){const [lo,hi]=j.verses[String(v.prayer.chapter)].split('-').map(Number);assert(v.prayer.verseStart>=lo&&v.prayer.verseEnd<=hi&&v.prayer.verseEnd>=v.prayer.verseStart)}
  for(const range of v.prayer.chapterRanges||[]){const [lo,hi]=j.verses[String(range.chapter)].split('-').map(Number);assert(lo<=range.verseStart&&range.verseStart<=range.verseEnd&&range.verseEnd<=hi)}
  if(v.prayer.companionRanges){assert.equal(v.prayer.singlePrayer,true);for(const r of v.prayer.companionRanges){const maps=c.juz.map(x=>x.verses[String(r.chapter)]).filter(Boolean).map(x=>x.split('-').map(Number));assert(maps.length);assert(r.verseStart>=1&&r.verseEnd>=r.verseStart&&r.verseEnd<=Math.max(...maps.map(x=>x[1])))}}
  assert(!/تجميع|تجميعة|الجزء|المصحف المرتل|جزء عم|جزء تبارك/.test(v.title),`Compilation in Juz collection: ${id}`);
 }
}
const audit=JSON.parse(readFileSync(new URL('./prayer-sources.json',import.meta.url)));
assert.equal(audit.videos.length,assigned.size);for(const e of audit.videos){assert(assigned.has(e.id));assert.equal(e.sourceUrl,`https://www.youtube.com/watch?v=${e.id}`);assert(e.query&&e.evidence)}
assert.equal(c.playlist.ids.length,157);assert.equal(new Set(c.playlist.ids).size,157);for(const id of c.playlist.ids)assert(c.videos[id]);
for(let trial=0;trial<100;trial++){const q=new Queue(['a','b','c','d']);const first=Array.from({length:4},()=>q.next());assert.equal(new Set(first).size,4);const fifth=q.next();assert.notEqual(fifth,first.at(-1));assert.equal(q.previous(),first.at(-1));assert.equal(q.next(),fifth)}
const q=new Queue(['a','b','c'],()=>.3);q.repeat='off';const first=q.next();const second=q.next();q.next();assert.equal(q.next(false),null);assert(q.next());q.reject(first);q.reject(second);for(let i=0;i<10;i++)assert(![first,second].includes(q.next()));q.reject(q.current);assert.equal(q.next(),null);
const empty=new Queue([]);assert.equal(empty.next(),null);const single=new Queue(['only']);assert.equal(single.next(),'only');assert.equal(single.next(),'only');single.reject('only');assert.equal(single.next(),null);
console.log('PASS: catalog integrity, 11 prayer-only Juz pools with at least 50 recordings each, 157 playlist entries, shuffle cycles, history, repeat-off and unavailable-video exhaustion');
