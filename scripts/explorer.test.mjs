import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adaptSchools,exploreSchools,categoryOptions,metric,schoolHistory,rateDifference} from '../src/data/explorer.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name,import.meta.url)));
const snapshot=read('snapshot-2026-10-20.json'),registry=read('school-metadata.json'),schools=adaptSchools(snapshot,registry);
test('adapter preserves all 85 source identifiers and every source statistic',()=>{
 assert.equal(schools.length,85);assert.deepEqual(schools.map(s=>s.code),snapshot.schools.map(s=>s.code));
 for(const s of schools){const original=snapshot.schools.find(x=>x.code===s.code);for(const k of ['students','teachers','ai'])assert.deepEqual(s[k],original[k])}
 assert.deepEqual(adaptSchools({...snapshot,district:'PETALING PERDANA'},registry),[]);
});
test('categories use the explicit code registry, with registry provenance and owner-confirmed SJKT PJS 1',()=>{
 assert.deepEqual(Object.fromEntries(categoryOptions(schools).map(c=>[c,schools.filter(s=>s.category===c).length])),{SK:42,SJKC:10,SJKT:5,SMK:26,KT6:2});
 assert.equal(schools.find(s=>s.code==='BBD8471').category,'SJKT');
 assert.equal(registry.schools.BBD8471.verification.method,'owner-confirmed');
 assert.equal(schools.find(s=>s.code==='BBD8471').categorySource.title,'Pengesahan pemilik sistem');
 assert.equal(registry.source.asOf,'2020-01-31');
 const s=snapshot.schools[0];assert.equal(adaptSchools({...snapshot,schools:[{...s,name:'UNRELATED NAME',type:'MADE_UP'}]},registry)[0].category,registry.schools[s.code].category);
 const invalid={schools:{[s.code]:{district:'PPD GOMBAK',category:'SK'}}};assert.equal(adaptSchools({...snapshot,schools:[s]},invalid)[0].category,'unverified');
});
test('default rankings reconcile to unrounded source ratios, including all 85 schools',()=>{
 const rows=exploreSchools(schools);assert.equal(rows.length,85);assert.deepEqual(rows.slice(0,3).map(s=>s.code),['BBB8308','BBC8415','BBD8458']);
 for(let i=1;i<rows.length;i++)assert.ok(metric(rows[i-1],'students').rate>=metric(rows[i],'students').rate);
 assert.equal(exploreSchools(schools,{sort:'teachers-desc'})[0].code,'BBC8402');
 assert.deepEqual(exploreSchools([...schools].reverse()).map(s=>s.code),rows.map(s=>s.code));
});
test('name search, code search and category filtering combine instantly without changing rank',()=>{
 const all=exploreSchools(schools),r=exploreSchools(schools,{query:'  bbc8415  '});assert.equal(r.length,1);assert.equal(r[0].position,all.find(s=>s.code==='BBC8415').position);
 assert.equal(exploreSchools(schools,{category:'SJKC'}).length,10);assert.equal(exploreSchools(schools,{category:'SK',query:'BBC8415'}).length,0);
 assert.ok(exploreSchools(schools,{query:'puay chai'}).every(s=>s.name.includes('PUAY CHAI')));
 assert.equal(exploreSchools(schools,{query:'not-a-school'}).length,0);
});
test('name sorting is reversible and deterministic',()=>{
 const asc=exploreSchools(schools,{sort:'name-asc'}),desc=exploreSchools(schools,{sort:'name-desc'});
 assert.deepEqual(desc.map(s=>s.code),asc.map(s=>s.code).reverse());
 assert.equal(asc[0].position,1);assert.equal(asc.at(-1).position,85);
});
test('missing and zero denominators stay unavailable; observed zero stays zero',()=>{
 const row=(code,name,active,total)=>({code,name,category:'SK',students:{active,total}});
 const input=[row('A','Alpha',1,2),row('B','Beta',2,4),row('C','Gamma',0,5),row('D','No data',null,5),row('E','Zero total',0,0)];
 const ranked=exploreSchools(input);assert.deepEqual(ranked.map(s=>s.position),[1,1,3,null,null]);
 assert.equal(metric(input[2],'students').rate,0);assert.equal(metric(input[3],'students'),null);assert.equal(metric(input[4],'students'),null);
 assert.equal(exploreSchools(input,{sort:'students-asc'})[0].code,'C');
});
test('ties use full precision, then names and identifiers, never input order',()=>{
 const s=(code,name,active,total)=>({code,name,category:'SK',students:{active,total}});
 const rows=exploreSchools([s('Z','Same',1,3),s('B','Beta',10001,30000),s('A','Same',2,6)]);
 assert.deepEqual(rows.map(s=>s.code),['B','A','Z']);assert.deepEqual(rows.map(s=>s.position),[1,2,2]);
});
test('comparison differences are percentage points from raw counts',()=>{
 const a=schools.find(s=>s.code==='BBB8308'),b=schools.find(s=>s.code==='BBC8415');
 assert.ok(Math.abs(rateDifference(b,a,'students')-(1504/2397-297/435)*100)<1e-12);
 assert.equal(rateDifference({students:null},a,'students'),null);
});
test('overlapping history remains separate snapshots, missing school is unavailable',()=>{
 const original=JSON.stringify(snapshot);
 const next={...snapshot,id:'next',period:{start:'2026-10-10',end:'2026-10-30',label:'10–30 Oktober 2026'}};
 const history=schoolHistory([next,snapshot],'BBB8308');assert.equal(history.length,2);assert.equal(history[0].school.students.active,297);assert.equal(history[1].school.students.active,297);
 assert.equal(schoolHistory([snapshot],'NOTFOUND')[0].school,undefined);assert.equal(JSON.stringify(snapshot),original);
});
