import {categoryLabel,formatNumber,formatRate,metric} from './explorer.js';

const width=595, height=842, margin=42;
const ink='#182b46', muted='#526278', line='#d9e4f0';
const rosterLabels={students:'Murid belum aktif',teachers:'Guru belum guna AI Tools'};
const measures=[['students','Murid'],['teachers','Guru'],['ai','AI Tools Guru']];

function jpegPdf(images) {
  const encoder=new TextEncoder();
  const parts=[], offsets=[0];
  let length=0;
  const push=value=>{
    const bytes=typeof value==='string'?encoder.encode(value):value;
    parts.push(bytes);
    length+=bytes.length;
  };
  const object=(id,body,stream)=>{
    offsets[id]=length;
    push(id+' 0 obj\n'+body);
    if(stream){push('\nstream\n');push(stream);push('\nendstream')}
    push('\nendobj\n');
  };
  push('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
  images.forEach(({bytes,pixelsWide,pixelsHigh},index)=>{
    const page=3+index*3;
    object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im '+(page+1)+' 0 R >> >> /Contents '+(page+2)+' 0 R >>');
    object(page+1,'<< /Type /XObject /Subtype /Image /Width '+pixelsWide+' /Height '+pixelsHigh+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>',bytes);
    const commands='q\n595 0 0 842 0 0 cm\n/Im Do\nQ';
    object(page+2,'<< /Length '+commands.length+' >>',commands);
  });
  const xref=length;
  push('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))push(String(offset).padStart(10,'0')+' 00000 n \n');
  push('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts,{type:'application/pdf'});
}

function wrap(context,text,maxWidth) {
  const lines=[];
  let current='';
  for(const word of String(text).split(/\s+/)){
    const next=current?current+' '+word:word;
    if(context.measureText(next).width<=maxWidth){current=next;continue}
    if(current)lines.push(current);
    current='';
    for(const char of word){
      if(current&&context.measureText(current+char).width>maxWidth){lines.push(current);current=''}
      current+=char;
    }
  }
  if(current)lines.push(current);
  return lines;
}

function pageFor(school,title,crest) {
  const canvas=document.createElement('canvas');
  canvas.width=width*2;
  canvas.height=height*2;
  const context=canvas.getContext('2d');
  context.scale(2,2);
  context.fillStyle='white';
  context.fillRect(0,0,width,height);
  context.textBaseline='top';
  const text=(value,x,y,size=11,weight=400,color=ink)=>{
    context.font=weight+' '+size+'px Arial, sans-serif';
    context.fillStyle=color;
    context.fillText(value,x,y);
  };
  const rule=(y,color=line)=>{
    context.fillStyle=color;
    context.fillRect(margin,y,width-2*margin,1);
  };
  text('PU Insight',margin,38,25,700);
  text('USTP · PPD Petaling Utama',margin,68,12,700);
  text('Unit Sumber dan Teknologi Pendidikan',margin,85,9,400,muted);
  if(crest)context.drawImage(crest,width-margin-105,42,105,105*crest.naturalHeight/crest.naturalWidth);
  rule(108,'#295fc4');
  text(title,margin,128,10,700,'#295fc4');
  context.font='700 20px Arial, sans-serif';
  let y=149;
  for(const row of wrap(context,school.name,width-2*margin)){text(row,margin,y,20,700);y+=25}
  text(school.code+' · '+categoryLabel(school.category)+' · Petaling Utama',margin,y+5,10,400,muted);
  return {canvas,context,text,rule,y:y+30};
}

function summaryPage(school,data,ranks,crest) {
  const page=pageFor(school,'LAPORAN PENGLIBATAN DIGITAL SEKOLAH',crest);
  const {context,text,rule}=page;
  let y=page.y;
  text('Tempoh laporan · '+data.period.label,margin,y,10,700);
  y+=29;
  for(const [i,[key,label]] of measures.slice(0,2).entries()){
    const x=margin+i*260, rank=ranks[key];
    context.fillStyle=i?'#e9f6f3':'#edf3ff';
    context.fillRect(x,y,251,83);
    text(label+' aktif',x+14,y+11,11,700,muted);
    text(formatRate(metric(school,key)?.rate),x+14,y+28,26,700,i?'#08776a':'#2159b7');
    text('Kedudukan daerah · '+(rank?rank.position+' / '+rank.total+' sekolah':'Tidak tersedia'),x+14,y+59,9,700);
    if(rank?.tied)text('Kedudukan bersama',x+14,y+71,8,400,muted);
  }
  y+=107;
  text('Ringkasan penglibatan',margin,y,14,700);
  y+=28;
  const xs=[margin,166,231,342,443];
  ['Ukuran','Aktif','Jumlah pengguna*','Kadar sekolah','Kadar daerah'].forEach((value,i)=>text(value,xs[i],y,9,700,muted));
  rule(y+17);
  for(const [key,label] of measures){
    y+=32;
    [label,formatNumber(school[key]?.active),formatNumber(school[key]?.total),
      formatRate(metric(school,key)?.rate),formatRate(data.summary[key]?.rate)].forEach((value,i)=>text(value,xs[i],y,10,i===0?700:400));
    rule(y+19);
  }
  return [page];
}

function* rosterPages(school,lists,crest) {
  for(const list of lists){
    const newPage=()=>{
      const page=pageFor(school,'SENARAI NAMA SEKOLAH',crest);
      page.text(rosterLabels[list.kind],margin,page.y,15,700);
      page.text('Tempoh laporan · '+list.label+'  |  '+list.names.length+' nama',margin,page.y+23,10,400,muted);
      page.rule(page.y+43);
      page.y+=55;
      return page;
    };
    let page=newPage();
    for(const [index,name] of list.names.entries()){
      page.context.font='400 11px Arial, sans-serif';
      const rows=wrap(page.context,name,width-2*margin-48);
      let first=true;
      while(rows.length){
        if(page.y>755){yield page;page=newPage()}
        const chunk=rows.splice(0,Math.floor((770-page.y)/15));
        if(first)page.text(String(index+1).padStart(2,'0'),margin+5,page.y,9,700,'#295fc4');
        chunk.forEach((row,i)=>page.text(row,margin+40,page.y+i*15));
        page.y+=chunk.length*15+8;
        page.rule(page.y-4);
        first=false;
      }
    }
    yield page;
  }
}

export async function createSchoolPdf({school,data,ranks,lists}) {
  const logo=new Image();
  logo.src=import.meta.env.BASE_URL+'brand/ppd-petaling-utama.png';
  const crest=await logo.decode().then(()=>logo,()=>null);
  const pages=lists?rosterPages(school,lists,crest):summaryPage(school,data,ranks,crest);
  const images=[];
  for(const page of pages){
    page.rule(788);
    page.text('USTP PPD Petaling Utama · PU Insight',margin,799,9,700);
    page.text('Halaman '+(images.length+1),width-margin-60,799,9,400,muted);
    const blob=await new Promise(resolve=>page.canvas.toBlob(resolve,'image/jpeg',0.88));
    if(!blob)throw new Error('PDF tidak dapat dijana.');
    images.push({bytes:new Uint8Array(await blob.arrayBuffer()),pixelsWide:page.canvas.width,pixelsHigh:page.canvas.height});
    page.canvas.width=1;
  }
  return jpegPdf(images);
}
