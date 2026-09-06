type SubjectLabelRow={subjectName:string;displayNameEn?:string|null};
const labels=new Map<string,string>();

export function setRuntimeSubjectLabels(rows:SubjectLabelRow[]){
  labels.clear();
  for(const row of rows){
    const label=row.displayNameEn?.trim();
    if(label)labels.set(row.subjectName,label);
  }
}

export function subjectDisplayName(subjectName:string){
  return labels.get(subjectName)??subjectName;
}
