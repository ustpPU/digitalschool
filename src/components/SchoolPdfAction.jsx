import React,{useEffect,useRef,useState} from 'react';
import {Download,ExternalLink,Printer} from 'lucide-react';

export default function SchoolPdfAction({school,data,ranks,lists}){
  const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const mounted=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
  useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
  const label=lists?'Senarai Nama':'Rumusan';
  const generate=async()=>{
    setBusy(true);
    setFailed(false);
    try{
      const {createSchoolPdf}=await import('../data/school-pdf.js');
      const blob=await createSchoolPdf({school,data,ranks,lists});
      if(!mounted.current)return;
      const schoolName=school.name.replace(/[\\/:*?"<>|]/g,'').trim();
      const period=data?' - '+data.period.start+'_'+data.period.end:'';
      setResult({url:URL.createObjectURL(blob),filename:'PU Insight - '+label+' - '+school.code+' - '+schoolName+period+'.pdf'});
    }catch{if(mounted.current)setFailed(true)}
    finally{if(mounted.current)setBusy(false)}
  };
  return <div className="school-pdf-action">
    <button className="outline dna-print-button" type="button" disabled={busy} onClick={generate}><Printer size={16}/> {busy?'Menjana PDF…':'Cetak / Simpan PDF '+label}</button>
    {result&&<div className="school-pdf-links" role="group" aria-label={'Pilihan PDF '+label}>
      <a href={result.url} download={result.filename}><Download size={15}/> Simpan PDF</a>
      <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Buka untuk cetak</a>
    </div>}
    {failed&&<small role="alert">PDF gagal dijana. Cuba sekali lagi.</small>}
  </div>;
}
