import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Queue} from './queue.mjs';
const c=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url)));
assert.deepEqual(c.juz.map(j=>j.number),Array.from({length:11},(_,i)=>i+20));
for(const j of c.juz){assert(j.ids.length>=3);assert.equal(j.ids.length,new Set(j.ids).size);for(const id of j.ids)assert(c.videos[id]);assert(Object.keys(j.verses).length>0)}
assert.equal(c.playlist.ids.length,157);assert.equal(new Set(c.playlist.ids).size,157);for(const id of c.playlist.ids)assert(c.videos[id]);
for(let trial=0;trial<100;trial++){const q=new Queue(['a','b','c','d']);const first=Array.from({length:4},()=>q.next());assert.equal(new Set(first).size,4);const fifth=q.next();assert.notEqual(fifth,first.at(-1));assert.equal(q.previous(),first.at(-1));assert.equal(q.next(),fifth)}
const q=new Queue(['a','b','c'],()=>.3);q.repeat='off';const first=q.next();const second=q.next();q.next();assert.equal(q.next(false),null);assert(q.next());q.reject(first);q.reject(second);for(let i=0;i<10;i++)assert(![first,second].includes(q.next()));q.reject(q.current);assert.equal(q.next(),null);
const empty=new Queue([]);assert.equal(empty.next(),null);const single=new Queue(['only']);assert.equal(single.next(),'only');assert.equal(single.next(),'only');single.reject('only');assert.equal(single.next(),null);
console.log('PASS: catalog integrity, 11 Juz pools, 157 playlist entries, shuffle cycles, history, repeat-off and unavailable-video exhaustion');
