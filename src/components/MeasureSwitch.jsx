import React from 'react';
import {MEASURES} from '../data/explorer.js';
export default function MeasureSwitch({value,onChange,includeAll=false,label='Ukuran penglibatan'}){
 return <div className="measure-switch" aria-label={label}>{[...(includeAll?[{key:'all',label:'Semua ukuran'}]:[]),...MEASURES].map(m=><button key={m.key} className={`${m.key} ${value===m.key?'selected':''}`} aria-pressed={value===m.key} onClick={()=>onChange(m.key)}>{m.color&&<i style={{background:m.color}}/>}{m.label}</button>)}</div>;
}
