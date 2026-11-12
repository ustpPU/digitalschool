import React,{useEffect,useState} from 'react';
import {BookOpen,ChevronDown,Copy,Users} from 'lucide-react';

const endpoint=import.meta.env.VITE_ROSTER_URL;
const requests=new Map();
const labels={students:'Murid tidak aktif',teachers:'Guru belum guna AI Tools'};
const freshness=90_000;

function loadSchool(code) {
  const cached=requests.get(code);
  if(cached&&cached.expires>Date.now())return cached.result;
  const url=new URL(endpoint);
  if(url.protocol!=='https:')throw new Error('Endpoint must use HTTPS');
  url.searchParams.set('school',code);
  const entry={expires:Date.now()+freshness};
  entry.result=fetch(url,{credentials:'omit'}).then(async response=>{
    if(!response.ok)throw new Error('School lists unavailable');
    const data=await response.json();
    if(!Array.isArray(data.lists))throw new Error('Invalid lists');
    return data.lists.filter(list=>Object.hasOwn(labels,list.kind)&&typeof list.label==='string'&&Array.isArray(list.names)&&list.names.every(name=>typeof name==='string'));
  }).catch(error=>{
    if(requests.get(code)===entry)requests.delete(code);
    throw error;
  });
  requests.set(code,entry);
  return entry.result;
}

function RosterList({list}) {
  const [limit,setLimit]=useState(30),[copyStatus,setCopyStatus]=useState('');
  const Icon=list.kind==='students'?BookOpen:Users;
  const copy=async()=>{
    try{
      await navigator.clipboard.writeText(list.names.join('\n'));
      setCopyStatus('Senarai disalin.');
    }catch{setCopyStatus('Gagal menyalin. Cuba sekali lagi.')}
  };
  return <details className="roster-panel" data-kind={list.kind}>
    <summary><span className="roster-icon"><Icon size={18}/></span><span className="roster-title"><b>{labels[list.kind]}</b><small>{list.label}</small></span><span className="roster-count">{list.names.length} nama</span><ChevronDown className="roster-chevron" size={16}/></summary>
    <div className="roster-body">
      <div className="roster-tools"><button type="button" className="outline" disabled={!list.names.length} onClick={copy}><Copy size={15}/> Salin senarai</button><small role="status">{copyStatus}</small></div>
      <ol>{list.names.slice(0,limit).map((name,index)=><li key={index}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{name}</li>)}</ol>
      {list.names.length>limit&&<button className="outline" onClick={()=>setLimit(limit+30)}>Lihat {Math.min(30,list.names.length-limit)} nama lagi</button>}
    </div>
  </details>;
}

export function useSchoolRosters(code) {
  const [lists,setLists]=useState([]);
  const [loading,setLoading]=useState(Boolean(endpoint));
  const [failed,setFailed]=useState(false);
  const [attempt,retry]=useState(0);
  useEffect(()=>{
    if(!endpoint)return;
    let active=true;
    setLoading(true);
    setFailed(false);
    Promise.resolve().then(()=>loadSchool(code)).then(value=>{
      if(active)setLists(value);
    }).catch(()=>{if(active)setFailed(true)}).finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[code,attempt]);
  return {lists,loading,failed,retry:()=>retry(value=>value+1)};
}

export default function SchoolRosters({lists,loading,failed,retry}) {
  if(loading)return <p role="status">Menyemak senarai sekolah…</p>;
  if(failed)return <p role="alert">Senarai gagal dimuatkan. <button className="outline" onClick={retry}>Cuba lagi</button></p>;
  if(!lists.length)return null;
  return <section className="school-rosters" aria-label="Senarai nama sekolah">
    <div className="roster-section-head"><h3>Senarai nama terkini</h3></div>
    {lists.map(list=><RosterList key={list.kind+list.label} list={list}/>)}
  </section>;
}
