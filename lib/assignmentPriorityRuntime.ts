let priorities:Record<string,number>={};
export function setRuntimeAssignmentPriorities(next:Record<string,number>){priorities={...next}}
export function assignmentPriorityFor(id:string){return priorities[id]??1000}
export function assignmentPriorityMap(){return priorities}
