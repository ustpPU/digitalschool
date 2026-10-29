import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('../public/data/snapshot-2026-10-20.json',import.meta.url)));
test('district join is complete and unique across three source sheets',()=>{
 assert.equal(d.schools.length,85);assert.equal(new Set(d.schools.map(s=>s.code)).size,85);
 for(const s of d.schools)for(const k of ['students','teachers','ai']){assert.ok(s[k]);assert.ok(s[k].row>1);assert.ok(s[k].active>=0&&s[k].active<=s[k].total);assert.equal(s[k].rate,s[k].total?s[k].active/s[k].total:null)}
});
test('district counts reconcile to independently checked XLSX control totals',()=>{
 for(const [k,a,t] of [['students',14769,73494],['teachers',2287,4946],['ai',2287,4946]]){
 assert.equal(d.schools.reduce((v,s)=>v+s[k].active,0),a);assert.equal(d.schools.reduce((v,s)=>v+s[k].total,0),t);
 assert.equal(d.summary[k].active,a);assert.equal(d.summary[k].total,t);assert.equal(d.summary[k].rate,a/t);
 }
 const mean=d.schools.reduce((v,s)=>v+s.students.rate,0)/85;
 assert.notEqual(d.summary.students.rate,mean,'district rate must not be unweighted school average');
});
test('equal AI and Guru counts are preserved without inflating counts',()=>{for(const s of d.schools){assert.equal(s.teachers.active,s.ai.active);assert.equal(s.teachers.total,s.ai.total)}assert.equal(d.audit.teacherAiIdenticalCounts,85)});
test('only a single period is advertised and applications remain separate from district metrics',()=>{const m=JSON.parse(fs.readFileSync(new URL('../public/data/manifest.json',import.meta.url)));assert.equal(m.snapshots.length,1);assert.equal(m.snapshots[0].id,d.id);assert.match(d.applicationContext.scope,/bukan metrik daerah/);assert.equal(d.audit.issues.length,0)});
