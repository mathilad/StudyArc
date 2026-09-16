import type { StudySession } from "../context/StudyContext";
export type ManualPaperResult = { questionNo: string | null; marksAwarded: number | null; marksTotal: number | null };
export function validateManualPaper(date: string, year: string, duration: string, awarded: string, total: string, question: string, lesson: string, isQuestion: boolean) {
  const day = new Date(`${date}T12:00:00`);
  const today = new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(day.getTime()) || day.getFullYear() !== Number(date.slice(0,4)) || day.getMonth()+1 !== Number(date.slice(5,7)) || day.getDate() !== Number(date.slice(8,10)) || date > localPaperDate(today)) return "Enter a valid completion date, today or earlier (YYYY-MM-DD).";
  if (!/^\d{4}$/.test(year) || Number(year)<1900 || Number(year)>today.getFullYear()) return "Enter a valid past-paper year.";
  if (duration.trim() && (!Number.isFinite(Number(duration)) || Number(duration)<=0 || Number(duration)>1440)) return "Time spent must be between 0 and 1440 minutes, or leave it blank.";
  if (isQuestion && (!question.trim() || !lesson || lesson==="General")) return "Choose a lesson and enter the question number.";
  if (awarded.trim() || total.trim()) {
    if (!awarded.trim() || !total.trim() || !Number.isFinite(Number(awarded)) || !Number.isFinite(Number(total)) || Number(total)<=0 || Number(awarded)<0 || Number(awarded)>Number(total)) return "Enter both marks and total marks. Marks must be between zero and the total.";
  }
  return null;
}
export const localPaperDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function matchesManualPaper(session: StudySession, subject: string, year: number, section: string, lesson: string, question: string | null) {
  return session.studyType==="Past Papers" && session.subjectName===subject && session.paperYear===year && session.paperSection===section && session.topicName===lesson && (session.manualPaper?.questionNo??null)===(question?.trim()??null);
}
