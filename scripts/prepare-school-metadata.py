"""Create a minimal, code-keyed sidecar from the official KPM directory.
Usage: python prepare-school-metadata.py DIRECTORY.xlsx
Does not change any usage snapshot or infer categories from names/codes.
"""
import sys,json,hashlib
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parents[1]
path=Path(sys.argv[1])
snapshot=json.loads((root/'public/data/snapshot-2026-10-20.json').read_text())
codes={s['code'] for s in snapshot['schools']}
w=openpyxl.load_workbook(path,read_only=True,data_only=True)
records={}
for rowno,r in enumerate(w.active.values,1):
 if r[5] not in codes or r[2]!='PPD PETALING UTAMA':continue
 if r[5] in records:raise ValueError('Duplicate registry code')
 records[r[5]]={'category':r[4],'district':r[2],'registryName':r[6],'row':rowno}
overrides=json.loads((root/'scripts/category-overrides.json').read_text())
for code,entry in overrides.items():
 if code in codes and entry['district']=='PPD PETALING UTAMA':records[code]=entry
result={'source':{'title':'Senarai Sekolah Rendah dan Menengah KPM — 31 Januari 2020','asOf':'2020-01-31','url':'https://www.moe.gov.my/storage/files/shares/laporan_dan_statistik/senarai_sekolah/SENARAI%20SEKOLAH%20WEB%20KPM%20-JAN2020.xlsx','page':'https://www.moe.gov.my/index.php/sekolah-menengah-kebangsaan-harian','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sheet':w.active.title,'categoryColumn':'JENIS/LABEL','codeColumn':'KODSEKOLAH'},'note':'Kategori dipadankan melalui kod sekolah. BBD8471 disahkan sebagai SJKT oleh pemilik sistem pada 29 Oktober 2026; rekod direktori asal yang lain dikekalkan.','unmatched':sorted(codes-set(records)),'schools':records}
(root/'public/data/school-metadata.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(f'{len(records)} code matches; unmatched: {result["unmatched"]}')
