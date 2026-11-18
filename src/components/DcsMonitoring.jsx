import React,{useState} from 'react';
import {ArrowRight,GraduationCap,Search} from 'lucide-react';
import {formatNumber as num,formatRate as pct} from '../data/explorer.js';
import {normalizeSearch,shortName} from '../data/school-search.js';
import {dcsRank,dcsTotals} from '../data/dcs.js';

const levels=[['all','Semua sekolah'],['secondary','Menengah'],['primary','Rendah']];
const dateLabel=date=>new Intl.DateTimeFormat('ms-MY',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
const ratio=(done,total)=>num(done)+' / '+num(total);

function Progress({rows,label}){
  const total=dcsTotals(rows);
  return <div className="dcs-progress"><span>{label}</span><strong>{pct(total.rate)}</strong><small>{ratio(total.done,total.total)} murid selesai</small></div>;
}

export function DcsHome({rows,date,onOpen}){
  return <section className="panel dcs-home">
    <div className="dcs-head"><div><span className="section-kicker"><GraduationCap size={17}/> DIGITAL COMPETENCY SCORE</span><h2>Pemantauan DCS</h2><p>Data portal DCS · {dateLabel(date)}</p></div><button className="outline" onClick={onOpen}>Lihat kedudukan sekolah <ArrowRight size={16}/></button></div>
    <div className="dcs-progress-grid"><Progress rows={rows} label="Petaling Utama"/>{levels.slice(1).map(([key,label])=><Progress key={key} rows={rows.filter(row=>row.level===key)} label={label}/>)}</div>
  </section>;
}

function Ranking({title,rows,direction,numbered=true}){
  return <section className={'panel dcs-ranking '+direction}>
    <h2>{title}</h2>
    {rows.length?<ol>{rows.map((row,index)=><li key={row.code}>
      <span className="dcs-rank" aria-hidden="true">{numbered?index+1:null}</span>
      <div><b>{shortName(row.name)}</b><small>{row.code} · {row.level==='primary'?'Rendah':'Menengah'}</small></div>
      <strong>{pct(row.rate)}</strong>
      <div className="dcs-counts"><span>Murid <b>{ratio(row.done,row.total)}</b></span><span>Kelas <b>{ratio(row.classes,row.classTotal)}</b></span><span>Baki murid <b>{num(row.total-row.done)}</b></span></div>
    </li>)}</ol>:<p className="dcs-empty">Tiada rekod yang sepadan.</p>}
  </section>;
}

export default function DcsMonitoring({rows,date}){
  const [level,setLevel]=useState('all'),[query,setQuery]=useState('');
  const cohort=rows.filter(row=>level==='all'||row.level===level);
  const total=dcsTotals(cohort);
  const needle=normalizeSearch(query);
  const ranked=dcsRank(cohort,'highest');
  const fullList=[...ranked,...cohort.filter(row=>row.rate===null)];
  const matches=needle?fullList.filter(row=>normalizeSearch(row.name+' '+shortName(row.name)+' '+row.code).includes(needle)):fullList;
  return <section className="dcs-page">
    <div className="page-heading"><div><span className="section-kicker">DIGITAL COMPETENCY SCORE</span><h1>Pemantauan DCS</h1><p>Data portal DCS · {dateLabel(date)}</p></div></div>
    <div className="dcs-controls"><div className="dcs-filters" role="group" aria-label="Peringkat sekolah">{levels.map(([key,label])=><button type="button" key={key} className="outline" aria-pressed={key===level} onClick={()=>setLevel(key)}>{label}</button>)}</div></div>
    <div className="panel dcs-totals"><Progress rows={cohort} label={levels.find(([key])=>key===level)[1]}/><div className="dcs-progress"><span>Kelas selesai</span><strong>{ratio(total.classes,total.classTotal)}</strong><small>{cohort.length} sekolah dalam data DCS</small></div></div>
    <div className="dcs-ranking-grid"><Ranking title="10 Tertinggi" rows={ranked.slice(0,10)} direction="highest"/><Ranking title="10 Terendah" rows={dcsRank(cohort,'lowest').slice(0,10)} direction="lowest"/></div>
    <p className="dcs-note">Kedudukan ikut peratus murid selesai. Sekolah dengan kadar yang sama disusun ikut kod sekolah. Kolej Tingkatan Enam dikecualikan.</p>
    <section className="panel dcs-lookup"><h2>Senarai penuh sekolah</h2><label className="search"><Search size={18}/><input aria-label="Cari sekolah DCS" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Taip nama atau kod sekolah"/></label><Ranking title={needle?'Hasil carian · '+matches.length:'Sekolah dalam paparan · '+matches.length} rows={matches} direction="lookup" numbered={!needle}/></section>
  </section>;
}
