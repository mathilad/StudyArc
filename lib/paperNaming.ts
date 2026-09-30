type NamedPaper={id:string;subjectName:string;title:string;testDate:string};
export function nextPaperName(records:NamedPaper[],subject:string,excludedId?:string){
 const rows=records.filter(r=>r.subjectName===subject&&r.id!==excludedId);
 const numbered=rows.map(r=>({row:r,match:r.title.trim().match(/^(.*?)\s*(\d+)\s*$/)})).filter(x=>x.match&&x.match[1].trim()&&Number.isSafeInteger(Number(x.match[2])));
 const last=numbered.sort((a,b)=>b.row.testDate.localeCompare(a.row.testDate))[0];
 const prefix=last?.match?.[1].trim()??"Paper";
 const maximum=Math.max(0,...numbered.filter(x=>x.match![1].trim().toLowerCase()===prefix.toLowerCase()).map(x=>Number(x.match![2])));
 return `${prefix} ${maximum+1}`;
}
