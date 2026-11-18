import initial from './dcs-initial.json';

const endpoint=import.meta.env.VITE_ROSTER_URL;
export const seasonEnds='2026-12-15';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'});
export const dcsInSeason=()=>today.format(new Date())<=seasonEnds;
export const initialDcs=initial;

export async function loadLatestDcs(signal) {
  if(!endpoint)return initial;
  const url=new URL(endpoint);
  url.searchParams.set('dcs','latest');
  const response=await fetch(url,{signal,credentials:'omit',cache:'no-store'});
  if(!response.ok)return initial;
  const report=await response.json();
  return /^\d{4}-\d{2}-\d{2}$/.test(report.date)&&report.date>=initial.date&&Array.isArray(report.rows)&&report.rows.length?report:initial;
}

export function dcsSchools(report,registry) {
  return report.rows.flatMap(([code,done,total,classes,classTotal])=>{
    const school=registry.schools[code];
    if(!school||!['SK','SJKC','SJKT','SMK'].includes(school.category))return [];
    return [{code,name:school.registryName,level:school.category==='SMK'?'secondary':'primary',
      done,total,classes,classTotal,rate:total?done/total:null}];
  });
}

export function dcsTotals(rows) {
  const totals=rows.reduce((sum,row)=>({
    done:sum.done+row.done,total:sum.total+row.total,
    classes:sum.classes+row.classes,classTotal:sum.classTotal+row.classTotal
  }),{done:0,total:0,classes:0,classTotal:0});
  return {...totals,rate:totals.total?totals.done/totals.total:null};
}

export function dcsRank(rows,direction) {
  const sign=direction==='lowest'?1:-1;
  return rows.filter(row=>row.rate!==null).sort((a,b)=>sign*(a.rate-b.rate)||a.code.localeCompare(b.code));
}
