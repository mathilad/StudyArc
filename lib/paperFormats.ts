export const ALL_PAPER_SECTIONS = [
  "MCQ",
  "Structured",
  "Essay",
  "Full MCQ Paper",
  "Full Essay Paper",
  "Part A",
  "Part B",
  "Paper I",
  "Paper II",
  "Full Paper",
] as const;

export type FlexiblePaperSection = (typeof ALL_PAPER_SECTIONS)[number];

const MATH_SUBJECTS = new Set(["Combined Mathematics", "Pure Mathematics", "Applied Mathematics"]);
const SCIENCE_SUBJECTS = new Set(["Physics", "Chemistry", "Biology", "Agricultural Science"]);
const TECHNOLOGY_SUBJECTS = new Set(["Engineering Technology", "Biosystems Technology", "Science for Technology"]);

export function paperSectionsForSubject(subjectName: string): FlexiblePaperSection[] {
  if (MATH_SUBJECTS.has(subjectName)) return ["Part A", "Part B", "Full Paper"];
  if (SCIENCE_SUBJECTS.has(subjectName)) return ["MCQ", "Structured", "Essay", "Full MCQ Paper", "Full Essay Paper"];
  if (TECHNOLOGY_SUBJECTS.has(subjectName)) return ["Paper I", "Paper II", "Full Paper"];
  return ["Paper I", "Paper II", "Full Paper"];
}

export function paperSectionDescription(subjectName: string, section: FlexiblePaperSection) {
  if (MATH_SUBJECTS.has(subjectName)) {
    if (section === "Part A") return "Combined Mathematics short/structured section for this subject part.";
    if (section === "Part B") return "Combined Mathematics extended problem section for this subject part.";
    return "Complete Part A + Part B practice.";
  }
  if (SCIENCE_SUBJECTS.has(subjectName)) {
    if (section === "MCQ") return "MCQ questions or a selected MCQ set.";
    if (section === "Structured") return "Structured questions from the selected lesson or paper.";
    if (section === "Essay") return "Essay questions from the selected lesson or paper.";
    if (section === "Full MCQ Paper") return "A complete timed MCQ paper.";
    if (section === "Full Essay Paper") return "A complete timed structured/essay paper.";
  }
  if (section === "Full Paper") return "Complete paper practice.";
  return `${section} practice.`;
}

export function isPaperSection(value: unknown): value is FlexiblePaperSection {
  return typeof value === "string" && (ALL_PAPER_SECTIONS as readonly string[]).includes(value);
}
