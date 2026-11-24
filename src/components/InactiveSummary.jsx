import React,{useEffect,useState} from 'react';
import baseline from '../data/inactive-summary.json';
import {loadSnapshot} from '../data/snapshots.js';
import {formatNumber,formatRate} from '../data/explorer.js';

export default function InactiveSummary({school,data,manifest}){
  const [latest,setLatest]=useState(null),[failed,setFailed]=useState(false);
  const entry=manifest.snapshots[0];
  useEffect(()=>{
    const controller=new AbortController();
    setFailed(false);
    if(data.id===entry.id){setLatest(data);return ()=>controller.abort()}
    setLatest(null);
    loadSnapshot(entry,controller.signal).then(setLatest).catch(()=>{if(!controller.signal.aborted)setFailed(true)});
    return ()=>controller.abort();
  },[data,entry]);
  const count=baseline.schools[school.code];
  if(count==null)return null;
  const total=latest?.schools.find(row=>row.code===school.code)?.students?.total;
  const valid=Number.isFinite(total)&&total>0&&count<=total;
  return <section className="inactive-summary">
    <h3>Murid belum login</h3>
    <p className="profile-data-date">Data sehingga 18 November 2026</p>
    <div className="inactive-summary-values"><strong>{formatNumber(count)} <small>murid belum login</small></strong></div>
    <details className="inactive-basis"><summary>Peratus dan jumlah asas</summary>
      <p>{valid?<><b>{formatRate(count/total)}</b> · {formatNumber(count)} daripada {formatNumber(total)} pengguna murid</>:failed?'Jumlah murid belum dapat dimuatkan.':latest?'Jumlah asas perlu disemak.':'Memuatkan jumlah murid…'}</p>
      {latest&&<small>Jumlah asas daripada Set 1 · {latest.period.label}. Peratus menggunakan jumlah asas ini.</small>}
    </details>
    {Number.isFinite(total)&&count>total&&<p role="status">Bilangan belum login melebihi jumlah asas. Peratus memerlukan semakan.</p>}
  </section>;
}
