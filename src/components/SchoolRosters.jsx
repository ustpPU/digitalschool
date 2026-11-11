import React,{useEffect,useState} from 'react';

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
  const [limit,setLimit]=useState(30);
  return <details className="roster-panel">
    <summary><b>{labels[list.kind]}</b> · {list.names.length} nama</summary>
    <p>Tempoh laporan {list.label}</p>
    <ul>{list.names.slice(0,limit).map((name,index)=><li key={index}>{name}</li>)}</ul>
    {list.names.length>limit&&<button className="outline" onClick={()=>setLimit(limit+30)}>Lihat 30 nama lagi</button>}
  </details>;
}

export default function SchoolRosters({code}) {
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
  if(loading)return <p role="status">Menyemak senarai sekolah…</p>;
  if(failed)return <p role="alert">Senarai gagal dimuatkan. <button className="outline" onClick={()=>retry(value=>value+1)}>Cuba lagi</button></p>;
  return lists.map(list=><RosterList key={list.kind} list={list}/>);
}
