import {trackerQuestions,yearsForRange,type PastPaperRange} from "./pastPaperTracker";

export const paperSubjects = ["Pure Mathematics", "Applied Mathematics", "Physics", "Chemistry"] as const;
export function subjectAccent(subject: string) {
  return subject === "Pure Mathematics" ? "#C39AFF" : subject === "Applied Mathematics" ? "#70B9FF" : subject === "Physics" ? "#FFC36D" : "#6CD5A0";
}
export function subjectSections(subject: string) {
  return subject.includes("Mathematics") ? ["Part A", "Part B", "Full Paper"] : ["MCQ", "Structured", "Essay", "Full Paper"];
}
export function subjectProgress(subject: string, range: PastPaperRange, isDone: (s:string,y:number,k:string,i:string)=>boolean) {
  let done = 0, total = 0;
  for (const year of yearsForRange(range)) for (const q of trackerQuestions(subject, year, "Full Paper")) {
    total++;
    if (isDone(subject, year, q.kind, q.itemKey)) done++;
  }
  return {done,total,percent:total?Math.round(done/total*100):0};
}
export function timerSection(section: string) {
  return section === "Structured + Essay" ? "Full Essay Paper" : section === "Legacy paper" ? "Full Paper" : section;
}
