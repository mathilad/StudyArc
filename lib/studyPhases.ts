import { getExamWindow } from "./exams";

export type StudyPhase =
  | "Foundation"
  | "Strengthening"
  | "Paper Practice"
  | "Main Exam Preparation"
  | "Exam Month";

export type PhaseSettings = {
  phase: StudyPhase;
  examName: string;
  examSubjects: string[];
  examTopics: Record<string, string[]>;
  doneSubjects: string[];
  updatedAt: string;
};

export const PHASES: { id: StudyPhase; title: string; subtitle: string }[] = [
  { id: "Foundation", title: "Foundation", subtitle: "Build coverage and steady study habits." },
  { id: "Strengthening", title: "Strengthening", subtitle: "Reinforce covered lessons and weak areas." },
  { id: "Paper Practice", title: "Paper Practice", subtitle: "Increase timed questions, MCQ and essay work." },
  { id: "Main Exam Preparation", title: "Main Exam Preparation", subtitle: "Focus on the subjects and topics coming in your next major exam." },
  { id: "Exam Month", title: "Exam Month", subtitle: "Final exam-month mode. Track subjects as they are completed." },
];

export const DEFAULT_PHASE_SETTINGS: PhaseSettings = {
  phase: "Foundation",
  examName: "Main exam",
  examSubjects: [],
  examTopics: {},
  doneSubjects: [],
  updatedAt: new Date(0).toISOString(),
};

const localDate = (iso: string) => new Date(`${iso}T00:00:00`);

export function suggestedPhase(examYear: number | null | undefined, now = new Date()): StudyPhase {
  if (!examYear) return "Foundation";
  const exam = localDate(getExamWindow(examYear).start);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  if (days <= 30) return "Exam Month";
  if (days <= 75) return "Main Exam Preparation";
  if (days <= 120) return "Paper Practice";
  if (days <= 180) return "Strengthening";
  return "Foundation";
}

export function isExamNearWindow(examYear: number | null | undefined, now = new Date()): boolean {
  if (!examYear) return false;
  const window = getExamWindow(examYear);
  const start = localDate(window.start);
  const end = localDate(window.end);
  const from = new Date(start);
  from.setDate(from.getDate() - 45);
  const until = new Date(end);
  until.setDate(until.getDate() + 7);
  return now.getTime() >= from.getTime() && now.getTime() <= until.getTime();
}

export function phaseRank(phase: StudyPhase) {
  return PHASES.findIndex((x) => x.id === phase);
}
