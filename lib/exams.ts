import { getRuntimePhaseSettings } from "./phaseRuntime";

export type ExamWindow = { year: number; start: string; end: string; official: boolean };

// Sri Lanka G.C.E. A/L dates announced by the Department of Examinations.
export const KNOWN_AL_EXAMS: Record<number, ExamWindow> = {
  2026: { year: 2026, start: "2026-08-10", end: "2026-09-05", official: true },
  2027: { year: 2027, start: "2027-08-03", end: "2027-08-28", official: true },
};

const localDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`);

export function getExamWindow(year: number): ExamWindow {
  if (KNOWN_AL_EXAMS[year]) return KNOWN_AL_EXAMS[year];
  // Future years are deliberately marked estimated until official dates are announced.
  return { year, start: `${year}-08-01`, end: `${year}-08-31`, official: false };
}

export function daysUntilExam(year: number, now = new Date()): number {
  const exam = localDate(getExamWindow(year).start);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
}

export function availableExamYears(now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const currentWindow = getExamWindow(currentYear);
  const currentStart = localDate(currentWindow.start);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstYear = today.getTime() >= currentStart.getTime() ? currentYear + 1 : currentYear;
  // Keep the onboarding choice compact: at most three exam years.
  return [firstYear, firstYear + 1, firstYear + 2];
}

export function examDateLabel(year: number): string {
  const window = getExamWindow(year);
  const start = localDate(window.start);
  return start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

// Full Work Mode is now tied to the phase the student explicitly selected.
// Date-based logic only suggests a phase; it never switches the app automatically.
export function isFullWorkMode(_year: number | null | undefined, _now = new Date()): boolean {
  return getRuntimePhaseSettings().phase === "Exam Month";
}
