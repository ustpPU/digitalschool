import React,{useMemo,useState,useId,useRef} from 'react';
import {Search,X} from 'lucide-react';
import {normalizeSearch,schoolIndex,schoolSuggestions,shortName} from '../data/school-search.js';
export default function SchoolSearchPicker({schools,value,excluded=[],onChange,label,hint,disabled=false,placeholder='Taip nama atau kod sekolah…'}){
 const id=useId(),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0);
 const choosing=useRef(false);
 const selected=schools.find(s=>s.code===value),q=normalizeSearch(query);
 const index=useMemo(()=>schoolIndex(schools),[schools]);
 const matches=schoolSuggestions(index,q,excluded);
 const expanded=open&&!!q;
 const choose=s=>{choosing.current=false;setOpen(false);setQuery('');setActive(0);onChange(s.code)};
 return <div className="school-picker" onBlur={event=>{
   if(!choosing.current&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);
 }}><label htmlFor={id}>{label}{hint&&<small>{hint}</small>}</label><div className={`school-picker-field ${disabled?'disabled':''}`}><Search size={17}/><input id={id} role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded?id+'-options':undefined} aria-activedescendant={expanded&&matches[active]?id+'-option-'+active:undefined} autoComplete="off" disabled={disabled} placeholder={placeholder} value={open?query:selected?`${shortName(selected.name)} · ${selected.code}`:''} onFocus={()=>{setOpen(true);setQuery('');setActive(0)}} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(0)}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.preventDefault()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(matches.length-1,i+(e.key==='ArrowDown'?1:-1))))}else if(e.key==='Enter'&&expanded&&matches[active]){e.preventDefault();choose(matches[active])}}}/>{selected&&!disabled&&<button type="button" aria-label={`Kosongkan ${label}`} onPointerDown={e=>e.preventDefault()} onClick={()=>{onChange('');setQuery('');setOpen(false)}}><X size={15}/></button>}</div>{open&&!q&&<small className="school-picker-hint">{selected?'Taip untuk menukar sekolah.':'Cari melalui nama atau kod sekolah.'}</small>}{expanded&&<div className="school-suggestions" id={id+'-options'} role="listbox" aria-label={`Cadangan ${label}`}>{matches.length?matches.map((s,i)=><button type="button" id={id+'-option-'+i} key={s.code} role="option" aria-selected={i===active} className={i===active?'highlighted':''} onPointerDown={()=>{choosing.current=true}} onPointerUp={()=>{choosing.current=false}} onPointerCancel={()=>{choosing.current=false;setOpen(false)}} onMouseEnter={()=>setActive(i)} onClick={()=>choose(s)}><b>{shortName(s.name)}</b><span>{s.code}</span></button>):<p role="status">Tiada sekolah sepadan. Cuba nama atau kod lain.</p>}</div>}</div>;
}
