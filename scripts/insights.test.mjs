import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adaptSchools} from '../src/data/explorer.js';
import {categorySummary,quadrant,QUADRANTS} from '../src/data/insights.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../public/data/snapshot-2026-10-20.json',import.meta.url)));
const registry=JSON.parse(fs.readFileSync(new URL('../public/data/school-metadata.json',import.meta.url)));
const schools=adaptSchools(snapshot,registry);
test('interactive category breakdown reconciles exactly to weighted district totals',()=>{
 for(const key of ['students','teachers','ai']){
  const groups=categorySummary(schools,key);
  assert.equal(groups.reduce((n,g)=>n+g.schools,0),85);
  assert.equal(groups.reduce((n,g)=>n+g.active,0),snapshot.summary[key].active);
  assert.equal(groups.reduce((n,g)=>n+g.total,0),snapshot.summary[key].total);
  for(const g of groups)assert.equal(g.rate,g.active/g.total);
 }
});
test('quadrant buttons partition the exact same visible schools with consistent inclusive boundaries',()=>{
 for(const threshold of [.1,.5,.55,.9]){
  const counts=QUADRANTS.map(k=>schools.filter(s=>quadrant(s,threshold)===k).length);
  assert.equal(counts.reduce((a,b)=>a+b,0),85);
 }
 const s={students:{active:5,total:10},teachers:{active:5,total:10}};
 assert.equal(quadrant(s,.5),'both');assert.equal(quadrant(s,.55),'below');
 assert.equal(quadrant({...s,students:null},.5),null);
});
