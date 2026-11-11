export const shortName=n=>n.replace('SEKOLAH JENIS KEBANGSAAN (CINA)','SJKC').replace('SEKOLAH JENIS KEBANGSAAN (TAMIL)','SJKT').replace('SEKOLAH MENENGAH KEBANGSAAN','SMK').replace('SEKOLAH KEBANGSAAN','SK').split(' ').map(w=>/^(SK|SMK|SJKC|SJKT|KT6|PJ|PJS|RRI|USJ|\(L\)|\(P\))$/.test(w)?w:w.toLowerCase().replace(/(^|[-(])([a-z])/g,(_,a,b)=>a+b.toUpperCase())).join(' ');
export const normalizeSearch=value=>value.trim().toLocaleLowerCase('ms-MY').replace(/\s+/g,' ');

export function schoolIndex(schools) {
  return [...schools].sort((a,b)=>a.name.localeCompare(b.name)||a.code.localeCompare(b.code)).map(school=>({
    school,
    code:normalizeSearch(school.code),
    text:normalizeSearch(`${school.name} ${shortName(school.name)} ${school.code}`),
  }));
}

export function schoolSuggestions(index,query,excluded=[]) {
  const term=normalizeSearch(query);
  if(!term)return [];
  const matches=[];
  for(const entry of index){
    if(excluded.includes(entry.school.code))continue;
    if(entry.code===term)return [entry.school];
    if(matches.length<5&&entry.text.includes(term))matches.push(entry.school);
  }
  return matches;
}
