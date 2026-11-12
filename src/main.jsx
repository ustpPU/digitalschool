import {loadSnapshot,mergePublishedSnapshots,monthlySnapshots,bundledReports} from './data/snapshots.js';
import React,{useState,useEffect,useMemo,useCallback,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {BarChart3,ArrowUpRight,ArrowRight,Grid2X2,School,Search,X,ChevronRight,Layers,Info,Menu,GitCompareArrows,ScanLine,CalendarDays,ArrowUp,Sparkles,Layers3} from 'lucide-react';
import './insight.css';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import SchoolSearchPicker from './components/SchoolSearchPicker.jsx';
import DistrictAnalysis from './components/DistrictAnalysis.jsx';
import SchoolExplorer from './components/SchoolExplorer.jsx';
import SchoolDNA from './components/SchoolDNA.jsx';
import SchoolComparison from './components/SchoolComparison.jsx';
import DistrictOverview from './components/DistrictOverview.jsx';
import SchoolMatrix from './components/SchoolMatrix.jsx';
import SchoolQuadrant from './components/SchoolQuadrant.jsx';
import AIToolsAnalysis from './components/AIToolsAnalysis.jsx';
import StateApplications from './components/StateApplications.jsx';
import InsightStories from './components/InsightStories.jsx';
import {adaptSchools,exploreSchools,UNKNOWN_CATEGORY} from './data/explorer.js';
const views=[['overview','Utama',BarChart3],['analysis','Analisis Daerah',Layers],['explorer','Teroka sekolah',School],['matrix','Matriks',Grid2X2],['quadrant','Peta penglibatan',ScanLine],['compare','Banding sekolah',GitCompareArrows],['ai','AI Tools guru',Sparkles],['stories','Cerapan data',Layers],['applications','Aplikasi Selangor',Layers3]];
function App(){
 const [manifest,setManifest]=useState(bundledReports.manifest),[data,setData]=useState(null),[period,setPeriod]=useState(bundledReports.manifest.snapshots[0].id),[err,setErr]=useState(''),[view,setView]=useState(()=>views.some(v=>v[0]===location.hash.slice(1))?location.hash.slice(1):'overview'),[query,setQuery]=useState(''),[type,setType]=useState('all'),[sort,setSort]=useState('students-desc'),[selectedCode,setSelectedCode]=useState(null),[homeCode,setHomeCode]=useState(''),[compare,setCompare]=useState([]),[compareMeasure,setCompareMeasure]=useState('all'),[threshold,setThreshold]=useState(50),[mobile,setMobile]=useState(false),[method,setMethodState]=useState(false);
 const returnFocus=useRef(null), homeProfile=useRef(null);
 const setSelected=useCallback(s=>{if(s)returnFocus.current=document.activeElement;setSelectedCode(s?.code??null)},[]);
 const setMethod=useCallback(value=>{if(value)returnFocus.current=document.activeElement;setMethodState(value)},[]);
 const {registry,reportContext}=bundledReports;
 const schools=useMemo(()=>adaptSchools(data,registry),[data,registry]);
 const months=useMemo(()=>monthlySnapshots(manifest?.snapshots||[]),[manifest]);
 const entry=manifest?.snapshots.find(item=>item.id===period);
 const selected=schools.find(s=>s.code===selectedCode)||null;
 const homeSchool=schools.find(s=>s.code===homeCode);
 const selectHome=code=>{
  setHomeCode(code);
  if(code)requestAnimationFrame(()=>{
   const card=homeProfile.current;
   if(!card)return;
   card.focus({preventScroll:true});
   card.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
 };
 useEffect(()=>{
  const controller=new AbortController(), initial=bundledReports.manifest;
  mergePublishedSnapshots(initial,controller.signal).then(merged=>{
   if(controller.signal.aborted||merged===initial)return;
   setManifest(merged);
   setPeriod(current=>current===initial.snapshots[0].id?merged.snapshots[0].id:current);
  }).catch(()=>{});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{if(!entry)return;const controller=new AbortController();let active=true;setErr('');setData(null);
 loadSnapshot(entry,controller.signal).then(d=>{if(active){if(!['PETALING UTAMA','PPD PETALING UTAMA'].includes(d.district?.trim().toUpperCase()))throw Error('Wrong district');setData(d);setCompare(c=>c.filter(code=>d.schools.some(s=>s.code===code)))}}).catch(e=>{if(active&&e.name!=='AbortError')setErr('Snapshot Petaling Utama tidak dapat dimuatkan.')});return()=>{active=false;controller.abort()}},[entry]);
 useEffect(()=>{const fn=e=>{if(e.key==='Escape'){setSelected(null);setMethod(false);setMobile(false)}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[setSelected,setMethod]);
 useEffect(()=>{if(!selected&&!method)return;const previous=returnFocus.current,old=document.body.style.overflow;document.body.style.overflow='hidden';const dialog=document.querySelector('[role=dialog]');dialog?.querySelector('button')?.focus();const trap=e=>{if(e.key!=='Tab')return;const items=dialog?.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"],summary');const visible=[...(items||[])].filter(e=>e.getClientRects().length&&e.tabIndex!==-1);if(!visible.length)return;const first=visible[0],last=visible[visible.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};document.addEventListener('keydown',trap);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus()}},[selected?.code,method]);
 const filtered=useMemo(()=>['matrix','quadrant'].includes(view)?exploreSchools(schools,{query,category:type,sort}):[],[schools,type,query,sort,view]);
 const toggle=s=>setCompare(c=>c.includes(s.code)?c.filter(x=>x!==s.code):c.length<3?[...c,s.code]:c);
 const go=v=>{history.replaceState(null,'','#'+v);setView(v);setMobile(false);window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
 useEffect(()=>{document.title='PU Insight · '+views.find(v=>v[0]===view)[1]},[view]);
 if(err)return <div className="loading"><Info/>{err}</div>;
 if(!data)return <div className="loading" role="status"><BarChart3/> Memuatkan PU Insight…</div>;
 const explore=(category='all',audience='students',direction='desc')=>{setType(category);setQuery('');setSort(`${audience}-${direction}`);go('explorer')};
 const controls={query,setQuery,category:type,setCategory:setType,sort,setSort};
 return <div className="app"><a className="skip-link" href="#main-content">Langkau ke kandungan</a><div className="app-shell" inert={selected||method?true:undefined}>
 <aside className={mobile?'sidebar open':'sidebar'}><a className="brand" href="#overview" onClick={e=>{e.preventDefault();go('overview')}}><span className="brand-icon"><BarChart3 size={23}/></span><span className="brand-copy"><span className="brand-title">PU <b>Insight</b></span><small>PETALING UTAMA</small></span></a><div className="district-label">RUANG KERJA DAERAH</div><nav aria-label="Navigasi utama">{views.filter(([id])=>['overview','explorer','analysis','applications'].includes(id)).map(([id,label,Icon])=><button key={id} className={view===id?'active':''} aria-current={view===id?'page':undefined} onClick={()=>go(id)}><Icon size={19}/><span>{label}</span>{id==='compare'&&compare.length>0?<span className="nav-count">{compare.length}</span>:view===id?<ChevronRight size={15}/>:null}</button>)}</nav><div className="sidebar-bottom"><div className="district-identity"><span className="district-crest"><img src={import.meta.env.BASE_URL+"brand/ppd-petaling-utama.png"} alt="Jata Negara" width="1280" height="550"/></span><div><b>PPD Petaling Utama</b><small>Unit Sumber dan Teknologi Pendidikan</small></div></div><button className="method-link" onClick={()=>{setMobile(false);setMethod(true)}}><Info size={16}/> Sumber & kaedah <ArrowUpRight size={14}/></button><span className="local-label">{import.meta.env.PROD?'Data penglibatan digital daerah':'Pratonton tempatan'}</span></div></aside>
 {mobile&&<button className="scrim" aria-label="Tutup menu" onClick={()=>setMobile(false)}/>}
 <main id="main-content" tabIndex="-1"><header className="topbar"><div className="breadcrumb"><button className="menu" aria-label="Buka menu" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Menu size={21}/></button><span>{view==='applications'?'Selangor':'Petaling Utama'}</span><ChevronRight size={14}/><b>{views.find(v=>v[0]===view)[1]}</b></div><div className="top-actions"><CalendarDays size={16}/><label className="sr-only" htmlFor="report-period">Bulan laporan</label><select id="report-period" value={period.slice(-10,-3)} onChange={e=>{const report=months.find(item=>item.month===e.target.value);if(report)setPeriod(report.id)}}>{months.map(report=><option key={report.month} value={report.month}>{report.label}</option>)}</select></div></header>
 <div className="content" key={view}>
 {view==='overview'&&<section className="panel home-school-search"><h1>Cari sekolah anda</h1><SchoolSearchPicker schools={schools} value={homeCode} label="Nama atau kod sekolah" onChange={selectHome} inlineResults/></section>}
 {view==='overview'&&homeSchool&&<div className="home-profile-anchor" ref={homeProfile} tabIndex={-1} aria-label="Profil sekolah dipilih"><SchoolDNA inline key={`${data.id}:${homeSchool.code}`} school={homeSchool} data={data} manifest={manifest} registry={registry} compared={compare.includes(homeSchool.code)} compareFull={compare.length>=3} onCompare={()=>toggle(homeSchool)} onShowCompare={()=>go('compare')}/></div>}
 {view==='overview'&&<DistrictOverview data={data} schools={schools} onExplore={explore} onOpen={setSelected} onCompare={()=>go('compare')} onStories={()=>go('stories')} onAI={()=>go('ai')} onMethod={()=>setMethod(true)}/>}
 {['analysis','matrix','quadrant','compare','ai','stories'].includes(view)&&<nav className="analysis-links" aria-label="Analisis Daerah">{[['analysis','Analisis Daerah'],['matrix','Matriks'],['quadrant','Peta penglibatan'],['compare','Banding sekolah'],['ai','AI Tools guru'],['stories','Cerapan data']].map(([id,label])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>go(id)}>{label}</button>)}</nav>}
 {view==='analysis'&&<DistrictAnalysis manifest={manifest} schools={schools}/>}

 {view==='explorer'&&<SchoolExplorer schools={schools} period={data.period} registry={registry} query={query} setQuery={setQuery} category={type} setCategory={setType} sort={sort} setSort={setSort} onOpen={setSelected} onMethod={()=>setMethod(true)}/>}
 {view==='matrix'&&<SchoolMatrix schools={schools} rows={filtered} controls={controls} onOpen={setSelected} compare={compare} onCompare={toggle} onMethod={()=>setMethod(true)}/>}
 {view==='quadrant'&&<SchoolQuadrant schools={schools} rows={filtered} controls={controls} onOpen={setSelected}/>}
 {view==='compare'&&<SchoolComparison measure={compareMeasure} onMeasure={setCompareMeasure} schools={schools} selected={compare} onSelect={setCompare} onOpen={setSelected} onExplore={()=>explore()}/>}
 {view==='ai'&&<AIToolsAnalysis data={data} schools={schools} onOpen={setSelected} onCompare={()=>{setCompareMeasure('ai');go('compare')}}/>}
 {view==='applications'&&<StateApplications data={data} context={reportContext}/>}
 {view==='stories'&&<InsightStories data={data} manifest={manifest} onExplore={()=>explore()} onQuadrant={()=>{setQuery('');setType('all');go('quadrant')}} onMethod={()=>setMethod(true)} onApplications={()=>go('applications')} onAI={()=>go('ai')} onPeriod={id=>{setPeriod(id);go('overview')}}/>}
 <footer><span><b>PU Insight</b> · USTP PPD Petaling Utama</span><a className="admin-footer-link" href="https://script.google.com/a/macros/moe-dl.edu.my/s/AKfycby6BaDQ7uTY8HUi7IicPIsZWcys_WQ5H2DjCVmUS8Z6CYxhRm8vyNuJXECmmt3RWntZ/exec">Ruang Admin</a><button onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>Kembali ke atas <ArrowUp size={14}/></button></footer></div></main>
 {compare.length>0&&view!=='compare'&&<div className="compare-tray"><GitCompareArrows size={18}/><span>{compare.length} sekolah dipilih</span><button onClick={()=>go('compare')}>Bandingkan <ArrowRight size={15}/></button><button aria-label="Kosongkan perbandingan" onClick={()=>setCompare([])}><X size={16}/></button></div>}
 </div>
 {selected&&<SchoolDNA key={`${data.id}:${selected.code}`} school={selected} data={data} manifest={manifest} registry={registry} compared={compare.includes(selected.code)} compareFull={compare.length>=3} onClose={()=>setSelected(null)} onCompare={()=>toggle(selected)} onShowCompare={()=>{setSelected(null);go('compare')}}/>}
 {method&&<div className="modal-backdrop" onClick={()=>setMethod(false)}><section className="methodology" role="dialog" aria-modal="true" aria-labelledby="method-title" onClick={e=>e.stopPropagation()}><div className="method-head"><div><span className="section-kicker">RUJUKAN PU INSIGHT</span><h2 id="method-title">Sumber & kaedah</h2></div><button className="dna-close" aria-label="Tutup metodologi" onClick={()=>setMethod(false)}><X size={19}/></button></div><p className="source-file">{data.source}</p><h3>Skop data</h3><p>PPD dipadankan tepat kepada PPD PETALING UTAMA. Kod sekolah menyatukan helaian Murid, Guru dan AI Tools (Guru). {schools.length} kod unik; tiada pendua atau isu kiraan dikesan dalam snapshot ini. Penggunaan aplikasi dipaparkan berasingan untuk seluruh Selangor, mengikut skop yang disahkan pemilik laporan.</p><h3>Kadar yang berwajaran</h3><div className="formula">Jumlah pengguna aktif ÷ Jumlah pengguna × 100</div><p>Guru dan AI Tools dianalisis berasingan. Jika kiraan sama, fail ringkasan tidak mengesahkan sama ada individu yang sama terlibat.</p><p>Peratus dikira semula daripada kiraan asal. Kadar daerah bukan purata peratus sekolah. AI Tools tidak ditambah kepada Guru. Denominator ialah TOTAL PENGGUNA dalam sumber, bukan pengesahan enrolmen rasmi.</p><h3>Batasan sumber</h3><ul>{data.limitations.filter((_,i)=>i!==1).map(l=><li key={l}>{l}</li>)}</ul><details className="method-category"><summary>Kategori sekolah dan tempoh</summary><p>Tempoh mengikut laporan sumber atau tarikh yang dipilih semasa import. Kategori dipadankan melalui kod sekolah kepada medan jenis sekolah dalam rujukan: {schools.filter(s=>s.category!==UNKNOWN_CATEGORY).length} daripada {schools.length} sekolah mempunyai kategori. SJKT PJS 1 (BBD8471) disahkan sebagai SJKT oleh pemilik sistem. Nama tidak digunakan untuk meneka kategori.</p><a href={registry.source.url} target="_blank" rel="noreferrer">Direktori KPM ↗</a></details></section></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
