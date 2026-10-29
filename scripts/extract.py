"""Read-only XLSX extraction. Usage: bundled-python scripts/extract.py SOURCE.xlsx"""
import sys,json,hashlib,datetime
from pathlib import Path
import openpyxl
source=Path(sys.argv[1]); out=Path(__file__).resolve().parents[1]/'public/data'
w=openpyxl.load_workbook(source,data_only=True)
schools={}; audit={'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'filter':'PPD == PPD PETALING UTAMA (trimmed uppercase exact match)','sheets':{},'issues':[]}
for sheet,key in [('Murid','students'),('Guru','teachers'),('AI Tools (Guru)','ai')]:
 s=w[sheet]; rows=list(s.values); headers=[x for x in rows[0] if x is not None]; selected=[]; seen=set()
 for rowno,row in enumerate(rows[1:],2):
  if str(row[1]).strip().upper()!='PPD PETALING UTAMA': continue
  record=dict(zip(headers,row)); code=str(record['KODSEKOLAH']).strip()
  if code in seen: raise ValueError(f'Duplicate {sheet} {code}')
  seen.add(code); active=record['PENGGUNA AKTIF']; total=record['TOTAL PENGGUNA']
  if not isinstance(active,(int,float)) or not isinstance(total,(int,float)) or not 0<=active<=total: raise ValueError(f'Invalid counts {sheet}:{rowno}')
  rate=active/total if total else None
  if rate is not None and abs(rate-record['PERATUS'])>0.000051:audit['issues'].append(f'Percentage discrepancy {sheet}:{rowno}')
  name=record['NAMASEKOLAH'].strip(); kind='SJKC' if '(CINA)' in name else 'SJKT' if '(TAMIL)' in name else 'SM' if 'MENENGAH' in name else 'SK' if 'KEBANGSAAN' in name else 'Lain-lain'
  sc=schools.setdefault(code,{'code':code,'name':name,'type':kind})
  if sc['name']!=name: raise ValueError(f'Name mismatch {code}')
  sc[key]={'active':int(active),'total':int(total),'rate':rate,'sourceRate':record['PERATUS'],'sheet':sheet,'row':rowno}; selected.append(sc[key])
 audit['sheets'][sheet]={'headers':headers,'populatedRows':sum(any(x is not None for x in r) for r in rows[1:]),'districtRows':len(selected),'active':sum(x['active'] for x in selected),'total':sum(x['total'] for x in selected)}
for sc in schools.values():
 for k in ['students','teachers','ai']:
  if k not in sc:audit['issues'].append(f'Missing {k}: {sc["code"]}');sc[k]=None
summary={}
for k in ['students','teachers','ai']:
 vals=[s[k] for s in schools.values() if s[k] is not None]; a=sum(x['active'] for x in vals); t=sum(x['total'] for x in vals);summary[k]={'active':a,'total':t,'rate':a/t if t else None,'schools':len(vals)}
audit['teacherAiIdenticalCounts']=sum((s['teachers']['active'],s['teachers']['total'])==(s['ai']['active'],s['ai']['total']) for s in schools.values() if s['teachers'] and s['ai'])
apps=[{'name':r[0],'active':int(r[1])} for r in list(w['Aplikasi (Murid dan Guru)'].values)[1:] if r[0] and isinstance(r[1],(float,int))]
audit['sheets']['Aplikasi (Murid dan Guru)']={'headers':['APLIKASI','PENGGUNA AKTIF'],'populatedRows':len(apps),'districtRows':None}
audit['applicationScope']='Unattributed: application sheet has no PPD or school columns; excluded from district metrics.'
audit['method']='Weighted rate = sum(active) / sum(total). Guru and AI Tools counts are equal; user identity overlap is unknown without IDs, so these measures are not summed as verified unique users. Blank is unavailable, zero is observed zero. Period inferred from filename only; no daily series.'
snapshot={'id':'2026-10-01_2026-10-20','period':{'start':'2026-10-01','end':'2026-10-20','label':'1–20 Oktober 2026','basis':'Filename; no date columns in workbook'},'district':'PETALING UTAMA','source':source.name,'summary':summary,'schools':sorted(schools.values(),key=lambda s:s['code']),'limitations':['Satu snapshot sahaja; perubahan masa dan trend belum boleh dikira.','AI Tools (Guru) dan Guru mempunyai kiraan aktif serta jumlah yang sama bagi semua sekolah daerah. Ini bukan ukuran tambahan pengguna unik.','Helaian aplikasi tiada PPD atau kod sekolah; penggunaan aplikasi tidak boleh dikaitkan dengan Petaling Utama.','Kadar aktif dikira daripada TOTAL PENGGUNA dalam fail; definisi pengguna aktif tidak diperincikan oleh sumber.'],'applicationContext':{'scope':'Tidak dikenal pasti — bukan metrik daerah','items':apps},'audit':audit}
out.mkdir(parents=True,exist_ok=True)
(out/'snapshot-2026-10-20.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2))
(out/'manifest.json').write_text(json.dumps({'snapshots':[{'id':snapshot['id'],'label':snapshot['period']['label'],'file':'snapshot-2026-10-20.json'}]},indent=2))
(out/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print(json.dumps({'schools':len(schools),'summary':summary,'audit':audit},ensure_ascii=False,indent=2))
