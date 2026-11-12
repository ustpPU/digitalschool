import manifest from '../../public/data/manifest.json';
import registry from '../../public/data/school-metadata.json';
import reportContext from '../../public/data/report-context.json';

export const bundledReports={manifest,registry,reportContext};
const bundledSnapshots=import.meta.glob('../../public/data/snapshot-*.json',{import:'default'});
const endpoint=import.meta.env.VITE_ROSTER_URL;

async function json(url,signal) {
  const response=await fetch(url,{signal,credentials:'omit'});
  if(!response.ok)throw new Error('Snapshot unavailable');
  const result=await response.json();
  if(result.error)throw new Error(result.error);
  return result;
}

function summaryUrl(id) {
  const url=new URL(endpoint);
  if(url.protocol!=='https:')throw new Error('Invalid summary endpoint');
  url.searchParams.set('summary',id);
  return url;
}

export function loadSnapshot(entry,signal) {
  if(!entry.file)return json(summaryUrl(entry.id),signal);
  const load=bundledSnapshots['../../public/data/'+entry.file];
  if(!load)return Promise.reject(new Error('Snapshot unavailable'));
  return load();
}

export async function mergePublishedSnapshots(manifest,signal) {
  if(!endpoint)return manifest;
  const controller=new AbortController();
  const abort=()=>controller.abort();
  signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,10000);
  const published=await json(summaryUrl('index'),controller.signal).finally(()=>{
    clearTimeout(timer);
    signal.removeEventListener('abort',abort);
  });
  if(!Array.isArray(published.snapshots)||!published.snapshots.length)return manifest;
  const entries=new Map(manifest.snapshots.map(entry=>[entry.id,entry]));
  for(const entry of published.snapshots){
    if(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(entry?.id)&&typeof entry.label==='string')entries.set(entry.id,{id:entry.id,label:entry.label});
  }
  const byEnd=entry=>entry.id.split('_').reverse().join('_');
  return {...manifest,snapshots:[...entries.values()].sort((a,b)=>byEnd(b).localeCompare(byEnd(a)))};
}


const monthFormatter=new Intl.DateTimeFormat('ms-MY',{month:'long',year:'numeric',timeZone:'UTC'});

export function monthlySnapshots(entries) {
  const byEnd=entry=>entry.id.split('_').reverse().join('_');
  const months=new Map();
  for(const entry of [...entries].sort((a,b)=>byEnd(b).localeCompare(byEnd(a)))){
    const month=entry.id.slice(-10,-3);
    if(months.has(month))continue;
    months.set(month,{id:entry.id,month,label:monthFormatter.format(new Date(month+'-01T00:00:00Z'))});
  }
  return [...months.values()];
}
