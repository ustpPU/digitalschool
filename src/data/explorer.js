// Presentation adapter. Usage snapshots are immutable; registry categories are
// joined by exact code and district, never guessed from a name or code prefix.
export const DISTRICT = 'PPD PETALING UTAMA';
export const UNKNOWN_CATEGORY = 'unverified';
export const MEASURES=[{key:'students',label:'Murid',color:'#2d63d5'},{key:'teachers',label:'Guru',color:'#087f76'},{key:'ai',label:'AI Tools Guru',color:'#7a56a3'}];
export const sortMetric=sort=>sort.startsWith('ai-')?'ai':sort.startsWith('teachers')?'teachers':'students';
const collator = new Intl.Collator('ms-MY', {numeric:true,sensitivity:'base'});
export const formatNumber = n => Number.isFinite(n) ? new Intl.NumberFormat('en-MY').format(n) : '—';
export const formatRate = n => Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : '—';
export function metric(school, key) {
  const m=school?.[key];
  if (!m || !Number.isFinite(m.active) || !Number.isFinite(m.total) || m.total<=0 || m.active<0 || m.active>m.total) return null;
  return {...m,rate:m.active/m.total};
}
export function adaptSchools(snapshot, registry) {
  if (!snapshot || !['PETALING UTAMA',DISTRICT].includes(snapshot.district?.trim().toUpperCase())) return [];
  return snapshot.schools.map(s=>{
    const entry=registry?.schools?.[s.code];
    const verified=entry?.district===DISTRICT && typeof entry.category==='string' && entry.category.trim();
    return {...s, category:verified?entry.category:UNKNOWN_CATEGORY, categorySource:verified?(entry.source||registry.source):null};
  });
}
const nameOrder=(a,b)=>collator.compare(a.name,b.name)||a.code.localeCompare(b.code);
export function sortSchools(schools, sort='students-desc') {
  return [...schools].sort((a,b)=>{
    if (sort==='name-asc'||sort==='name') return nameOrder(a,b);
    if (sort==='name-desc') return -nameOrder(a,b);
    const key=sortMetric(sort);
    const ar=metric(a,key)?.rate,br=metric(b,key)?.rate;
    if(ar==null&&br==null)return nameOrder(a,b);
    if(ar==null)return 1;
    if(br==null)return -1;
    return (sort.endsWith('-asc')?ar-br:br-ar)||nameOrder(a,b);
  });
}
export function exploreSchools(schools,{query='',category='all',sort='students-desc'}={}) {
  const ordered=sortSchools(schools.filter(s=>category==='all'||s.category===category),sort);
  const isName=sort.startsWith('name'),key=sortMetric(sort);
  let lastRate,rank;
  const ranked=ordered.map((s,i)=>{
    const rate=metric(s,key)?.rate;
    if(isName)rank=i+1;
    else if(rate==null)rank=null;
    else if(i===0||rate!==lastRate)rank=i+1;
    lastRate=rate;
    return {...s,position:rank};
  });
  const q=query.trim().toLocaleLowerCase('ms-MY').replace(/\s+/g,' ');
  return ranked.filter(s=>`${s.name} ${s.code}`.toLocaleLowerCase('ms-MY').replace(/\s+/g,' ').includes(q));
}
export function categoryOptions(schools) {
  const order=['SK','SJKC','SJKT','SMK','KT6'];
  return [...new Set(schools.map(s=>s.category))].sort((a,b)=>{
    if(a===UNKNOWN_CATEGORY)return 1;if(b===UNKNOWN_CATEGORY)return -1;
    return (order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))||a.localeCompare(b);
  });
}
export const categoryLabel=c=>c===UNKNOWN_CATEGORY?'Belum disahkan':c;
export function rateDifference(school,base,key) {
  const a=metric(school,key)?.rate,b=metric(base,key)?.rate;
  return a==null||b==null?null:(a-b)*100;
}
export function schoolHistory(snapshots,code) {
  // Each reporting window stands alone, including overlapping windows.
  return snapshots.filter(s=>s&&['PETALING UTAMA',DISTRICT].includes(s.district?.trim().toUpperCase()))
    .map(s=>({id:s.id,period:s.period,school:s.schools.find(x=>x.code===code)}))
    .sort((a,b)=>a.period.end.localeCompare(b.period.end)||a.period.start.localeCompare(b.period.start));
}

// Whole selected district snapshot; independent of explorer filters and sorting.
export function districtRank(schools, code, key) {
  const school=schools.find(s=>s.code===code),rate=metric(school,key)?.rate;
  if(rate==null)return null;
  const rates=schools.map(s=>metric(s,key)?.rate).filter(r=>r!=null);
  return {position:1+rates.filter(r=>r>rate).length,total:rates.length,tied:rates.filter(r=>r===rate).length>1};
}
