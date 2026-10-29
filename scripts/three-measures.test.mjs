import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sortMetric,sortSchools,exploreSchools,rateDifference,MEASURES} from '../src/data/explorer.js';
import {quadrant,QUADRANTS,categorySummary} from '../src/data/insights.js';
const d=JSON.parse(fs.readFileSync(new URL('../public/data/snapshot-2026-10-20.json',import.meta.url)));
test('AI sorting and competition ranks use AI counts independently of the other two metrics',()=>{
 const row=(code,ai,teacher,student)=>({code,name:code,category:'SK',ai:{active:ai,total:10},teachers:{active:teacher,total:10},students:{active:student,total:10}});
 const rows=[row('A',1,9,9),row('B',8,2,1),row('C',8,1,5),{code:'D',name:'D',category:'SK',ai:null}];
 assert.equal(sortMetric('ai-desc'),'ai');
 assert.deepEqual(exploreSchools(rows,{sort:'ai-desc'}).map(s=>[s.code,s.position]),[['B',1],['C',1],['A',3],['D',null]]);
 assert.deepEqual(sortSchools(rows,'ai-asc').map(s=>s.code),['A','B','C','D']);
 assert.equal(MEASURES.length,3);
});
test('actual AI school rankings and differences reconcile to source counts',()=>{
 assert.equal(sortSchools(d.schools,'ai-desc')[0].code,'BBC8402');
 assert.equal(sortSchools(d.schools,'ai-asc')[0].code,'BEB8653');
 const a=d.schools.find(s=>s.code==='BEB8653'),b=d.schools.find(s=>s.code==='BBC8402');
 assert.equal(rateDifference(b,a,'ai'),(80/82-29/153)*100);
});
test('all three plotting pairs partition the current school cohort without summing users',()=>{
 for(const [x,y] of [['students','teachers'],['students','ai'],['teachers','ai']])assert.equal(QUADRANTS.reduce((n,k)=>n+d.schools.filter(s=>quadrant(s,.5,x,y)===k).length,0),85);
 assert.equal(d.schools.filter(s=>quadrant(s,.5,'teachers','ai')==='teachers').length,0);
 assert.equal(d.schools.filter(s=>quadrant(s,.5,'teachers','ai')==='students').length,0);
});
