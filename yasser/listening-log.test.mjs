import assert from 'node:assert/strict';
import {startVisit,updateVisit,readHistory,writeHistory,applyExclusions,recordingHeading,recordingDetail} from './listening-log.mjs';
let entries=startVisit([],{id:'a',mode:'juz',ajza:[1,2],position:34},1000);const key=entries[0].key;
entries=updateVisit(entries,key,90,true);entries=updateVisit(entries,key,90);assert(entries[0].ended,'periodic saves preserve finished status');
entries=startVisit(entries,{id:'b',mode:'playlist',ajza:[]},2000);assert.equal(entries.length,2);assert.equal(entries[0].id,'b');assert.equal(entries[1].position,90);
let saved;const storage={setItem(k,v){saved=v},getItem(){return saved}};assert(writeHistory(storage,entries));assert.deepEqual(readHistory(storage),entries);assert.deepEqual(readHistory({getItem(){throw Error()}}),[]);assert.equal(writeHistory(null,entries),false);
const catalog={juz:[{number:1,ids:['a','b']}],playlist:{ids:['a','c']},videos:{}};const filtered=applyExclusions(catalog,['a']);assert.deepEqual(filtered.juz[0].ids,['b']);assert.deepEqual(filtered.playlist.ids,['c']);assert.equal(catalog.juz[0].ids.length,2);
assert.equal(recordingHeading({prayer:{chapter:114}}),'Surah An-Nas');assert.equal(recordingHeading({title:'Unknown reciter'}),'');assert.equal(recordingDetail({title:'عشاء يوم الثلاثاء',prayer:{hijriYear:1434}}),'Isha · 1434 AH');
console.log('PASS: real-start history model, timestamps/completion, durable guarded storage, global exclusions in both pools, non-invented title metadata');
