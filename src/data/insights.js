import {metric,categoryOptions,categoryLabel} from './explorer.js';
export function categorySummary(schools,key){
  return categoryOptions(schools).map(category=>{
    const members=schools.filter(s=>s.category===category),valid=members.filter(s=>metric(s,key));
    const active=valid.reduce((n,s)=>n+s[key].active,0),total=valid.reduce((n,s)=>n+s[key].total,0);
    return {category,label:categoryLabel(category),schools:members.length,reporting:valid.length,active,total,rate:total?active/total:null};
  });
}
export function quadrant(school,threshold,xKey='students',yKey='teachers'){
  const x=metric(school,xKey)?.rate,y=metric(school,yKey)?.rate;
  if(x==null||y==null)return null;
  return x>=threshold?(y>=threshold?'both':'students'):(y>=threshold?'teachers':'below');
}
export const QUADRANTS=['both','teachers','students','below'];
export const AI_BANDS=[{id:'0-20',label:'0–<20%',min:0,max:.2},{id:'20-40',label:'20–<40%',min:.2,max:.4},{id:'40-60',label:'40–<60%',min:.4,max:.6},{id:'60-80',label:'60–<80%',min:.6,max:.8},{id:'80-100',label:'80–100%',min:.8,max:1}];
export function aiBand(school){const rate=metric(school,'ai')?.rate;if(rate==null)return null;return AI_BANDS.find(b=>rate>=b.min&&(rate<b.max||(b.max===1&&rate===1)))?.id??null;}
export function attentionSchools(schools,key,limit=3){return schools.filter(s=>metric(s,key)).sort((a,b)=>metric(a,key).rate-metric(b,key).rate||a.name.localeCompare(b.name)||a.code.localeCompare(b.code)).slice(0,limit);}
export function applicationRows(items,{query='',sort='active-desc'}={}){const q=query.trim().toLowerCase();return [...items].filter(i=>i.name.toLowerCase().includes(q)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):((sort==='active-asc'?1:-1)*(a.active-b.active)||a.name.localeCompare(b.name)));}
