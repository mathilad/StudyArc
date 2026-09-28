import AsyncStorage from "@react-native-async-storage/async-storage";

export const PAST_PAPER_MIN_YEAR = 1950;
export const currentPastPaperYear = () => new Date().getFullYear();

export type PastPaperRange = { from: number; to: number };
const RANGE_KEY = "studyarc.pastPaperPreferredRange.v2";

export const clampPastPaperYear = (value: number) =>
  Math.max(PAST_PAPER_MIN_YEAR, Math.min(currentPastPaperYear(), Math.round(value)));

export const normalizePastPaperRange = (from: number, to: number): PastPaperRange => {
  const a = clampPastPaperYear(from);
  const b = clampPastPaperYear(to);
  return { from: Math.min(a, b), to: Math.max(a, b) };
};

export const defaultPastPaperRange = (): PastPaperRange => ({
  from: 1975,
  to: currentPastPaperYear(),
});

export async function readPastPaperRange(): Promise<PastPaperRange> {
  try {
    const raw = await AsyncStorage.getItem(RANGE_KEY);
    if (!raw) return defaultPastPaperRange();
    const parsed = JSON.parse(raw);
    return normalizePastPaperRange(Number(parsed.from), Number(parsed.to));
  } catch {
    return defaultPastPaperRange();
  }
}

export async function savePastPaperRange(range: PastPaperRange) {
  const normalized = normalizePastPaperRange(range.from, range.to);
  await AsyncStorage.setItem(RANGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function yearsForRange(range: PastPaperRange) {
  const normalized = normalizePastPaperRange(range.from, range.to);
  return Array.from({ length: normalized.to - normalized.from + 1 }, (_, i) => normalized.to - i);
}

export const mcqCountForYear = (year: number) => year <= 2010 ? 60 : 50;

export type TrackerQuestion = { itemKey: string; number: number; kind: "MCQ" | "Structured" | "Essay" | "Part A" | "Part B" | "Legacy" };

const numbered = (from: number, to: number, kind: TrackerQuestion["kind"]): TrackerQuestion[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => ({ itemKey: String(from + i), number: from + i, kind }));

export function trackerQuestions(subject: string, year: number, section: string): TrackerQuestion[] {
  if (section === "MCQ") return numbered(1, mcqCountForYear(year), "MCQ");

  if (subject === "Physics" || subject === "Chemistry") {
    if (section === "Structured + Essay") {
      if (subject === "Physics" && year < 2000) return [...numbered(1, 4, "Structured"), ...numbered(5, 12, "Essay")];
      return [...numbered(1, 4, "Structured"), ...numbered(5, 10, "Essay")];
    }
  }

  if (subject === "Pure Mathematics" || subject === "Applied Mathematics") {
    if (year < 2000) {
      if (section !== "Legacy paper") return [];
      return numbered(1, subject === "Pure Mathematics" ? 10 : 12, "Legacy");
    }
    if (section === "Part A") return numbered(1, 10, "Part A");
    if (section === "Part B") return numbered(11, 17, "Part B");
    return [];
  }
  return [];
}

export function trackerFormatNote(subject: string, year: number) {
  if (subject === "Pure Mathematics" || subject === "Applied Mathematics") {
    if (year < 2000) return subject === "Pure Mathematics"
      ? "Legacy format: 10 questions. This paper was not split into the current Part A / Part B format."
      : "Legacy format: 12 questions. This paper was not split into the current Part A / Part B format.";
    return "Current Combined Mathematics format: Part A has 10 questions and Part B has 7 questions (17 total).";
  }
  if (subject === "Physics" && year < 2000) return "Legacy Physics format: 4 structured questions followed by 8 essay questions (12 Paper II questions).";
  if (subject === "Chemistry" && year < 2000) return "Legacy Chemistry Paper II is tracked as questions 1–10: 4 structured questions followed by 6 essay questions.";
  return "Paper II tracker: questions 1–4 structured, questions 5–10 essay.";
}

export const trackerSectionsForSubject = (subject: string) => {
  if (subject === "Physics" || subject === "Chemistry") return ["MCQ", "Structured + Essay"] as const;
  if (subject === "Pure Mathematics" || subject === "Applied Mathematics") return ["Part A", "Part B", "Legacy paper"] as const;
  return [] as const;
};

export const trackerSubjects = ["Physics", "Chemistry", "Pure Mathematics", "Applied Mathematics"] as const;


export function normalizePastPaperQuestionKey(value: string | number | null | undefined) {
  const match=String(value??"").match(/\d+/);
  return match?String(Number(match[0])):null;
}

export function trackerSectionForRecordedQuestion(subject:string,paperSection:string,questionNo:string|number|null|undefined){
  const q=Number(normalizePastPaperQuestionKey(questionNo));
  if(!Number.isFinite(q)||q<=0)return null;
  if(subject==="Physics"||subject==="Chemistry"){
    if(paperSection==="MCQ"||paperSection==="Full MCQ Paper")return "MCQ";
    if(paperSection==="Structured")return "Structured";
    if(paperSection==="Essay")return "Essay";
    if(paperSection==="Full Essay Paper"||paperSection==="Full Paper")return q<=4?"Structured":"Essay";
  }
  if(subject==="Pure Mathematics"||subject==="Applied Mathematics"){
    if(paperSection==="Part A")return "Part A";
    if(paperSection==="Part B")return "Part B";
    if(paperSection==="Full Paper")return q<=10?"Part A":"Part B";
  }
  return null;
}
