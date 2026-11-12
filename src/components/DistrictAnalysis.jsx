import {loadSnapshot} from '../data/snapshots.js';
import React,{useEffect,useState} from 'react';
import {MEASURES,formatRate,metric} from '../data/explorer.js';
import {shortName} from '../data/school-search.js';

export default function DistrictAnalysis({manifest,schools}) {
  const reports=manifest.snapshots;
  const [before,setBefore]=useState(reports[1]?.id||reports[0].id);
  const [after,setAfter]=useState(reports[0].id);
  const [code,setCode]=useState('');
  const [results,setResults]=useState(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    if(reports.length<2)return;
    const controller=new AbortController();
    setResults(null);
    setError(false);
    const get=async id=>{
      const report=reports.find(item=>item.id===id);
      return loadSnapshot(report,controller.signal);
    };
    Promise.all([get(before),get(after)]).then(setResults).catch(()=>{if(!controller.signal.aborted)setError(true)});
    return ()=>controller.abort();
  },[before,after,reports]);
  const values=(snapshot,key)=>metric(code?snapshot.schools.find(school=>school.code===code):snapshot.summary,key);
  return <section className="panel history-compare">
    <h1>Analisis Daerah</h1>
    <h2>Banding tempoh laporan</h2>
    {reports.length<2?<p>{reports[0].label} ialah satu-satunya tempoh laporan semasa.</p>:<>
      <div className="history-filters">
        <label>Tempoh rujukan<select value={before} onChange={event=>setBefore(event.target.value)}>{reports.map(report=><option key={report.id} value={report.id}>{report.label}</option>)}</select></label>
        <label>Tempoh perbandingan<select value={after} onChange={event=>setAfter(event.target.value)}>{reports.map(report=><option key={report.id} value={report.id}>{report.label}</option>)}</select></label>
        <label>Sekolah<select value={code} onChange={event=>setCode(event.target.value)}><option value="">Seluruh daerah</option>{schools.map(school=><option key={school.code} value={school.code}>{shortName(school.name)} · {school.code}</option>)}</select></label>
      </div>
      {error?<p role="alert">Tempoh laporan gagal dimuatkan. Cuba pilih semula tempoh.</p>:!results?<p role="status">Memuatkan perbandingan…</p>:<div className="history-results">{MEASURES.map(({key,label})=>{
        const [a,b]=results.map(snapshot=>values(snapshot,key));
        const delta=a&&b?(b.rate-a.rate)*100:null;
        return <article key={key}><b>{label}</b><strong>{formatRate(a?.rate)} → {formatRate(b?.rate)}</strong><small>{delta===null?'Perubahan tidak tersedia':`${delta>0?'+':''}${delta.toFixed(2)} mata peratus`}</small></article>;
      })}</div>}
    </>}
  </section>;
}
