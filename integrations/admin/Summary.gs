const SUMMARY_MEASURES = {'Murid':'students','Guru':'teachers','AI Tools (Guru)':'ai'};
const SUMMARY_COLUMNS = ['PPD','KODSEKOLAH','NAMASEKOLAH','PENGGUNA AKTIF','TOTAL PENGGUNA'];

function previewSummary(start, end, filename, contents) {
  requireAdmin_();
  return prepareSummary_(start, end, filename, contents).audit;
}

function publishSummary(start, end, filename, contents) {
  requireAdmin_();
  const snapshot = prepareSummary_(start, end, filename, contents);
  const folderId = PropertiesService.getScriptProperties().getProperty('ROSTER_FOLDER_ID');
  if (!folderId) throw new Error('Folder penerbitan belum ditetapkan.');
  const folder = DriveApp.getFolderById(folderId);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const name = 'summary-' + snapshot.id + '.json';
    const payload = JSON.stringify(snapshot);
    const prior = folder.getFilesByName(name);
    if (prior.hasNext()) prior.next().setContent(payload);
    else folder.createFile(Utilities.newBlob(payload,'application/json',name));
  } finally {
    lock.releaseLock();
  }
  return {message:'Ringkasan diterbitkan. Tempoh ini akan muncul dalam dashboard.',counts:snapshot.audit};
}

function prepareSummary_(start, end, filename, contents) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(start) || !valid(end) || end < start) throw new Error('Semak tarikh laporan.');
  if (typeof contents !== 'string' || !contents.length || contents.length > MAX_CSV_CHARS) {
    throw new Error('Fail ringkasan terlalu besar atau kosong.');
  }
  const normalize = value => String(value == null ? '' : value).trim().replace(/\s+/g,' ').toUpperCase();
  const schools = new Map();
  const applications = [];
  const audit = {filter:'PPD PETALING UTAMA',accepted:0,excluded:0,duplicates:0,schools:0};
  const measureKeys = Object.values(SUMMARY_MEASURES);
  function count(value,line) {
    const s = String(value == null ? '' : value).trim();
    if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s))) throw new Error('Semak bilangan pada baris ' + line + '.');
    return Number(s);
  }
  function add(rows,sheet,measure) {
    const header = (rows[0] || []).map(normalize);
    const required = measure ? SUMMARY_COLUMNS : [...SUMMARY_COLUMNS,'UKURAN'];
    if (required.some(key => header.indexOf(key) < 0 || header.indexOf(key) !== header.lastIndexOf(key))) {
      throw new Error('Semak tajuk lajur dalam ' + sheet + '.');
    }
    const indices = required.map(key=>header.indexOf(key));
    for (let i=1;i<rows.length;i++) {
      const row=rows[i];
      if (!row || !row.some(value=>normalize(value))) continue;
      const [ppd,rawCode,rawName,rawActive,rawTotal,rawMeasure] = indices.map(index=>row[index]);
      if (!['PETALING UTAMA','PPD PETALING UTAMA'].includes(normalize(ppd))) {audit.excluded++;continue;}
      const code=normalize(rawCode), name=String(rawName || '').trim();
      const key=measure || String(rawMeasure || '').trim().toLowerCase();
      if (!/^[A-Z]{3}[0-9]{4}$/.test(code) || !name || !measureKeys.includes(key)) throw new Error('Semak sekolah dan ukuran pada baris ' + (i+1) + '.');
      const school=schools.get(code) || {code,name,type:'',students:null,teachers:null,ai:null};
      if (school[key] || normalize(school.name)!==normalize(name)) throw new Error('Rekod bercanggah atau berulang bagi ' + code + '.');
      const active=count(rawActive,i+1),total=count(rawTotal,i+1);
      if (active>total) throw new Error('Bilangan aktif melebihi jumlah pada baris ' + (i+1) + '.');
      const rate=total ? active/total : null;
      const sourceRate=row[header.indexOf('PERATUS')];
      school[key]={active,total,rate,sourceRate:typeof sourceRate==='number'?sourceRate:rate,sheet,row:i+1};
      schools.set(code,school);
      audit.accepted++;
    }
  }
  if (/\.xlsx$/i.test(filename)) {
    const workbook=xlsxSheets_(contents);
    for (const [name,measure] of Object.entries(SUMMARY_MEASURES)) {
      if (!workbook[name]) throw new Error('Helaian ' + name + ' diperlukan.');
      add(workbook[name],name,measure);
    }
    const state=workbook['Aplikasi (Murid dan Guru)'] || [];
    state.slice(1).forEach((row,i)=>{
      if (row && row[0] && row[1]!=null) applications.push({name:String(row[0]),active:count(row[1],i+2)});
    });
  } else if (/\.csv$/i.test(filename)) {
    const csv=contents.replace(/^\uFEFF/,'');
    const delimiter=[',',';','\t'].find(separator=>{
      try {const header=Utilities.parseCsv(csv.split(/\r?\n/,1)[0],separator)[0].map(normalize);return SUMMARY_COLUMNS.every(key=>header.includes(key));}
      catch (_) {return false;}
    });
    if (!delimiter) throw new Error('Semak tajuk lajur CSV.');
    add(Utilities.parseCsv(csv,delimiter),'CSV');
  } else throw new Error('Pilih fail CSV atau XLSX.');
  if (!schools.size) throw new Error('Tiada rekod Petaling Utama dijumpai.');
  const summary={};
  for (const key of measureKeys) {
    const rows=[...schools.values()].map(s=>s[key]).filter(Boolean);
    const active=rows.reduce((sum,row)=>sum+row.active,0),total=rows.reduce((sum,row)=>sum+row.total,0);
    summary[key]={active,total,rate:total?active/total:null,schools:rows.length};
  }
  audit.schools=schools.size;
  const display=value=>value.split('-').reverse().join('/');
  const label=start===end?display(start):display(start)+' – '+display(end);
  return {id:start+'_'+end,period:{start,end,label,basis:'Tempoh dipilih semasa import'},district:'PETALING UTAMA',
    source:'Import ringkasan Set 1',schools:[...schools.values()].sort((a,b)=>a.code.localeCompare(b.code)),summary,
    applicationContext:{scope:'Selangor',items:applications},audit,
    limitations:['Set ini ialah ringkasan mengikut sekolah.','Ukuran guru dan AI dilapor berasingan.','Data aplikasi hanya tersedia jika disertakan dalam laporan.','Kadar aktif berdasarkan jumlah pengguna dalam laporan.']};
}

function xlsxSheets_(contents) {
  const members=Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(contents),'application/zip','report.zip'));
  const files=new Map(members.map(blob=>[blob.getName(),blob]));
  const read=path=>{
    const file=files.get(path);
    if (!file) throw new Error('Struktur XLSX tidak lengkap.');
    return XmlService.parse(file.getDataAsString('UTF-8')).getRootElement();
  };
  const workbook=read('xl/workbook.xml'), ns=workbook.getNamespace();
  const rels=read('xl/_rels/workbook.xml.rels');
  const attr=(element,name)=>element.getAttribute(name)?.getValue();
  const map=new Map(rels.getChildren().filter(x=>attr(x,'TargetMode')!=='External').map(x=>[attr(x,'Id'),attr(x,'Target')]));
  function text(element,ns) {
    if (!element) return '';
    return element.getChild('t',ns)?.getText() ??
      element.getChildren('r',ns).map(run=>run.getChild('t',ns)?.getText() || '').join('');
  }
  const shared=files.has('xl/sharedStrings.xml')?read('xl/sharedStrings.xml').getChildren('si',ns).map(item=>text(item,ns)):[];
  const result={};
  for (const sheet of workbook.getChild('sheets',ns).getChildren('sheet',ns)) {
    const name=attr(sheet,'name');
    if (!Object.prototype.hasOwnProperty.call(SUMMARY_MEASURES,name) && name!=='Aplikasi (Murid dan Guru)') continue;
    const rel=sheet.getAttributes().find(a=>a.getName()==='id')?.getValue();
    const target=map.get(rel);
    if (!target) throw new Error('Helaian XLSX tidak dapat dibaca.');
    const root=read(target.startsWith('/')?target.slice(1):'xl/'+target);
    const sheetNs=root.getNamespace();
    const rows=[];
    for (const line of root.getChild('sheetData',sheetNs).getChildren('row',sheetNs)) {
      const row=[];
      const index=Number(attr(line,'r') || rows.length+1)-1;
      if (index>1048575 || index<0) throw new Error('Nombor baris XLSX tidak sah.');
      for (const cell of line.getChildren('c',sheetNs)) {
        const column=String(attr(cell,'r') || '').match(/^[A-Z]+/)?.[0];
        if (!column) continue;
        const col=[...column].reduce((number,char)=>number*26+char.charCodeAt(0)-64,0)-1;
        const value=cell.getChild('v',sheetNs)?.getText();
        const type=attr(cell,'t');
        row[col]=type==='s'?shared[Number(value)]:type==='inlineStr'?text(cell.getChild('is',sheetNs),sheetNs):
          type==='str'||value==null?value:Number(value);
      }
      rows[index]=row;
    }
    result[name]=rows;
  }
  return result;
}
