function previewDcs(date,csv) {
  requireAdmin_();
  return prepareDcs_(date,csv).counts;
}

function publishDcs(date,csv) {
  requireAdmin_();
  const {report,counts}=prepareDcs_(date,csv);
  const folderId=PropertiesService.getScriptProperties().getProperty('ROSTER_FOLDER_ID');
  if(!folderId)throw new Error('Folder penerbitan belum ditetapkan.');
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const folder=DriveApp.getFolderById(folderId), files=folder.getFilesByName('dcs-latest.json');
    const current=files.hasNext()?files.next():null;
    if(current&&JSON.parse(current.getBlob().getDataAsString('UTF-8')).date>date){
      throw new Error('Gunakan tarikh yang sama atau lebih baharu daripada laporan live.');
    }
    const payload=JSON.stringify(report);
    if(current)current.setContent(payload);
    else folder.createFile(Utilities.newBlob(payload,'application/json','dcs-latest.json'));
  } finally {lock.releaseLock();}
  return {counts,message:'Data DCS terkini diterbitkan ke PU Insight.'};
}

function prepareDcs_(date,csv) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date){
    throw new Error('Semak tarikh semakan portal.');
  }
  if(typeof csv!=='string'||!csv.trim()||csv.length>MAX_CSV_CHARS)throw new Error('Pilih fail CSV DCS yang sah.');
  const clean=csv.replace(/^\uFEFF/,'');
  const columns=[['kod sekolah','school code'],['students completion'],['completion by class']];
  const normalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const separator=[',','\t',';'].find(value=>{
    const header=Utilities.parseCsv(clean.split(/\r?\n/,1)[0],value)[0].map(normalize);
    return columns.every(names=>header.some(key=>names.includes(key)));
  });
  if(!separator)throw new Error('Lajur diperlukan: Kod sekolah, Students Completion dan Completion by class.');
  const [header,...lines]=Utilities.parseCsv(clean,separator);
  const indices=columns.map(names=>header.findIndex(key=>names.includes(normalize(key))));
  const seen=new Set(), rows=[];
  const counts={accepted:0,excluded:0,duplicates:0,schools:0};
  const excluded=new Set(['BEA8631','BEA8669']);
  const ratio=(value,line)=>{
    const parts=String(value||'').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if(!parts)throw new Error('Semak format selesai/jumlah pada baris '+line+'.');
    const done=Number(parts[1]),total=Number(parts[2]);
    if(!Number.isSafeInteger(done)||!Number.isSafeInteger(total)||done>total)throw new Error('Bilangan tidak sah pada baris '+line+'.');
    return [done,total];
  };
  for(const [index,line] of lines.entries()){
    if(!line.some(value=>String(value).trim()))continue;
    const [rawCode,students,classes]=indices.map(i=>line[i]);
    const code=String(rawCode||'').trim().toUpperCase();
    if(!SCHOOLS.has(code)||excluded.has(code)){counts.excluded++;continue;}
    if(seen.has(code))throw new Error('Kod berulang: '+code+'. Semak sebelum terbitkan.');
    seen.add(code);
    rows.push([code,...ratio(students,index+2),...ratio(classes,index+2)]);
  }
  if(!rows.length)throw new Error('Tiada sekolah Petaling Utama yang sepadan.');
  if(rows.length<SCHOOLS.size-excluded.size)throw new Error('Fail belum lengkap. Padanan '+rows.length+' daripada '+(SCHOOLS.size-excluded.size)+' sekolah rendah dan menengah Petaling Utama.');
  counts.accepted=counts.schools=rows.length;
  return {report:{date,rows},counts};
}
