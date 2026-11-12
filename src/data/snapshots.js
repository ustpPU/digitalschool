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
  return json(entry.file?import.meta.env.BASE_URL+'data/'+entry.file:summaryUrl(entry.id),signal);
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
