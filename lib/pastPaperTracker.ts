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

export const trackerSectionsForSubject = (subject: string) => {
  if (subject === "Physics" || subject === "Chemistry") return ["MCQ", "Structured + Essay"] as const;
  if (subject === "Pure Mathematics" || subject === "Applied Mathematics") return ["Part A", "Part B"] as const;
  return [] as const;
};

export const trackerSubjects = ["Physics", "Chemistry", "Pure Mathematics", "Applied Mathematics"] as const;
