import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {districtRank,exploreSchools} from '../src/data/explorer.js';
const d=JSON.parse(fs.readFileSync(new URL('../public/data/snapshot-2026-10-20.json',import.meta.url)));
test('profile ranks reconcile to all 85 schools for each measure, independent of filters',()=>{
 for(const key of ['students','teachers']){
  const ranked=exploreSchools(d.schools,{sort:`${key}-desc`});
  for(const s of ranked){const r=districtRank(d.schools,s.code,key);assert.equal(r.position,s.position);assert.equal(r.total,85)}
 }
 assert.equal(districtRank(d.schools,'BBB8308','students').position,1);
 assert.equal(districtRank(d.schools,'BBC8402','teachers').position,1);
});
test('profile ranks share ties, skip positions and exclude unavailable rates without treating them as zero',()=>{
 const schools=[{code:'A',students:{active:1,total:2}},{code:'B',students:{active:2,total:4}},{code:'C',students:{active:0,total:10}},{code:'D',students:{active:0,total:0}}];
 assert.deepEqual(districtRank(schools,'A','students'),{position:1,total:3,tied:true});
 assert.deepEqual(districtRank(schools,'C','students'),{position:3,total:3,tied:false});
 assert.equal(districtRank(schools,'D','students'),null);assert.equal(districtRank(schools,'MISSING','students'),null);
});
