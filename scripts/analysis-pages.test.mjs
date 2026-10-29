import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {attentionSchools,AI_BANDS,aiBand,applicationRows} from '../src/data/insights.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name,import.meta.url)));
const d=load('snapshot-2026-10-20.json');
test('attention lists are the lowest actual rates for the selected metric',()=>{
 assert.deepEqual(attentionSchools(d.schools,'students').map(s=>s.code),['BBA8206','BEA8669','BEA8666']);
 assert.deepEqual(attentionSchools(d.schools,'teachers').map(s=>s.code),['BEB8653','BEB8657','BEA8615']);
 assert.equal(attentionSchools([{code:'none',name:'Absent',students:null},...d.schools],'students')[0].code,'BBA8206');
});
test('AI bands partition all school-level records and use inclusive final boundary',()=>{
 assert.equal(AI_BANDS.reduce((n,b)=>n+d.schools.filter(s=>aiBand(s)===b.id).length,0),85);
 assert.equal(aiBand({ai:{active:1,total:5}}),'20-40');
 assert.equal(aiBand({ai:{active:0,total:10}}),'0-20');
 assert.equal(aiBand({ai:{active:10,total:10}}),'80-100');
 assert.equal(aiBand({ai:{active:0,total:0}}),null);
 assert.equal(d.summary.ai.active,2287);assert.equal(d.summary.ai.total,4946);
});
test('statewide applications retain all 20 source values and never use a school denominator',()=>{
 const c=load('report-context.json').applications;
 assert.equal(c.scope,'Selangor');assert.match(d.applicationContext.scope,/Selangor/);assert.equal(c.denominatorAvailable,false);assert.equal(c.schoolBreakdownAvailable,false);
 const rows=applicationRows(d.applicationContext.items);
 assert.equal(rows.length,20);assert.deepEqual(rows[0],{name:'Classroom',active:141037});
 assert.deepEqual(applicationRows(rows,{query:'gemini'}),[{name:'Gemini AI',active:11878}]);
 assert.equal(applicationRows(rows,{sort:'active-asc'})[0].name,'Buku Teks Digital Interaktif');
 assert.deepEqual([...rows].sort((a,b)=>a.name.localeCompare(b.name)),applicationRows(rows,{sort:'name'}));
 assert.equal(applicationRows(rows,{query:'no-such-app'}).length,0);
});
test('public component copy has no directory dates or claims that equal counts prove matching people',()=>{
 for(const file of ['src/main.jsx','src/components/DistrictOverview.jsx','src/components/SchoolExplorer.jsx','src/components/SchoolDNA.jsx','src/components/InsightStories.jsx']){
  const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(text,/2020|31 Jan/);
 }
 const text=fs.readFileSync(new URL('../src/components/AIToolsAnalysis.jsx',import.meta.url),'utf8');assert.match(text,/tidak membuktikan/);assert.match(text,/tiada ID pengguna/);
});
